import test from "node:test";
import assert from "node:assert/strict";
import { windowEnding, matchEntry, goalMatches, matchesIn, goalStatus, recentWindows, progressText, goalLabel, frequencyLabel } from "../../src/lib/goals.js";

const exercises = new Map([
  ["bench", { id: "bench", tags: ["strength", "chest"] }],
  ["fly", { id: "fly", tags: ["chest"] }],
  ["jump", { id: "jump", tags: ["plyometrics"] }],
]);

test("windowEnding: the last 7 or 30 days, today included", () => {
  assert.deepEqual(windowEnding({ period: "week" }, "2026-10-01"), { start: "2026-09-25", end: "2026-10-01" });
  assert.deepEqual(windowEnding({ period: "month" }, "2026-10-01"), { start: "2026-09-02", end: "2026-10-01" });
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

test("goalMatches: lifting sessions only, newest first; none without criteria", () => {
  const goal = { tags: ["strength"], tagMatch: "all" };
  const sessions = [
    { id: "a", date: "2026-09-01", tags: ["strength"] },
    { id: "b", date: "2026-09-03", tags: ["strength"] },
    { id: "c", date: "2026-09-04", tags: [] },
  ];
  assert.deepEqual(goalMatches(goal, sessions).map((m) => m.entry.id), ["b", "a"]);
  assert.deepEqual(goalMatches({ tags: [], exerciseIds: [] }, sessions), []);
});

const at = (...dates) => dates.map((date) => ({ entry: { date } }));
const onceAWeek = { target: 1, period: "week" };
const twiceAWeek = { target: 2, period: "week" };

test("matchesIn counts every session, even two on one day", () => {
  assert.equal(matchesIn(at("2026-09-28", "2026-09-28", "2026-09-30", "2026-10-06"), windowEnding(twiceAWeek, "2026-10-01")).length, 3);
});

test("goalStatus: the window rolls — last Friday still counts on Thursday", () => {
  // Thu Oct 1; the session was Fri Sep 25, last calendar week.
  const s = goalStatus(onceAWeek, at("2026-09-25"), "2026-10-01");
  assert.equal(s.count, 1);
  assert.equal(s.due, "2026-10-02"); // it slides out on Friday
  assert.equal(s.status, "risk"); // due tomorrow
  assert.equal(goalStatus(onceAWeek, at("2026-09-24"), "2026-10-01").status, "off"); // slid out today
});

test("goalStatus: on track when met and not due soon", () => {
  const s = goalStatus(twiceAWeek, at("2026-09-27", "2026-09-30"), "2026-10-01");
  assert.equal(s.status, "on");
  assert.equal(s.due, "2026-10-04"); // when the Sep 27 one slides out
});

test("goalStatus: extra sessions push the due date back", () => {
  // Three in the window, target two: the oldest can slide out without missing.
  const s = goalStatus(twiceAWeek, at("2026-09-25", "2026-09-27", "2026-09-30"), "2026-10-01");
  assert.equal(s.due, "2026-10-04");
});

test("goalStatus: off track, with how many more are needed", () => {
  const s = goalStatus(twiceAWeek, at("2026-09-30"), "2026-10-01");
  assert.equal(s.status, "off");
  assert.equal(s.needed, 1);
});

test("goalStatus: a monthly goal turns at risk 4 days before it's due", () => {
  const monthly = { target: 1, period: "month" };
  assert.equal(goalStatus(monthly, at("2026-09-10"), "2026-10-01").status, "on"); // due Oct 10
  assert.equal(goalStatus(monthly, at("2026-09-10"), "2026-10-06").status, "risk");
  assert.equal(goalStatus(monthly, at("2026-09-10"), "2026-10-10").status, "off");
});

test("recentWindows: back-to-back windows ending today, oldest first", () => {
  const rows = recentWindows(twiceAWeek, at("2026-09-20", "2026-09-22", "2026-09-30"), "2026-10-01", 3);
  assert.deepEqual(rows.map((r) => [r.window.start, r.window.end, r.count, r.met]), [
    ["2026-09-11", "2026-09-17", 0, false],
    ["2026-09-18", "2026-09-24", 2, true],
    ["2026-09-25", "2026-10-01", 1, false],
  ]);
});

test("progressText says what's next", () => {
  assert.equal(progressText(onceAWeek, goalStatus(onceAWeek, at("2026-09-25"), "2026-10-01"), "2026-10-01"), "1 in the last 7 days · next by tomorrow");
  assert.equal(progressText(twiceAWeek, goalStatus(twiceAWeek, at("2026-09-30"), "2026-10-01"), "2026-10-01"), "1 of 2 in the last 7 days · 1 more needed");
});

test("goalLabel and frequencyLabel spell out the goal", () => {
  const names = new Map([["bench", "Bench press"]]);
  assert.equal(goalLabel({ tags: ["strength", "chest"], tagMatch: "all" }), "strength + chest");
  assert.equal(goalLabel({ tags: ["push", "pull"], tagMatch: "any", exerciseIds: ["bench"] }, names), "push or pull, or Bench press");
  assert.equal(goalLabel({ name: "Chest day", tags: ["chest"] }), "Chest day");
  assert.equal(frequencyLabel({ target: 2, period: "week" }), "Twice a week");
  assert.equal(frequencyLabel({ target: 3, period: "month" }), "3× a month");
});
