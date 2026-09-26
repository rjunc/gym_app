import test from "node:test";
import assert from "node:assert/strict";
import { exerciseUsageCounts, entriesByExercise } from "../../src/lib/exercises.js";
import { compareByUsage, entryHistory, usageSummary } from "../../src/lib/links.js";

const today = "2026-09-22";

test("exerciseUsageCounts counts recent (last 30 days) and all-time session uses per exercise", () => {
  const sessions = [
    { id: "s1", date: "2026-09-20", exerciseIds: ["e1", "e2"] },
    { id: "s2", date: "2026-09-15", exerciseIds: ["e1"] },
    { id: "s3", date: "2026-06-01", exerciseIds: ["e1", "e3"] },
  ];
  const usage = exerciseUsageCounts(sessions, today);
  assert.deepEqual(usage.get("e1"), { recent: 2, total: 3 });
  assert.deepEqual(usage.get("e2"), { recent: 1, total: 1 });
  assert.deepEqual(usage.get("e3"), { recent: 0, total: 1 });
});

test("exerciseUsageCounts: the 30-day window includes exactly 30 days back, not 31", () => {
  const sessions = [
    { id: "s1", date: "2026-08-23", exerciseIds: ["e1"] }, // exactly 30 days back — recent
    { id: "s2", date: "2026-08-22", exerciseIds: ["e1"] }, // 31 days back — all-time only
  ];
  assert.deepEqual(exerciseUsageCounts(sessions, today).get("e1"), { recent: 1, total: 2 });
});

test("exerciseUsageCounts respects a custom window", () => {
  const sessions = [{ id: "s1", date: "2026-09-10", exerciseIds: ["e1"] }];
  assert.equal(exerciseUsageCounts(sessions, today, 7).get("e1").recent, 0);
  assert.equal(exerciseUsageCounts(sessions, today, 14).get("e1").recent, 1);
});

test("exerciseUsageCounts: a session with a missing/malformed date still counts all-time, never as recent", () => {
  const sessions = [
    { id: "s1", date: "2026-09-20" },
    { id: "s2", date: null, exerciseIds: ["e1"] },
    { id: "s3", exerciseIds: ["e1"] },
  ];
  assert.deepEqual(exerciseUsageCounts(sessions, today).get("e1"), { recent: 0, total: 2 });
});

test("compareByUsage ranks by recent use, then all-time use, then name", () => {
  const usage = new Map([
    ["old-staple", { recent: 0, total: 20 }],
    ["this-month", { recent: 3, total: 3 }],
    ["also-month", { recent: 3, total: 9 }],
    ["once-ever", { recent: 0, total: 1 }],
  ]);
  const exercises = ["zzz-never", "once-ever", "old-staple", "aaa-never", "this-month", "also-month"].map((id) => ({ id, name: id }));
  assert.deepEqual(exercises.sort(compareByUsage(usage)).map((e) => e.id), [
    "also-month",
    "this-month",
    "old-staple",
    "once-ever",
    "aaa-never",
    "zzz-never",
  ]);
});

test("compareByUsage with no usage at all is plain alphabetical", () => {
  const exercises = [{ id: "2", name: "Squat" }, { id: "1", name: "Bench" }];
  assert.deepEqual(exercises.sort(compareByUsage(new Map())).map((e) => e.name), ["Bench", "Squat"]);
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

test("entryHistory merges sessions and journal entries newest first, labelling each", () => {
  const sessions = [
    { id: "s1", date: "2026-09-10" },
    { id: "s2", date: "2026-09-20" },
  ];
  const journals = [{ id: "j1", date: "2026-09-15" }];
  assert.deepEqual(
    entryHistory(sessions, journals).map((h) => `${h.kind}:${h.entry.id}`),
    ["session:s2", "journal:j1", "session:s1"]
  );
});

test("entryHistory lists a session before a journal entry on the same day", () => {
  const out = entryHistory([{ id: "s1", date: "2026-09-10" }], [{ id: "j1", date: "2026-09-10" }]);
  assert.deepEqual(out.map((h) => h.kind), ["session", "journal"]);
});

test("entryHistory is empty when nothing links the exercise", () => {
  assert.deepEqual(entryHistory([], []), []);
});

test("usageSummary counts each kind with singular/plural wording and finds the last date", () => {
  const summary = usageSummary({
    sessions: [{ date: "2026-09-10" }, { date: "2026-09-24" }],
    journals: [{ date: "2026-09-12" }],
    routines: [{ id: "r1" }],
  });
  assert.deepEqual(summary, { text: "2 sessions · 1 journal entry · 1 routine", lastDate: "2026-09-24" });
});

test("usageSummary leaves out empty kinds, and has no last date for routines only", () => {
  assert.deepEqual(usageSummary({ routines: [{ id: "r1" }, { id: "r2" }] }), { text: "2 routines", lastDate: null });
  assert.deepEqual(usageSummary({ journals: [{ date: "2026-09-12" }, { date: "2026-09-01" }] }), {
    text: "2 journal entries",
    lastDate: "2026-09-12",
  });
});

test("usageSummary is empty for an unused exercise", () => {
  assert.deepEqual(usageSummary({}), { text: "", lastDate: null });
});
