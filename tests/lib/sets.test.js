import test from "node:test";
import assert from "node:assert/strict";
import {
  parseDuration,
  formatDuration,
  toDraftRows,
  fromDraftRows,
  toDraftBlocks,
  fromDraftBlocks,
  newDraftBlock,
  blockExerciseIds,
  hasLoggedBlocks,
  dropChains,
  blocksOf,
  blankRow,
  rowFields,
  lastBlocksFor,
  matchingBlock,
  formatSet,
  formatSets,
  normalizeBlocks,
  measureOf,
  measureOfSets,
  resolveMeasure,
  switchMeasure,
  distanceUnitOfSets,
  setDistanceUnit,
  timeUnitOfSets,
  setTimeUnit,
  defaultTimeUnit,
} from "../../src/lib/sets.js";

const lb = (weight, reps) => ({ weight, weightUnit: "lb", reps });
const block = (id, exerciseId, sets = [], note) => ({ id, exerciseId, sets, ...(note ? { note } : {}) });

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

test("fromDraftRows turns text into numbers with units, and drops blank or junk rows", () => {
  assert.deepEqual(fromDraftRows([{ weight: "225", reps: "5" }, { weight: "", reps: "" }, { weight: "abc", reps: "x" }]), [lb(225, 5)]);
  assert.deepEqual(fromDraftRows([{ seconds: "1:00" }]), [{ seconds: 60 }]);
  assert.deepEqual(fromDraftRows([{ distance: "3.1", seconds: "28:00" }]), [{ distance: 3.1, distanceUnit: "mi", seconds: 1680 }]);
  assert.deepEqual(fromDraftRows([{ reps: "12.4" }]), [{ reps: 12 }]);
  assert.deepEqual(fromDraftRows(undefined), []);
});

test("toDraftRows -> fromDraftRows round trips", () => {
  const stored = [lb(225, 5), lb(227.5, 3), { seconds: 3725 }, { distance: 5, distanceUnit: "mi" }];
  const draft = toDraftRows(stored);
  assert.deepEqual(draft[1], { weight: "227.5", reps: "3" });
  assert.deepEqual(draft[2], { seconds: "1:02:05" });
  assert.deepEqual(fromDraftRows(draft), stored);
});

/* =================================== blocks =================================== */

test("draft blocks round trip, keeping order, repeats, ids and notes", () => {
  const stored = [block("b1", "squat", [lb(225, 5)]), block("b2", "pullup", [{ reps: 8 }], "strict"), block("b3", "squat", [lb(185, 8)], "back-off")];
  const draft = toDraftBlocks(stored);
  assert.deepEqual(
    draft.map((b) => [b.key, b.exerciseId, b.note]),
    [
      ["b1", "squat", ""],
      ["b2", "pullup", "strict"],
      ["b3", "squat", "back-off"],
    ]
  );
  assert.deepEqual(fromDraftBlocks(draft), stored);
});

test("fromDraftBlocks keeps a block with no sets, drops junk rows, and trims the note to one line", () => {
  const draft = [
    { key: "k1", exerciseId: "e1", rows: [{ reps: "" }], note: "  " },
    { key: "k2", exerciseId: "e2", rows: [{ reps: "5" }, { reps: "x" }], note: " two\nlines " },
  ];
  assert.deepEqual(fromDraftBlocks(draft), [block("k1", "e1"), block("k2", "e2", [{ reps: 5 }], "two lines")]);
  assert.deepEqual(fromDraftBlocks(undefined), []);
});

test("a redo's draft blocks get fresh keys; a new block has one of its own", () => {
  const draft = toDraftBlocks([block("b1", "e1", [{ reps: 5 }])], { fresh: true });
  assert.notEqual(draft[0].key, "b1");
  const added = newDraftBlock("e2");
  assert.deepEqual({ ...added, key: "" }, { key: "", exerciseId: "e2", rows: [], note: "" });
  assert.ok(added.key);
});

test("blockExerciseIds lists each exercise once, in the order first done", () => {
  assert.deepEqual(blockExerciseIds([block("1", "squat"), block("2", "pullup"), block("3", "squat")]), ["squat", "pullup"]);
  assert.deepEqual(blockExerciseIds(undefined), []);
});

