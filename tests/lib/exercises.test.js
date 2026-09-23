import test from "node:test";
import assert from "node:assert/strict";
import { recentExerciseCounts } from "../../src/lib/exercises.js";

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
