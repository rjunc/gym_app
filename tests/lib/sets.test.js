import test from "node:test";
import assert from "node:assert/strict";
import {
  parseDuration,
  formatDuration,
  toDraftSets,
  fromDraftSets,
  hasLoggedSets,
  blankRow,
  rowFields,
  lastSetsFor,
  formatSet,
  formatSets,
  normalizeSets,
  measureOf,
  measureOfSets,
  resolveMeasure,
  switchMeasure,
  distanceUnitOfSets,
  setDistanceUnit,
} from "../../src/lib/sets.js";

const lb = (weight, reps) => ({ weight, weightUnit: "lb", reps });

test("parseDuration reads seconds, m:ss and h:mm:ss", () => {
  assert.equal(parseDuration("90"), 90);
  assert.equal(parseDuration("1:30"), 90);
  assert.equal(parseDuration("1:02:05"), 3725);
  assert.equal(parseDuration(" 0:45 "), 45);
});

test("parseDuration rejects blank, zero and junk", () => {
  ["", "   ", "0", "0:00", "abc", "1:xx", "1:2:3:4", "-5"].forEach((s) => assert.equal(parseDuration(s), null, s));
});

test("formatDuration pads minutes/seconds and adds hours only when needed", () => {
  assert.equal(formatDuration(45), "0:45");
  assert.equal(formatDuration(90), "1:30");
  assert.equal(formatDuration(3725), "1:02:05");
});

test("fromDraftSets turns text into numbers with units, and drops blank or junk rows", () => {
  const draft = {
    e1: [{ weight: "225", reps: "5" }, { weight: "", reps: "" }, { weight: "abc", reps: "x" }],
    e2: [{ seconds: "1:00" }],
    e3: [{ distance: "3.1", seconds: "28:00" }],
    e4: [{ reps: "12.4" }],
  };
  assert.deepEqual(fromDraftSets(draft, ["e1", "e2", "e3", "e4"]), {
    e1: [lb(225, 5)],
    e2: [{ seconds: 60 }],
    e3: [{ distance: 3.1, distanceUnit: "mi", seconds: 1680 }],
    e4: [{ reps: 12 }],
  });
});

test("fromDraftSets keeps only exercises still linked, and leaves out ones with no usable rows", () => {
  const draft = { e1: [{ weight: "100", reps: "5" }], removed: [{ reps: "10" }], empty: [{ reps: "" }] };
  assert.deepEqual(fromDraftSets(draft, ["e1", "empty"]), { e1: [lb(100, 5)] });
  assert.deepEqual(fromDraftSets(undefined, ["e1"]), {});
});

test("toDraftSets -> fromDraftSets round trips", () => {
  const stored = { e1: [lb(225, 5), lb(227.5, 3)], e2: [{ seconds: 3725 }], e3: [{ distance: 5, distanceUnit: "mi" }] };
  const draft = toDraftSets(stored);
  assert.deepEqual(draft.e1[1], { weight: "227.5", reps: "3" });
  assert.deepEqual(draft.e2[0], { seconds: "1:02:05" });
  assert.deepEqual(fromDraftSets(draft, ["e1", "e2", "e3"]), stored);
});

test("hasLoggedSets is true only when something would actually be saved", () => {
  assert.equal(hasLoggedSets({ e1: [{ reps: "" }] }, ["e1"]), false);
  assert.equal(hasLoggedSets({ e1: [{ reps: "5" }] }, ["e1"]), true);
  assert.equal(hasLoggedSets({ e1: [{ reps: "5" }] }, []), false);
});

test("blankRow and rowFields follow the measure, and never hide a field that has a value", () => {
  assert.deepEqual(blankRow("weight_reps"), { weight: "", reps: "" });
  assert.deepEqual(blankRow("nonsense"), {});
  assert.deepEqual(rowFields({ seconds: "" }, "time"), ["seconds"]);
  assert.deepEqual(rowFields({ weight: "100", reps: "5", seconds: "" }, "time"), ["weight", "reps", "seconds"]);
  assert.deepEqual(rowFields({ reps: "5" }, null), ["reps"]);
});

test("measureOf is an exercise's old measure, or null", () => {
  assert.equal(measureOf({ measure: "time" }), "time");
  assert.equal(measureOf({}), null);
  assert.equal(measureOf({ measure: "bogus" }), null);
  assert.equal(measureOf(undefined), null);
});

