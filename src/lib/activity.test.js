import test from "node:test";
import assert from "node:assert/strict";
import { toISO, matchesTags, groupByDate, monthCells, shiftMonth, redoFields } from "./activity.js";

test("toISO zero-pads and treats month as 0-based", () => {
  assert.equal(toISO(2026, 0, 5), "2026-01-05");
  assert.equal(toISO(2026, 11, 31), "2026-12-31");
});

test("matchesTags: no active tags matches everything", () => {
  assert.equal(matchesTags(["legs"], [], "all"), true);
  assert.equal(matchesTags(undefined, [], "any"), true);
});

test("matchesTags: 'all' needs every tag, 'any' needs one", () => {
  assert.equal(matchesTags(["cardio", "run"], ["cardio", "run"], "all"), true);
  assert.equal(matchesTags(["cardio"], ["cardio", "run"], "all"), false);
  assert.equal(matchesTags(["cardio"], ["cardio", "run"], "any"), true);
  assert.equal(matchesTags(["legs"], ["cardio", "run"], "any"), false);
});

test("matchesTags: an entry with no tags never matches an active filter", () => {
  assert.equal(matchesTags(undefined, ["cardio"], "all"), false);
  assert.equal(matchesTags([], ["cardio"], "any"), false);
});

test("groupByDate buckets by date and skips undated or malformed entries", () => {
  const a = { id: "a", date: "2026-09-01" };
  const b = { id: "b", date: "2026-09-01" };
  const c = { id: "c", date: "2026-09-02" };
  const grouped = groupByDate([a, b, c, { id: "d" }, { id: "e", date: "9/3/2026" }, { id: "f", date: null }]);
  assert.deepEqual([...grouped.keys()], ["2026-09-01", "2026-09-02"]);
  assert.deepEqual(grouped.get("2026-09-01"), [a, b]);
});

test("monthCells pads the lead so day 1 lands on its weekday (Sunday start)", () => {
  // Sep 1 2026 is a Tuesday.
  const cells = monthCells(2026, 8, 0);
  assert.equal(cells.length, 2 + 30);
  assert.deepEqual(cells.slice(0, 2), [null, null]);
  assert.deepEqual(cells[2], { day: 1, iso: "2026-09-01" });
  assert.deepEqual(cells.at(-1), { day: 30, iso: "2026-09-30" });
});

test("monthCells honours a Monday week start", () => {
  const cells = monthCells(2026, 8, 1); // Tuesday is one column in
  assert.equal(cells.filter((c) => c === null).length, 1);
  // A month starting on the week's first day needs no lead padding: Feb 2026 starts on a Sunday.
  assert.equal(monthCells(2026, 1, 0)[0].day, 1);
});

test("monthCells handles leap-year February", () => {
  assert.equal(monthCells(2028, 1, 0).filter(Boolean).length, 29);
  assert.equal(monthCells(2026, 1, 0).filter(Boolean).length, 28);
});

test("redoFields copies title/tags/text and re-dates to today", () => {
  const entry = { id: "s1", date: "2026-08-01", title: "Leg day", tags: ["legs"], text: "Squats" };
  assert.deepEqual(redoFields(entry, "2026-09-21"), { date: "2026-09-21", title: "Leg day", tags: ["legs"], text: "Squats" });
});

test("redoFields doesn't carry over the id, copies tags, and tolerates missing fields", () => {
  const entry = { id: "s1", date: "2026-08-01", tags: ["a"] };
  const out = redoFields(entry, "2026-09-21");
  assert.equal("id" in out, false);
  assert.deepEqual(out, { date: "2026-09-21", title: "", tags: ["a"], text: "" });
  out.tags.push("b");
  assert.deepEqual(entry.tags, ["a"]);
  assert.deepEqual(redoFields({}, "2026-09-21").tags, []);
});

test("shiftMonth rolls the year in both directions", () => {
  assert.deepEqual(shiftMonth({ year: 2026, month: 11 }, 1), { year: 2027, month: 0 });
  assert.deepEqual(shiftMonth({ year: 2026, month: 0 }, -1), { year: 2025, month: 11 });
  assert.deepEqual(shiftMonth({ year: 2026, month: 5 }, 0), { year: 2026, month: 5 });
});