test("hasLoggedBlocks is true only when a set or a note would actually be saved", () => {
  assert.equal(hasLoggedBlocks([{ key: "k", exerciseId: "e1", rows: [{ reps: "" }], note: "" }]), false);
  assert.equal(hasLoggedBlocks([{ key: "k", exerciseId: "e1", rows: [{ reps: "5" }], note: "" }]), true);
  assert.equal(hasLoggedBlocks([{ key: "k", exerciseId: "e1", rows: [], note: "skipped" }]), true);
  assert.equal(hasLoggedBlocks([]), false);
});

test("blocksOf is a session's blocks, or none", () => {
  assert.deepEqual(blocksOf({ blocks: [block("1", "e1")] }), [block("1", "e1")]);
  assert.deepEqual(blocksOf({ exerciseIds: ["e1"] }), []);
  assert.deepEqual(blocksOf(undefined), []);
});

test("lastBlocksFor finds the most recent other session that logged the exercise, not after the given date, with all its blocks of it", () => {
  const sessions = [
    { id: "a", date: "2026-09-01", blocks: [block("1", "e1", [lb(200, 5)])] },
    { id: "b", date: "2026-09-10", blocks: [block("1", "e1", [lb(215, 5)])] },
    { id: "c", date: "2026-09-10", createdAt: "2026-09-10T20:00:00.000Z", blocks: [block("1", "e1", [lb(220, 5)]), block("2", "e2"), block("3", "e1", [lb(185, 8)])] },
    { id: "d", date: "2026-09-20", blocks: [block("1", "e2", [{ reps: 10 }]), block("2", "e1")] },
    { id: "future", date: "2026-10-01", blocks: [block("1", "e1", [lb(300, 1)])] },
  ];
  const last = lastBlocksFor(sessions, "e1", { onOrBefore: "2026-09-25" });
  assert.equal(last.date, "2026-09-10");
  assert.deepEqual(last.blocks.map((b) => b.sets), [[lb(220, 5)], [lb(185, 8)]]);
  assert.deepEqual(lastBlocksFor(sessions, "e1", { excludeId: "c", onOrBefore: "2026-09-25" }).blocks[0].sets, [lb(215, 5)]);
  assert.equal(lastBlocksFor(sessions, "e9", {}), null);
});

test("lastBlocksFor counts a block with only a note", () => {
  const sessions = [
    { id: "a", date: "2026-09-01", blocks: [block("1", "e1", [lb(200, 5)], "easy")] },
    { id: "b", date: "2026-09-10", blocks: [block("1", "e1", [], "skipped, shoulder")] },
  ];
  assert.deepEqual(lastBlocksFor(sessions, "e1", {}).blocks, [block("1", "e1", [], "skipped, shoulder")]);
});

test("matchingBlock lines up the same round, else the last one", () => {
  const blocks = ["first", "second"];
  assert.equal(matchingBlock(blocks, 0), "first");
  assert.equal(matchingBlock(blocks, 1), "second");
  assert.equal(matchingBlock(blocks, 4), "second");
  assert.equal(matchingBlock([], 0), null);
});

test("normalizeBlocks keeps valid blocks and sets, and drops anything else", () => {
  const raw = [
    { id: "b1", exerciseId: "e1", sets: [{ weight: 225, reps: 5, junk: "x" }, { weight: -1 }, null, "set"], note: "  go up  " },
    { exerciseId: "e2", sets: "not a list" },
    { id: "b3", sets: [] },
    null,
    { id: "b4", exerciseId: "e3", sets: [{ distance: 2, distanceUnit: "km" }, { seconds: 1200, timeUnit: "min", level: 7 }, { seconds: 5, timeUnit: "hours" }] },
  ];
  const out = normalizeBlocks(raw);
  assert.deepEqual(out[0], block("b1", "e1", [lb(225, 5)], "go up"));
  assert.equal(out[1].exerciseId, "e2");
  assert.ok(out[1].id);
  assert.deepEqual(out[1].sets, []);
  assert.deepEqual(out[2], block("b4", "e3", [{ distance: 2, distanceUnit: "km" }, { seconds: 1200, timeUnit: "min", level: 7 }, { seconds: 5 }]));
  assert.equal(out.length, 3);
  assert.equal(normalizeBlocks(null), undefined);
  assert.equal(normalizeBlocks({ e1: [] }), undefined);
});

/* ============================= measures and rows ============================= */

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