test("measureOfSets reads how sets were logged, from stored numbers or draft strings", () => {
  assert.equal(measureOfSets([lb(225, 5)]), "weight_reps");
  assert.equal(measureOfSets([{ reps: 12 }]), "reps");
  assert.equal(measureOfSets([{ seconds: 60 }]), "time");
  assert.equal(measureOfSets([{ distance: 3.1, seconds: 1680 }]), "distance");
  assert.equal(measureOfSets([{ weight: "", reps: "" }]), "weight_reps");
  assert.equal(measureOfSets([{ weight: "80", distance: "", distanceUnit: "m" }]), "weight_distance");
  assert.equal(measureOfSets([{ distance: "", seconds: "1:00", distanceUnit: "mi" }]), "distance");
  assert.equal(measureOfSets([{}]), null);
  assert.equal(measureOfSets(undefined), null);
});

test("resolveMeasure: picked on the session, then the rows, then last time, then the exercise's old measure", () => {
  const rows = [{ reps: "8" }];
  const lastSets = [lb(25, 6)];
  assert.equal(resolveMeasure({ chosen: "time", rows, lastSets, exercise: { measure: "distance" } }), "time");
  assert.equal(resolveMeasure({ rows, lastSets, exercise: { measure: "distance" } }), "reps");
  assert.equal(resolveMeasure({ rows: [], lastSets, exercise: { measure: "distance" } }), "weight_reps");
  assert.equal(resolveMeasure({ rows: [], exercise: { measure: "distance" } }), "distance");
  assert.equal(resolveMeasure({ rows: [], exercise: {} }), null);
});

test("switchMeasure keeps only the new measure's fields, carrying shared values over", () => {
  assert.deepEqual(switchMeasure([{ weight: "25", reps: "6" }], "reps"), [{ reps: "6" }]);
  assert.deepEqual(switchMeasure([{ reps: "8" }], "weight_reps"), [{ weight: "", reps: "8" }]);
  assert.deepEqual(switchMeasure([], "time"), []);
});

test("lastSetsFor finds the most recent other session that logged the exercise, not after the given date", () => {
  const sessions = [
    { id: "a", date: "2026-09-01", sets: { e1: [lb(200, 5)] } },
    { id: "b", date: "2026-09-10", sets: { e1: [lb(215, 5)] } },
    { id: "c", date: "2026-09-10", createdAt: "2026-09-10T20:00:00.000Z", sets: { e1: [lb(220, 5)] } },
    { id: "d", date: "2026-09-20", sets: { e2: [{ reps: 10 }] } },
    { id: "future", date: "2026-10-01", sets: { e1: [lb(300, 1)] } },
  ];
  assert.deepEqual(lastSetsFor(sessions, "e1", { onOrBefore: "2026-09-25" }), { date: "2026-09-10", sets: [lb(220, 5)] });
  assert.deepEqual(lastSetsFor(sessions, "e1", { excludeId: "c", onOrBefore: "2026-09-25" }).sets, [lb(215, 5)]);
  assert.equal(lastSetsFor(sessions, "e9", {}), null);
});

test("formatSet describes each kind of set", () => {
  assert.equal(formatSet(lb(225, 5)), "225 lb × 5");
  assert.equal(formatSet({ reps: 1 }), "1 rep");
  assert.equal(formatSet({ reps: 12 }), "12 reps");
  assert.equal(formatSet({ seconds: 60 }), "1:00");
  assert.equal(formatSet({ distance: 3.1, distanceUnit: "mi", seconds: 1680 }), "3.1 mi in 28:00");
  assert.equal(formatSet({ weight: 45, weightUnit: "lb" }), "45 lb");
});

test("formatSets groups runs of identical sets", () => {
  assert.equal(formatSets([lb(225, 5), lb(225, 5), lb(225, 5), lb(225, 4)]), "3×5 @ 225 lb, 225 lb × 4");
  assert.equal(formatSets([{ reps: 10 }, { reps: 10 }, { reps: 8 }]), "2×10, 8 reps");
  assert.equal(formatSets([{ seconds: 60 }, { seconds: 60 }]), "2 × 1:00");
  assert.equal(formatSets([]), "");
});

test("normalizeSets keeps valid numeric sets and drops anything else", () => {
  const raw = {
    e1: [{ weight: 225, reps: 5, junk: "x" }, { weight: -1 }, null, "set"],
    e2: "not a list",
    e3: [{ distance: 2, distanceUnit: "km" }],
  };
  assert.deepEqual(normalizeSets(raw), { e1: [lb(225, 5)], e3: [{ distance: 2, distanceUnit: "km" }] });
  assert.equal(normalizeSets(null), undefined);
  assert.equal(normalizeSets([1, 2]), undefined);
});

