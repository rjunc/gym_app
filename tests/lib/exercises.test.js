import test from "node:test";
import assert from "node:assert/strict";
import { recentExerciseCounts, entriesByExercise, exerciseHistory, exerciseUsageSummary } from "../../src/lib/exercises.js";

const today = "2026-09-22";

test("recentExerciseCounts counts each exerciseId occurrence within the window", () => {
  const sessions = [
    { id: "s1", date: "2026-09-20", exerciseIds: ["e1", "e2"] },
    { id: "s2", date: "2026-09-15", exerciseIds: ["e1"] },
  ];
  const counts = recentExerciseCounts(sessions, today);
  assert.equal(counts.get("e1"), 2);
  assert.equal(counts.get("e2"), 1);
});

test("recentExerciseCounts excludes sessions older than the window (default 30 days)", () => {
  const sessions = [
    { id: "s1", date: "2026-08-23", exerciseIds: ["e1"] }, // exactly 30 days back — included
    { id: "s2", date: "2026-08-22", exerciseIds: ["e1"] }, // 31 days back — excluded
  ];
  const counts = recentExerciseCounts(sessions, today);
  assert.equal(counts.get("e1"), 1);
});

test("recentExerciseCounts respects a custom window", () => {
  const sessions = [{ id: "s1", date: "2026-09-10", exerciseIds: ["e1"] }];
  assert.equal(recentExerciseCounts(sessions, today, 7).has("e1"), false);
  assert.equal(recentExerciseCounts(sessions, today, 14).get("e1"), 1);
});

test("recentExerciseCounts tolerates sessions with no exerciseIds or a malformed date", () => {
  const sessions = [
    { id: "s1", date: "2026-09-20" },
    { id: "s2", date: null, exerciseIds: ["e1"] },
    { id: "s3", exerciseIds: ["e1"] },
  ];
  const counts = recentExerciseCounts(sessions, today);
  assert.equal(counts.size, 0);
});

test("recentExerciseCounts returns an empty map for no sessions", () => {
  assert.equal(recentExerciseCounts([], today).size, 0);
});

test("entriesByExercise maps each exercise id to the entries linking it, newest first", () => {
  const journals = [
    { id: "j1", date: "2026-09-10", exerciseIds: ["e1"] },
    { id: "j2", date: "2026-09-20", exerciseIds: ["e1", "e2"] },
    { id: "j3", date: "2026-09-15" },
  ];
  const map = entriesByExercise(journals);
  assert.deepEqual(map.get("e1").map((j) => j.id), ["j2", "j1"]);
  assert.deepEqual(map.get("e2").map((j) => j.id), ["j2"]);
  assert.equal(map.has("e3"), false);
});

test("entriesByExercise keeps undated entries (routines) in their original order", () => {
  const routines = [
    { id: "r1", exerciseIds: ["e1"] },
    { id: "r2", exerciseIds: ["e1"] },
  ];
  assert.deepEqual(entriesByExercise(routines).get("e1").map((r) => r.id), ["r1", "r2"]);
});

test("exerciseHistory merges sessions and journal entries newest first, labelling each", () => {
  const sessions = [
    { id: "s1", date: "2026-09-10" },
    { id: "s2", date: "2026-09-20" },
  ];
  const journals = [{ id: "j1", date: "2026-09-15" }];
  assert.deepEqual(
    exerciseHistory(sessions, journals).map((h) => `${h.kind}:${h.entry.id}`),
    ["session:s2", "journal:j1", "session:s1"]
  );
});

test("exerciseHistory lists a session before a journal entry on the same day", () => {
  const out = exerciseHistory([{ id: "s1", date: "2026-09-10" }], [{ id: "j1", date: "2026-09-10" }]);
  assert.deepEqual(out.map((h) => h.kind), ["session", "journal"]);
});

test("exerciseHistory is empty when nothing links the exercise", () => {
  assert.deepEqual(exerciseHistory([], []), []);
});

test("exerciseUsageSummary counts each kind with singular/plural wording and finds the last date", () => {
  const summary = exerciseUsageSummary({
    sessions: [{ date: "2026-09-10" }, { date: "2026-09-24" }],
    journals: [{ date: "2026-09-12" }],
    routines: [{ id: "r1" }],
  });
  assert.deepEqual(summary, { text: "2 sessions · 1 journal entry · 1 routine", lastDate: "2026-09-24" });
});

test("exerciseUsageSummary leaves out empty kinds, and has no last date for routines only", () => {
  assert.deepEqual(exerciseUsageSummary({ routines: [{ id: "r1" }, { id: "r2" }] }), { text: "2 routines", lastDate: null });
  assert.deepEqual(exerciseUsageSummary({ journals: [{ date: "2026-09-12" }, { date: "2026-09-01" }] }), {
    text: "2 journal entries",
    lastDate: "2026-09-12",
  });
});

test("exerciseUsageSummary is empty for an unused exercise", () => {
  assert.deepEqual(exerciseUsageSummary({}), { text: "", lastDate: null });
});
