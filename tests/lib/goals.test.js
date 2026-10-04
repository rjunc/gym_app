import test from "node:test";
import assert from "node:assert/strict";
import { isActive, windowEnding, matchEntry, matchChecklist, goalMatches, matchesIn, goalStatus, recentWindows, progressText, goalLabel, frequencyLabel, hasCriteria, withoutCriteria, sortSummaries, moveGoal, nextGoalOrder } from "../../src/lib/goals.js";

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

test("windowEnding: the last `days` days, today included", () => {
  assert.deepEqual(windowEnding({ days: 7 }, "2026-10-01"), { start: "2026-09-25", end: "2026-10-01" });
  assert.deepEqual(windowEnding({ days: 30 }, "2026-10-01"), { start: "2026-09-02", end: "2026-10-01" });
  assert.deepEqual(windowEnding({ days: 10 }, "2026-10-01"), { start: "2026-09-22", end: "2026-10-01" });
  assert.deepEqual(windowEnding({}, "2026-10-01"), { start: "2026-09-25", end: "2026-10-01" });
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
const onceAWeek = { target: 1, days: 7 };
const twiceAWeek = { target: 2, days: 7 };

test("matchesIn counts every session, even two on one day", () => {
  assert.equal(matchesIn(at("2026-09-28", "2026-09-28", "2026-09-30", "2026-10-06"), windowEnding(twiceAWeek, "2026-10-01")).length, 3);
});

test("goalStatus: the window rolls — last Friday still counts on Thursday", () => {
  // Thu Oct 1; the session was Fri Sep 25, last calendar week.
  const s = goalStatus(onceAWeek, at("2026-09-25"), "2026-10-01");
  assert.equal(s.count, 1);
  assert.equal(s.due, "2026-10-02"); // it slides out on Friday
  assert.equal(s.status, "risk"); // due tomorrow
  // It slid out today, but a session today still keeps it: due today.
  const dueToday = goalStatus(onceAWeek, at("2026-09-24"), "2026-10-01");
  assert.equal(dueToday.status, "risk");
  assert.equal(dueToday.due, "2026-10-01");
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

test("goalStatus: overdue for up to one window since it was due", () => {
  // Met through Sep 26 by the Sep 20 session, due Sep 27, so 4 days overdue.
  const s = goalStatus(onceAWeek, at("2026-09-20"), "2026-10-01");
  assert.equal(s.status, "overdue");
  assert.equal(s.overdueDays, 4);
  assert.equal(s.lastMet, "2026-09-26");
  assert.equal(s.needed, 1);
});

test("goalStatus: behind once it's been short a whole window or more", () => {
  // Due Sep 24: exactly a week overdue.
  assert.equal(goalStatus(onceAWeek, at("2026-09-17"), "2026-10-01").status, "behind");
  assert.equal(goalStatus(onceAWeek, at("2026-09-18"), "2026-10-01").status, "overdue");
  const s = goalStatus(onceAWeek, at("2026-09-01"), "2026-10-01");
  assert.equal(s.status, "behind");
  assert.equal(s.overdueDays, 23);
  assert.equal(s.lastMet, "2026-09-07");
});

test("goalStatus: never met is overdue in its first window, then behind", () => {
  const fresh = { ...twiceAWeek, createdAt: "2026-09-28T10:00:00.000Z" };
  const old = { ...twiceAWeek, createdAt: "2026-09-01T10:00:00.000Z" };
  assert.equal(goalStatus(fresh, at("2026-09-30"), "2026-10-01").status, "overdue");
  assert.equal(goalStatus(old, at("2026-09-30"), "2026-10-01").status, "behind");
  assert.equal(goalStatus(old, at("2026-09-30"), "2026-10-01").lastMet, null);
});

test("goalStatus: a monthly goal turns at risk 4 days before it's due", () => {
  const monthly = { target: 1, days: 30 };
  assert.equal(goalStatus(monthly, at("2026-09-10"), "2026-10-01").status, "on"); // due Oct 10
  assert.equal(goalStatus(monthly, at("2026-09-10"), "2026-10-06").status, "risk");
  assert.equal(goalStatus(monthly, at("2026-09-10"), "2026-10-10").status, "risk"); // due today
  assert.equal(goalStatus(monthly, at("2026-09-10"), "2026-10-11").status, "overdue");
  assert.equal(goalStatus(monthly, at("2026-09-10"), "2026-11-09").status, "behind"); // 30 days
});

test("goalStatus: twice every 10 days", () => {
  const goal = { target: 2, days: 10 };
  assert.equal(goalStatus(goal, at("2026-09-22", "2026-09-28"), "2026-10-01").status, "risk"); // due Oct 2
  assert.equal(goalStatus(goal, at("2026-09-22", "2026-09-28"), "2026-10-01").due, "2026-10-02");
  assert.equal(goalStatus(goal, at("2026-09-25", "2026-09-28"), "2026-10-01").status, "on"); // due Oct 5
  assert.equal(goalStatus(goal, at("2026-09-21", "2026-09-28"), "2026-10-01").status, "risk"); // met yesterday, due today
  assert.equal(goalStatus(goal, at("2026-09-20", "2026-09-28"), "2026-10-01").status, "overdue"); // last met Sep 29
});

test("recentWindows: back-to-back windows ending today, oldest first", () => {
  const rows = recentWindows(twiceAWeek, at("2026-09-20", "2026-09-22", "2026-09-30"), "2026-10-01", 3);
  assert.deepEqual(rows.map((r) => [r.window.start, r.window.end, r.count, r.met]), [
    ["2026-09-11", "2026-09-17", 0, false],
    ["2026-09-18", "2026-09-24", 2, true],
    ["2026-09-25", "2026-10-01", 1, false],
  ]);
});

test("progressText says what's next, or how far behind", () => {
  const text = (goal, dates, today = "2026-10-01") => progressText(goal, goalStatus(goal, at(...dates), today), today);
  assert.equal(text(onceAWeek, ["2026-09-25"]), "1 in the last 7 days · next by tomorrow");
  assert.equal(text(onceAWeek, ["2026-09-24"]), "0 of 1 in the last 7 days · 1 more due today");
  assert.equal(text(onceAWeek, ["2026-09-20"]), "Overdue 4 days · 1 more needed");
  assert.equal(text(onceAWeek, ["2026-09-01"]), "Behind 3 weeks · last met Sep 7");
  assert.equal(text(onceAWeek, ["2026-06-01"]), "Behind 3 months · last met Jun 7");
  assert.equal(text({ ...twiceAWeek, createdAt: "2026-09-28" }, ["2026-09-30"]), "1 of 2 in the last 7 days · 1 more needed");
  assert.equal(text({ ...twiceAWeek, createdAt: "2026-09-01" }, ["2026-09-30"]), "Never met · 1 more needed");
});

test("goalLabel and frequencyLabel spell out the goal", () => {
  const names = new Map([["jump", "Box jump"]]);
  assert.equal(goalLabel({ rules: [any("strength"), any("legs")] }), "strength + legs");
  assert.equal(goalLabel({ rules: [any("push", "pull"), { kind: "any", tags: ["plyometrics"], exerciseIds: ["jump"] }, none("legs")] }, names), "(push or pull) + (plyometrics or Box jump), not legs");
  assert.equal(goalLabel({ rules: [any("push", "pull")] }), "push or pull");
  assert.equal(goalLabel({ rules: [any("push"), any("plyometrics"), onSession(any("legs")), onSession(none("deload"))] }), "push + plyometrics, in a session with legs, not deload");
  assert.equal(goalLabel(allOnSession([any("strength"), none("deload")])), "strength, not deload");
  assert.equal(goalLabel({ name: "Chest day", rules: [any("chest")] }), "Chest day");
  assert.equal(frequencyLabel({ target: 2, days: 7 }), "Twice a week");
  assert.equal(frequencyLabel({ target: 3, days: 30 }), "3× a month");
  assert.equal(frequencyLabel({ target: 1, days: 14 }), "Once every 2 weeks");
  assert.equal(frequencyLabel({ target: 2, days: 10 }), "Twice every 10 days");
  assert.equal(frequencyLabel({ target: 1, days: 1 }), "Once every day");
});

test("isActive: goals are active unless switched off", () => {
  assert.equal(isActive({ active: true }), true);
  assert.equal(isActive({}), true);
  assert.equal(isActive({ active: false }), false);
});

test("sortSummaries: by status, worst and most urgent first", () => {
  const sum = (id, state) => ({ goal: { id, name: id }, state });
  const list = [
    sum("on-later", { status: "on", due: "2026-10-09" }),
    sum("on-sooner", { status: "on", due: "2026-10-05" }),
    sum("risk", { status: "risk", due: "2026-10-02" }),
    sum("overdue-new", { status: "overdue", lastMet: null, overdueDays: 0 }),
    sum("overdue-3", { status: "overdue", lastMet: "2026-09-27", overdueDays: 3 }),
    sum("behind-9", { status: "behind", lastMet: "2026-09-20", overdueDays: 9 }),
    sum("behind-never", { status: "behind", lastMet: null, overdueDays: 0 }),
    sum("behind-20", { status: "behind", lastMet: "2026-09-10", overdueDays: 20 }),
  ];
  assert.deepEqual(sortSummaries(list, "status").map((s) => s.goal.id), ["behind-never", "behind-20", "behind-9", "overdue-3", "overdue-new", "risk", "on-sooner", "on-later"]);
  assert.deepEqual(sortSummaries(list.slice(0, 3), "name").map((s) => s.goal.id), ["on-later", "on-sooner", "risk"]);
});

test("sortSummaries: in your own order, goals without one go last, oldest first", () => {
  const sum = (id, order, createdAt) => ({ goal: { id, order, createdAt }, state: { status: "on" } });
  const list = [sum("c", undefined, "2026-09-02"), sum("a", 1), sum("d", undefined, "2026-09-01"), sum("b", 0)];
  assert.deepEqual(sortSummaries(list, "custom").map((s) => s.goal.id), ["b", "a", "d", "c"]);
});

test("moveGoal: swaps with the next goal in the same section and renumbers", () => {
  const goals = [
    { id: "a", order: 0 },
    { id: "x", order: 1, active: false },
    { id: "b", order: 2 },
    { id: "c", order: 5 },
  ];
  const orderOf = (list) => Object.fromEntries(list.map((g) => [g.id, g.order]));
  // b moves up past a, skipping the inactive x.
  assert.deepEqual(orderOf(moveGoal(goals, "b", -1)), { b: 0, x: 1, a: 2, c: 3 });
  assert.deepEqual(orderOf(moveGoal(goals, "a", 1)), { b: 0, x: 1, a: 2, c: 3 });
  // At either end of its section, nothing moves.
  assert.equal(moveGoal(goals, "a", -1), goals);
  assert.equal(moveGoal(goals, "x", 1), goals);
  // Untouched goals stay the same objects.
  assert.equal(moveGoal(goals, "b", -1).find((g) => g.id === "x"), goals[1]);
  assert.equal(nextGoalOrder(goals), 6);
  assert.equal(nextGoalOrder([]), 0);
});

// Checklist goals: each item done often enough, from any mix of sessions.
const isoExercises = new Map([
  ["lsit", { id: "lsit", tags: ["core", "isometrics"] }],
  ["horse", { id: "horse", tags: ["legs", "isometrics"] }],
  ["wall", { id: "wall", tags: ["legs", "isometrics"] }],
  ["cope", { id: "cope", tags: ["core", "isometrics"] }],
  ...exercises,
]);
const isoNames = new Map([["lsit", "L-sit"], ["horse", "Horse stance"], ["wall", "Wall sit"], ["cope", "Copenhagen plank"]]);
const isometrics = { mode: "checklist", items: ["lsit", "horse", "wall", "cope"].map((exerciseId) => ({ exerciseId, target: 1 })), days: 30 };
const dated = (date, exerciseIds, tags = []) => ({ ...session(exerciseIds, tags), id: `${date}-${exerciseIds.join("-")}`, date });

test("matchChecklist: a session does every item it has, by exercise or by tag", () => {
  assert.deepEqual(matchChecklist(isometrics, session(["lsit", "bench", "horse"]), isoExercises), {
    items: [0, 1],
    blocks: [{ id: "b0", exerciseId: "lsit" }, { id: "b2", exerciseId: "horse" }],
  });
  assert.equal(matchChecklist(isometrics, session(["bench"]), isoExercises), null);
  // A tag item is done by an exercise's tags or the session's own.
  const ppl = { mode: "checklist", items: [{ tag: "push", target: 2 }, { tag: "pull", target: 1 }, { tag: "legs", target: 1 }], days: 7 };
  assert.deepEqual(matchChecklist(ppl, session(["bench", "row"]), isoExercises).items, [0, 1]);
  assert.deepEqual(matchChecklist(ppl, { tags: ["legs"] }, isoExercises), { items: [2], blocks: [] });
});

test("goalStatus, checklist: items done in separate sessions add up", () => {
  const sessions = [dated("2026-10-01", ["lsit", "horse"]), dated("2026-10-02", ["wall", "cope"])];
  const matches = goalMatches(isometrics, sessions, isoExercises);
  // Only half of it on the first day…
  const first = goalStatus({ ...isometrics, createdAt: "2026-09-30" }, matches, "2026-10-01");
  assert.equal(first.status, "overdue");
  assert.deepEqual([first.count, first.target, first.needed], [2, 4, 2]);
  assert.equal(progressText(isometrics, first, "2026-10-01", isoNames), "2 of 4 done in the last 30 days · Wall sit and Copenhagen plank left");
  // …all of it the next, due when the first day's items slide out.
  const s = goalStatus(isometrics, matches, "2026-10-02");
  assert.equal(s.status, "on");
  assert.equal(s.due, "2026-10-31");
  assert.deepEqual(s.items.map((it) => it.met), [true, true, true, true]);
  assert.equal(progressText(isometrics, s, "2026-10-02", isoNames), "All 4 done in the last 30 days · next by Sat, Oct 31");
});

test("goalStatus, checklist: per-item targets, and slipping when one item does", () => {
  const goal = { mode: "checklist", items: [{ exerciseId: "lsit", target: 2 }, { exerciseId: "wall", target: 1 }], days: 7 };
  const sessions = [dated("2026-09-20", ["lsit", "wall"]), dated("2026-09-26", ["lsit"]), dated("2026-09-30", ["lsit"])];
  const matches = goalMatches(goal, sessions, isoExercises);
  // Wall sits last on Sep 20: met through Sep 26, so the goal is overdue
  // though L-sits are fine.
  const s = goalStatus(goal, matches, "2026-10-01");
  assert.equal(s.status, "overdue");
  assert.equal(s.lastMet, "2026-09-26");
  assert.deepEqual(s.items.map((it) => [it.count, it.target, it.met]), [[2, 2, true], [0, 1, false]]);
  assert.equal(progressText(goal, s, "2026-10-01", isoNames), "Overdue 4 days · Wall sit left");
  // Never met when one item was never done.
  const never = goalStatus({ ...goal, createdAt: "2026-09-01" }, goalMatches(goal, sessions.slice(1), isoExercises), "2026-10-01");
  assert.equal(never.status, "behind");
  assert.equal(never.lastMet, null);
});

test("recentWindows, checklist: counts items done, met when all are", () => {
  const sessions = [dated("2026-09-02", ["lsit", "horse", "wall", "cope"]), dated("2026-09-20", ["lsit"])];
  const rows = recentWindows(isometrics, goalMatches(isometrics, sessions, isoExercises), "2026-10-01", 2);
  assert.deepEqual(rows.map((r) => [r.count, r.met]), [[0, false], [4, true]]);
});

test("checklist labels, criteria, and switching modes on an edit", () => {
  const mixed = { mode: "checklist", items: [{ tag: "push", target: 1 }, { exerciseId: "wall", target: 2 }], days: 7 };
  assert.equal(goalLabel(isometrics, isoNames), "L-sit, Horse stance, Wall sit, Copenhagen plank");
  assert.equal(goalLabel(mixed, isoNames), "push, Wall sit ×2");
  assert.equal(frequencyLabel(isometrics), "Each once a month");
  assert.equal(frequencyLabel(mixed), "2 items a week");
  assert.equal(hasCriteria(isometrics), true);
  assert.equal(hasCriteria({ mode: "checklist", items: [] }), false);
  assert.deepEqual(withoutCriteria({ id: "g", name: "x", mode: "sessions", rules: [], target: 2, days: 7, order: 0 }), { id: "g", name: "x", days: 7, order: 0 });
});