test("resolveMeasure: picked on the block, then its rows, then last time, then the exercise's old measure", () => {
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
  assert.deepEqual(blankRow("weight_distance", { distanceUnit: "m" }), { weight: "", distance: "", distanceUnit: "m" });
  assert.deepEqual(blankRow("distance"), { distance: "", seconds: "", distanceUnit: "mi", timeUnit: "min" });
  assert.deepEqual(blankRow("reps", { distanceUnit: "m" }), { reps: "" });
  const rows = [{ weight: "50", distance: "40", distanceUnit: "m" }, { weight: "50", distance: "40", distanceUnit: "m" }];
  assert.deepEqual(setDistanceUnit(rows, "yd").map((r) => r.distanceUnit), ["yd", "yd"]);
  assert.deepEqual(setDistanceUnit([{ reps: "5" }], "yd"), [{ reps: "5" }]);
  const saved = fromDraftRows(setDistanceUnit(rows, "yd"));
  assert.deepEqual(saved[0], { weight: 50, weightUnit: "lb", distance: 40, distanceUnit: "yd" });
  assert.deepEqual(toDraftRows(saved)[0], { weight: "50", distance: "40", distanceUnit: "yd" });
  assert.equal(distanceUnitOfSets(saved), "yd");
  assert.equal(distanceUnitOfSets([{ reps: 5 }]), null);
});

test("switchMeasure gives rows that gain a distance the given unit, and keeps one they had", () => {
  assert.deepEqual(switchMeasure([{ weight: "50", seconds: "1:00" }], "weight_distance", { distanceUnit: "m" }), [{ weight: "50", distance: "", distanceUnit: "m" }]);
  assert.deepEqual(switchMeasure([{ distance: "2", seconds: "", distanceUnit: "km" }], "weight_distance", { distanceUnit: "m" }), [{ weight: "", distance: "2", distanceUnit: "km" }]);
  assert.deepEqual(switchMeasure([{ reps: "20" }], "reps_time", { timeUnit: "min" }), [{ reps: "20", seconds: "", timeUnit: "min" }]);
  assert.deepEqual(switchMeasure([{ seconds: "20", timeUnit: "min" }], "time_level", { timeUnit: "sec" }), [{ seconds: "20", level: "", timeUnit: "min" }]);
});

/* ================================ time @ level ================================ */

test("time @ level: read back, worded, saved and restored", () => {
  assert.equal(measureOfSets([{ seconds: 1200, level: 7 }]), "time_level");
  assert.equal(measureOfSets([{ seconds: "", level: "" }]), "time_level");
  assert.deepEqual(blankRow("time_level"), { seconds: "", level: "", timeUnit: "min" });
  assert.equal(formatSet({ seconds: 1200, level: 7 }), "20:00 @ level 7");
  assert.equal(formatSet({ level: 7.5 }), "level 7.5");
  assert.equal(formatSets([{ seconds: 600, level: 7 }, { seconds: 600, level: 7 }, { seconds: 600, level: 8 }]), "2 × 10:00 @ level 7, 10:00 @ level 8");
  const saved = fromDraftRows([{ seconds: "20:00", level: "7.5" }]);
  assert.deepEqual(saved, [{ seconds: 1200, level: 7.5 }]);
  assert.deepEqual(toDraftRows(saved)[0], { seconds: "20:00", level: "7.5" });
});

/* ================================= min / sec ================================= */

test("parseDuration reads a plain number as minutes when the unit is min", () => {
  assert.equal(parseDuration("20", "min"), 1200);
  assert.equal(parseDuration("2.5", "min"), 150);
  assert.equal(parseDuration("20:30", "min"), 1230);
  assert.equal(parseDuration("20", "sec"), 20);
  assert.equal(parseDuration("20"), 20);
  assert.equal(parseDuration("0", "min"), null);
  assert.equal(parseDuration("abc", "min"), null);
});

test("cardio defaults to minutes, holds and short efforts to seconds", () => {
  assert.equal(defaultTimeUnit("time_level"), "min");
  assert.equal(defaultTimeUnit("distance"), "min");
  assert.equal(defaultTimeUnit("time"), "sec");
  assert.equal(defaultTimeUnit("weight_time"), "sec");
  assert.equal(defaultTimeUnit("reps_time"), "sec");
});

