import test from "node:test";
import assert from "node:assert/strict";
import { recentExerciseCounts, entriesByExercise } from "../../src/lib/exercises.js";

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
