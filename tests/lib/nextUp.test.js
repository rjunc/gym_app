import test from "node:test";
import assert from "node:assert/strict";
import { goalSummaries } from "../../src/lib/goals.js";
import { planSection, dueGoals, nextUp, suggestSession } from "../../src/lib/nextUp.js";

const today = "2026-10-01";
const exercises = new Map([
  ["bench", { id: "bench", tags: ["push", "strength"] }],
  ["squat", { id: "squat", tags: ["legs", "strength"] }],
  ["plank", { id: "plank", tags: ["core"] }],
  ["lsit", { id: "lsit", tags: ["core", "isometrics"] }],
]);
const names = new Map([["bench", "Bench press"], ["squat", "Back squat"], ["lsit", "L-sit"], ["push", "Upper push"], ["legs", "Lower A"], ["core", "Core finisher"]]);
const routines = [
  { id: "push", tags: ["strength", "push"], blocks: [{ id: "p1", exerciseId: "bench" }] },
  { id: "legs", tags: ["strength", "legs"], blocks: [{ id: "l1", exerciseId: "squat" }] },
  { id: "core", tags: ["core"], blocks: [{ id: "c1", exerciseId: "plank" }, { id: "c2", exerciseId: "lsit" }] },
];
const rule = (fields) => ({ kind: "any", scope: "session", tags: [], exerciseIds: [], routineIds: [], ...fields });
const old = "2026-01-01T00:00:00.000Z";
const goals = [
  // Due now: overdue (last done Sep 22, weekly: due by Sep 28).
  { id: "g-push", mode: "sessions", rules: [rule({ routineIds: ["push"] })], target: 1, days: 7, createdAt: old },
  // Due now: never met, made long ago.
  { id: "g-strength", mode: "sessions", rules: [rule({ tags: ["strength"] }), rule({ kind: "none", tags: ["deload"] })], target: 3, days: 7, createdAt: old },
  // Coming up: met, due tomorrow.
  { id: "g-legs", mode: "sessions", rules: [rule({ tags: ["legs"] })], target: 1, days: 7, createdAt: old },
  // Due now: a checklist with L-sit short.
  { id: "g-iso", mode: "checklist", items: [{ exerciseId: "lsit", target: 1 }, { exerciseId: "bench", target: 1 }], days: 30, createdAt: old },
  // On track.
  { id: "g-core", mode: "sessions", rules: [rule({ tags: ["core"] })], target: 1, days: 30, createdAt: old },
];
const s = (date, fields) => ({ id: date, date, tags: [], routineIds: [], blocks: [], ...fields });
const sessions = [
  s("2026-09-22", { routineIds: ["push"], tags: ["push"], blocks: [{ id: "a", exerciseId: "bench" }] }),
  s("2026-09-25", { tags: ["legs"], blocks: [{ id: "b", exerciseId: "squat" }] }),
  s("2026-09-28", { tags: ["core"], blocks: [{ id: "c", exerciseId: "plank" }] }),
];
const summaries = goalSummaries(goals, sessions, exercises, today);
const due = dueGoals(summaries, today);

test("planSection: due now, coming up, or on track", () => {
  const sectionOf = (id) => planSection(summaries.find((x) => x.goal.id === id).state, today);
  assert.deepEqual(["g-push", "g-strength", "g-legs", "g-iso", "g-core"].map(sectionOf), ["now", "now", "soon", "now", "on"]);
  assert.equal(planSection({ status: "risk", due: today }, today), "now"); // due today
});

test("dueGoals: most urgent first, with what each comes down to", () => {
  // Never met (behind) first, then overdue, then coming up.
  assert.deepEqual(due.map((d) => d.summary.goal.id), ["g-strength", "g-iso", "g-push", "g-legs"]);
  // A sessions goal with one chip to look for comes down to that chip, its
  // exclusions aside; a checklist, to its items that are short.
  assert.deepEqual(due.map((d) => d.todos.map((t) => t.key)), [["tag:strength"], ["exercise:lsit"], ["routine:push"], ["tag:legs"]]);
  const twoChips = dueGoals(goalSummaries([{ id: "g2", mode: "sessions", rules: [rule({ tags: ["push", "legs"] })], target: 5, days: 7, createdAt: old }], sessions, exercises, today), today);
  assert.deepEqual(twoChips[0].todos, [{ key: "goal:g2", chip: null }]);
});

test("nextUp: one row per thing to train, merged across goals", () => {
  const withBench = dueGoals(goalSummaries([...goals, { id: "g-bench", mode: "sessions", rules: [rule({ routineIds: ["push"] })], target: 2, days: 7, createdAt: old }], sessions, exercises, today), today);
  const rows = nextUp(withBench, names, today);
  // Upper push serves both push goals, and takes the more urgent one's timing.
  assert.deepEqual(rows.map((r) => [r.label, r.section, r.when, r.goals.length]), [
    ["strength", "now", "never done", 1],
    ["L-sit", "now", "never done", 1],
    ["Upper push", "now", "never done", 2],
    ["legs", "soon", "due tomorrow", 1],
  ]);
  assert.equal(nextUp(due, names, today).find((r) => r.label === "Upper push").when, "overdue 2 days");
});

test("suggestSession: the routine that helps the most due goals, and one to add", () => {
  const pick = suggestSession(due, routines, exercises, today);
  // Upper push helps push, strength (and bench isn't short in the checklist).
  assert.equal(pick.routine.id, "push");
  assert.deepEqual(pick.goals.map((g) => g.id), ["g-strength", "g-push"]);
  // Then Core finisher does the L-sit (due now) over Lower A (coming up).
  assert.equal(pick.addOn.routine.id, "core");
  assert.deepEqual(pick.addOn.goals.map((g) => g.id), ["g-iso"]);
  assert.equal(suggestSession([], routines, exercises, today), null);
  assert.equal(suggestSession(due, [], exercises, today), null);
});