/* ======================= weight/reps × time, carries, units ======================= */

test("measureOfSets tells the timed and loaded kinds apart", () => {
  assert.equal(measureOfSets([{ weight: 50, weightUnit: "lb", seconds: 60 }]), "weight_time");
  assert.equal(measureOfSets([{ weight: 50, weightUnit: "lb", distance: 40, distanceUnit: "m" }]), "weight_distance");
  assert.equal(measureOfSets([{ reps: 20, seconds: 60 }]), "reps_time");
  assert.equal(measureOfSets([{ weight: "50", seconds: "" }]), "weight_time");
});

test("formatSet words the new kinds", () => {
  assert.equal(formatSet({ weight: 50, weightUnit: "lb", seconds: 60 }), "50 lb for 1:00");
  assert.equal(formatSet({ weight: 50, weightUnit: "lb", distance: 40, distanceUnit: "m" }), "50 lb × 40 m");
  assert.equal(formatSet({ reps: 20, seconds: 60 }), "20 reps in 1:00");
  assert.equal(formatSets([{ weight: 50, weightUnit: "lb", distance: 40, distanceUnit: "m" }, { weight: 50, weightUnit: "lb", distance: 40, distanceUnit: "m" }]), "2 × 50 lb × 40 m");
});

test("distance units: blank rows get one, switching sets every row, and it's saved and read back", () => {
  assert.deepEqual(blankRow("weight_distance", "m"), { weight: "", distance: "", distanceUnit: "m" });
  assert.deepEqual(blankRow("distance"), { distance: "", seconds: "", distanceUnit: "mi" });
  assert.deepEqual(blankRow("reps", "m"), { reps: "" });
  const rows = [{ weight: "50", distance: "40", distanceUnit: "m" }, { weight: "50", distance: "40", distanceUnit: "m" }];
  assert.deepEqual(setDistanceUnit(rows, "yd").map((r) => r.distanceUnit), ["yd", "yd"]);
  assert.deepEqual(setDistanceUnit([{ reps: "5" }], "yd"), [{ reps: "5" }]);
  const saved = fromDraftSets({ e1: setDistanceUnit(rows, "yd") }, ["e1"]);
  assert.deepEqual(saved.e1[0], { weight: 50, weightUnit: "lb", distance: 40, distanceUnit: "yd" });
  assert.deepEqual(toDraftSets(saved).e1[0], { weight: "50", distance: "40", distanceUnit: "yd" });
  assert.equal(distanceUnitOfSets(saved.e1), "yd");
  assert.equal(distanceUnitOfSets([{ reps: 5 }]), null);
});

test("switchMeasure gives rows that gain a distance the given unit, and keeps one they had", () => {
  assert.deepEqual(switchMeasure([{ weight: "50", seconds: "1:00" }], "weight_distance", "m"), [{ weight: "50", distance: "", distanceUnit: "m" }]);
  assert.deepEqual(switchMeasure([{ distance: "2", seconds: "", distanceUnit: "km" }], "weight_distance", "m"), [{ weight: "", distance: "2", distanceUnit: "km" }]);
});

/* ================================ time @ level ================================ */

test("time @ level: read back, worded, saved and restored", () => {
  assert.equal(measureOfSets([{ seconds: 1200, level: 7 }]), "time_level");
  assert.equal(measureOfSets([{ seconds: "", level: "" }]), "time_level");
  assert.deepEqual(blankRow("time_level"), { seconds: "", level: "" });
  assert.equal(formatSet({ seconds: 1200, level: 7 }), "20:00 @ level 7");
  assert.equal(formatSet({ level: 7.5 }), "level 7.5");
  assert.equal(formatSets([{ seconds: 600, level: 7 }, { seconds: 600, level: 7 }, { seconds: 600, level: 8 }]), "2 × 10:00 @ level 7, 10:00 @ level 8");
  const saved = fromDraftSets({ e1: [{ seconds: "20:00", level: "7.5" }] }, ["e1"]);
  assert.deepEqual(saved, { e1: [{ seconds: 1200, level: 7.5 }] });
  assert.deepEqual(toDraftSets(saved).e1[0], { seconds: "20:00", level: "7.5" });
  assert.deepEqual(normalizeSets({ e1: [{ seconds: 1200, level: 7 }] }), { e1: [{ seconds: 1200, level: 7 }] });
});
