import test from "node:test";
import assert from "node:assert/strict";
import { periodOf, shiftPeriod, matchEntry, goalMatches, daysIn, goalStatus, recentPeriods, goalLabel, frequencyLabel } from "../../src/lib/goals.js";

const exercises = new Map([
  ["bench", { id: "bench", tags: ["strength", "chest"] }],
  ["fly", { id: "fly", tags: ["chest"] }],
  ["jump", { id: "jump", tags: ["plyometrics"] }],
]);

test("periodOf: weeks run Monday to Sunday, months are calendar months", () => {
  // Oct 1 2026 is a Thursday.
  assert.deepEqual(periodOf("2026-10-01", "week"), { start: "2026-09-28", end: "2026-10-04" });
  assert.deepEqual(periodOf("2026-10-04", "week"), { start: "2026-09-28", end: "2026-10-04" });
  assert.deepEqual(periodOf("2026-10-05", "week"), { start: "2026-10-05", end: "2026-10-11" });
  assert.deepEqual(periodOf("2026-02-14", "month"), { start: "2026-02-01", end: "2026-02-28" });
});

test("shiftPeriod steps whole weeks and months, across years", () => {
  assert.deepEqual(shiftPeriod(periodOf("2026-10-01", "week"), "week", -1), { start: "2026-09-21", end: "2026-09-27" });
  assert.deepEqual(shiftPeriod(periodOf("2026-01-15", "month"), "month", -1), { start: "2025-12-01", end: "2025-12-31" });
});

test("matchEntry: all tags across the session's and the exercise's tags", () => {
  const goal = { tags: ["strength", "chest"], tagMatch: "all", exerciseIds: [] };
  const session = { tags: ["strength"], blocks: [{ id: "b1", exerciseId: "fly" }, { id: "b2", exerciseId: "jump" }] };
  assert.deepEqual(matchEntry(goal, session, exercises).map((b) => b.id), ["b1"]);
  assert.equal(matchEntry(goal, { tags: [], blocks: [{ id: "b2", exerciseId: "jump" }] }, exercises), null);
  // Matched by the session's own tags: only exercises with one of the goal's
  // tags are listed.
  assert.deepEqual(matchEntry(goal, { tags: ["strength", "chest"] }, exercises), []);
  assert.deepEqual(matchEntry(goal, { tags: ["strength", "chest"], blocks: [{ id: "b1", exerciseId: "fly" }, { id: "b2", exerciseId: "jump" }] }, exercises).map((b) => b.id), ["b1"]);
});

test("matchEntry: any tag, or a chosen exercise", () => {
  assert.deepEqual(matchEntry({ tags: ["plyometrics", "cardio"], tagMatch: "any" }, { blocks: [{ id: "b", exerciseId: "jump" }] }, exercises).length, 1);
  assert.deepEqual(matchEntry({ tags: [], exerciseIds: ["bench"] }, { blocks: [{ id: "b", exerciseId: "bench" }, { id: "c", exerciseId: "fly" }] }, exercises).map((b) => b.id), ["b"]);
  assert.equal(matchEntry({ tags: [], exerciseIds: ["bench"] }, { tags: ["strength"] }, exercises), null);
});

test("goalMatches: sessions and mat sessions, newest first; none without criteria", () => {
  const goal = { tags: ["bjj"], tagMatch: "all" };
  const sessions = [{ id: "s", date: "2026-09-01", tags: ["bjj"] }];
  const rolls = [{ id: "r", date: "2026-09-03", tags: ["bjj"] }, { id: "x", date: "2026-09-04", tags: [] }];
  assert.deepEqual(goalMatches(goal, { sessions, rolls }).map((m) => `${m.source}:${m.entry.id}`), ["rolls:r", "sessions:s"]);
  assert.deepEqual(goalMatches({ tags: [], exerciseIds: [] }, { sessions, rolls }), []);
});

test("daysIn counts days, not entries", () => {
  const matches = ["2026-09-28", "2026-09-28", "2026-09-30", "2026-10-06"].map((date) => ({ entry: { date } }));
  assert.equal(daysIn(matches, periodOf("2026-10-01", "week")), 2);
});

const at = (...dates) => dates.map((date) => ({ entry: { date } }));
const twiceAWeek = { target: 2, period: "week" };

test("goalStatus: done once the target is met", () => {
  const s = goalStatus(twiceAWeek, at("2026-09-28", "2026-09-29"), "2026-09-30");
  assert.equal(s.status, "done");
  assert.equal(s.count, 2);
});

test("goalStatus: on track early in the week, at risk once behind pace", () => {
  // Monday, nothing yet, met last week.
  const lastWeek = at("2026-09-22", "2026-09-24");
  assert.equal(goalStatus(twiceAWeek, lastWeek, "2026-09-28").status, "on");
  // Thursday, nothing yet: an even spread would have one by now.
  assert.equal(goalStatus(twiceAWeek, lastWeek, "2026-10-01").status, "risk");
  // Thursday with one done is on pace.
  assert.equal(goalStatus(twiceAWeek, [...lastWeek, ...at("2026-09-29")], "2026-10-01").status, "on");
});

test("goalStatus: at risk when it needs every day left, off when it can't be met", () => {
  const lastWeek = at("2026-09-22", "2026-09-24");
  const oneDone = [...lastWeek, ...at("2026-09-29")];
  assert.equal(goalStatus(twiceAWeek, oneDone, "2026-10-04").status, "risk"); // Sunday, one to go
  assert.equal(goalStatus(twiceAWeek, lastWeek, "2026-10-04").status, "off"); // Sunday, two to go
});

test("goalStatus: off track when last period was missed and this one is behind too", () => {
  assert.equal(goalStatus(twiceAWeek, at("2026-09-22"), "2026-10-01").status, "off");
  // Missed last week, but it's early enough to still be on pace.
  assert.equal(goalStatus(twiceAWeek, at("2026-09-22"), "2026-09-28").status, "on");
});

test("goalStatus: once a month stays on track for the first half", () => {
  const monthly = { target: 1, period: "month" };
  const lastMonth = at("2026-08-10");
  assert.equal(goalStatus(monthly, lastMonth, "2026-09-10").status, "on");
  assert.equal(goalStatus(monthly, lastMonth, "2026-09-20").status, "risk");
  assert.equal(goalStatus(monthly, lastMonth, "2026-09-30").status, "risk"); // last day
});

test("recentPeriods: oldest first, ending with the current one", () => {
  const rows = recentPeriods(twiceAWeek, at("2026-09-22", "2026-09-24", "2026-09-29"), "2026-10-01", 3);
  assert.deepEqual(rows.map((r) => [r.period.start, r.count, r.met]), [
    ["2026-09-14", 0, false],
    ["2026-09-21", 2, true],
    ["2026-09-28", 1, false],
  ]);
});

test("goalLabel and frequencyLabel spell out the goal", () => {
  const names = new Map([["bench", "Bench press"]]);
  assert.equal(goalLabel({ tags: ["strength", "chest"], tagMatch: "all" }), "strength + chest");
  assert.equal(goalLabel({ tags: ["push", "pull"], tagMatch: "any", exerciseIds: ["bench"] }, names), "push or pull, or Bench press");
  assert.equal(goalLabel({ name: "Chest day", tags: ["chest"] }), "Chest day");
  assert.equal(frequencyLabel({ target: 2, period: "week" }), "Twice a week");
  assert.equal(frequencyLabel({ target: 3, period: "month" }), "3× a month");
});
