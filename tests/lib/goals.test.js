import test from "node:test";
import assert from "node:assert/strict";
import { isActive, windowEnding, matchEntry, goalMatches, matchesIn, goalStatus, recentWindows, progressText, goalLabel, frequencyLabel } from "../../src/lib/goals.js";

const exercises = new Map([
  ["bench", { id: "bench", tags: ["strength", "push"] }],
  ["clap", { id: "clap", tags: ["push", "plyometrics", "bodyweight"] }],
  ["jump", { id: "jump", tags: ["plyometrics", "legs"] }],
  ["row", { id: "row", tags: ["strength", "pull"] }],
]);
const any = (...tags) => ({ kind: "any", scope: "exercise", tags, exerciseIds: [] });
const none = (...tags) => ({ kind: "none", scope: "exercise", tags, exerciseIds: [] });
// The same rules, anywhere in the session.
const onSession = (rule) => ({ ...rule, scope: "session" });
const allOnSession = (rules) => ({ rules: rules.map(onSession) });
const session = (exerciseIds, tags = []) => ({ tags, blocks: exerciseIds.map((exerciseId, i) => ({ id: `b${i}`, exerciseId })) });
const ids = (blocks) => (blocks ? blocks.map((b) => b.exerciseId) : null);

test("windowEnding: the last 7 or 30 days, today included", () => {
  assert.deepEqual(windowEnding({ period: "week" }, "2026-10-01"), { start: "2026-09-25", end: "2026-10-01" });
  assert.deepEqual(windowEnding({ period: "month" }, "2026-10-01"), { start: "2026-09-02", end: "2026-10-01" });
});

test("matchEntry, one exercise: one exercise has to meet every exercise rule", () => {
  const goal = { rules: [any("push", "pull"), any("plyometrics")] };
  assert.deepEqual(ids(matchEntry(goal, session(["clap", "bench"]), exercises)), ["clap"]);
  // Push and plyo on separate exercises don't count…
  assert.equal(matchEntry(goal, session(["bench", "jump"]), exercises), null);
  // …and the session's tags don't fill in.
  assert.equal(matchEntry(goal, session(["jump"], ["push"]), exercises), null);
  assert.equal(matchEntry(goal, { tags: ["push", "plyometrics"] }, exercises), null);
});

test("matchEntry, anywhere in the session: each rule met on its own, by exercises or the session's tags", () => {
  const goal = allOnSession([any("push"), any("plyometrics")]);
  assert.deepEqual(ids(matchEntry(goal, session(["bench", "jump", "row"]), exercises)), ["bench", "jump"]);
  assert.deepEqual(ids(matchEntry(goal, session(["clap"]), exercises)), ["clap"]);
  assert.deepEqual(ids(matchEntry(goal, session(["jump"], ["push"]), exercises)), ["jump"]);
  assert.deepEqual(matchEntry(goal, { tags: ["push", "plyometrics"] }, exercises), []); // by its tags alone
  assert.equal(matchEntry(goal, session(["bench", "row"]), exercises), null);
});

test("matchEntry: mixing one-exercise rules with session rules", () => {
  // A plyometric push exercise, in a session with legs.
  const goal = { rules: [any("push"), any("plyometrics"), onSession(any("legs"))] };
  assert.deepEqual(ids(matchEntry(goal, session(["clap"], ["legs"]), exercises)), ["clap"]);
  assert.deepEqual(ids(matchEntry(goal, session(["clap", "jump"]), exercises)), ["clap", "jump"]); // legs from Box jump
  assert.equal(matchEntry(goal, session(["clap", "row"]), exercises), null); // no legs anywhere
  assert.equal(matchEntry(goal, session(["bench", "jump"], ["legs"]), exercises), null); // no plyo push exercise
});

test("matchEntry: None of excludes from the exercise or from the session", () => {
  assert.deepEqual(ids(matchEntry({ rules: [any("push"), none("bodyweight")] }, session(["bench", "clap"]), exercises)), ["bench"]);
  assert.equal(matchEntry(allOnSession([any("push"), none("bodyweight")]), session(["bench", "clap"]), exercises), null);
  // An exercise rule with a session exclusion: skip deload sessions entirely.
  const notDeload = { rules: [any("strength"), onSession(none("deload"))] };
  assert.equal(matchEntry(notDeload, session(["bench"], ["deload"]), exercises), null);
  assert.deepEqual(ids(matchEntry(notDeload, session(["bench"]), exercises)), ["bench"]);
});

test("matchEntry: a chip can be an exercise, mixed with tags in a rule", () => {
  const goal = { rules: [{ kind: "any", scope: "exercise", tags: ["pull"], exerciseIds: ["jump"] }] };
  assert.deepEqual(ids(matchEntry(goal, session(["jump", "row", "bench"]), exercises)), ["jump", "row"]);
  // Excluding an exercise from a session.
  const notJump = allOnSession([any("strength"), { kind: "none", tags: [], exerciseIds: ["jump"] }]);
  assert.equal(matchEntry(notJump, session(["bench", "jump"]), exercises), null);
  assert.deepEqual(ids(matchEntry(notJump, session(["bench"]), exercises)), ["bench"]);
});

test("goalMatches: sessions newest first; none without an Any of rule", () => {
  const goal = allOnSession([any("strength")]);
  const sessions = [
    { id: "a", date: "2026-09-01", tags: ["strength"] },
    { id: "b", date: "2026-09-03", tags: ["strength"] },
    { id: "c", date: "2026-09-04", tags: [] },
  ];
  assert.deepEqual(goalMatches(goal, sessions).map((m) => m.entry.id), ["b", "a"]);
  assert.deepEqual(goalMatches(allOnSession([none("legs"), any()]), sessions), []);
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
  const names = new Map([["jump", "Box jump"]]);
  assert.equal(goalLabel({ rules: [any("strength"), any("legs")] }), "strength + legs");
  assert.equal(goalLabel({ rules: [any("push", "pull"), { kind: "any", tags: ["plyometrics"], exerciseIds: ["jump"] }, none("legs")] }, names), "(push or pull) + (plyometrics or Box jump), not legs");
  assert.equal(goalLabel({ rules: [any("push", "pull")] }), "push or pull");
  assert.equal(goalLabel({ rules: [any("push"), any("plyometrics"), onSession(any("legs")), onSession(none("deload"))] }), "push + plyometrics, in a session with legs, not deload");
  assert.equal(goalLabel(allOnSession([any("strength"), none("deload")])), "strength, not deload");
  assert.equal(goalLabel({ name: "Chest day", rules: [any("chest")] }), "Chest day");
  assert.equal(frequencyLabel({ target: 2, period: "week" }), "Twice a week");
  assert.equal(frequencyLabel({ target: 3, period: "month" }), "3× a month");
});

test("isActive: goals are active unless switched off", () => {
  assert.equal(isActive({ active: true }), true);
  assert.equal(isActive({}), true);
  assert.equal(isActive({ active: false }), false);
});