test("time unit: saved with the set, read back as typed, and remembered", () => {
  const minutes = fromDraftRows([{ seconds: "20", level: "7", timeUnit: "min" }]);
  const seconds = fromDraftRows([{ seconds: "45", timeUnit: "sec" }]);
  assert.deepEqual(minutes, [{ seconds: 1200, timeUnit: "min", level: 7 }]);
  assert.deepEqual(seconds, [{ seconds: 45, timeUnit: "sec" }]);
  assert.deepEqual(toDraftRows(minutes)[0], { seconds: "20", level: "7", timeUnit: "min" });
  assert.deepEqual(toDraftRows(seconds)[0], { seconds: "45", timeUnit: "sec" });
  assert.equal(toDraftRows([{ seconds: 1230, timeUnit: "min" }])[0].seconds, "20:30");
  assert.equal(timeUnitOfSets(minutes), "min");
  assert.equal(timeUnitOfSets([{ seconds: 60 }]), null);
  assert.equal(formatSet(minutes[0]), "20:00 @ level 7");
});

test("switching the time unit keeps what was typed, so a wrong-unit 20 is fixed in one tap", () => {
  const rows = setTimeUnit([{ seconds: "20", level: "7", timeUnit: "sec" }, { reps: "5" }], "min");
  assert.deepEqual(rows, [{ seconds: "20", level: "7", timeUnit: "min" }, { reps: "5" }]);
  assert.deepEqual(fromDraftRows(rows)[0], { seconds: 1200, timeUnit: "min", level: 7 });
});

test("sets saved without a time unit read and save as seconds", () => {
  const draft = toDraftRows([{ seconds: 90 }]);
  assert.deepEqual(draft[0], { seconds: "1:30" });
  assert.deepEqual(fromDraftRows(draft), [{ seconds: 90 }]);
  // A "20" that saved as 0:20 opens as "20", so switching to min fixes it.
  const old = toDraftRows([{ seconds: 20, level: 7 }]);
  assert.deepEqual(old[0], { seconds: "20", level: "7" });
  assert.equal(fromDraftRows(setTimeUnit(old, "min"))[0].seconds, 1200);
});

test("a comma works as the decimal point (iPhone number pad in some regions)", () => {
  assert.equal(parseDuration("20,5", "min"), 1230);
  assert.deepEqual(fromDraftRows([{ weight: "22,5", reps: "5" }]), [{ weight: 22.5, weightUnit: "lb", reps: 5 }]);
  assert.deepEqual(fromDraftRows([{ seconds: "10", level: "7,5", timeUnit: "min" }]), [{ seconds: 600, timeUnit: "min", level: 7.5 }]);
});

/* ================================== dropsets ================================== */

test("a drop is saved, read back, and only on a set with numbers", () => {
  const saved = fromDraftRows([{ weight: "185", reps: "8" }, { weight: "155", reps: "6", drop: true }, { weight: "", reps: "", drop: true }]);
  assert.deepEqual(saved, [lb(185, 8), { ...lb(155, 6), drop: true }]);
  assert.deepEqual(toDraftRows(saved)[1], { weight: "155", reps: "6", drop: true });
});

test("dropChains and formatSets read a dropset as one chain", () => {
  const sets = [lb(185, 8), { ...lb(155, 6), drop: true }, { ...lb(125, 5), drop: true }, lb(185, 8)];
  assert.deepEqual(dropChains(sets).map((c) => c.length), [3, 1]);
  assert.equal(formatSets(sets), "185 lb × 8 → 155 lb × 6 → 125 lb × 5, 185 lb × 8");
  const twice = [lb(100, 10), { ...lb(80, 8), drop: true }, lb(100, 10), { ...lb(80, 8), drop: true }];
  assert.equal(formatSets(twice), "2 × (100 lb × 10 → 80 lb × 8)");
  // A first set marked as a drop has nothing to drop from, so it stands alone.
  assert.equal(formatSets([{ ...lb(50, 5), drop: true }]), "50 lb × 5");
});

test("blocks keep their group through the draft and import", () => {
  const stored = [{ id: "b1", exerciseId: "e1", sets: [], groupId: "G" }];
  assert.equal(toDraftBlocks(stored)[0].groupId, "G");
  assert.deepEqual(fromDraftBlocks(toDraftBlocks(stored)), stored);
  assert.equal(normalizeBlocks([{ id: "b1", exerciseId: "e1", sets: [{ reps: 5, drop: true }], groupId: "G" }])[0].groupId, "G");
  assert.deepEqual(normalizeBlocks([{ id: "b1", exerciseId: "e1", sets: [{ reps: 5, drop: "yes" }] }])[0].sets, [{ reps: 5 }]);
});
