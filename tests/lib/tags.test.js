import test from "node:test";
import assert from "node:assert/strict";
import { tagCounts, tagUsage, searchTags, addTagsFromDraft } from "../../src/lib/tags.js";

test("tagCounts sorts by usage, then alphabetically", () => {
  const entries = [{ tags: ["legs", "cardio"] }, { tags: ["cardio"] }, { tags: ["push"] }, { tags: ["cardio", "legs"] }];
  assert.deepEqual(tagCounts(entries), [
    { tag: "cardio", count: 3 },
    { tag: "legs", count: 2 },
    { tag: "push", count: 1 },
  ]);
  assert.deepEqual(tagCounts([{ tags: ["b"] }, { tags: ["a"] }]).map((c) => c.tag), ["a", "b"]);
});

test("tagCounts counts an entry once per tag and tolerates missing tags", () => {
  assert.deepEqual(tagCounts([{ tags: ["a", "a"] }, {}, { tags: null }]), [{ tag: "a", count: 1 }]);
  assert.deepEqual(tagCounts([]), []);
});

const counts = [
  { tag: "cardio", count: 9 },
  { tag: "upper-cardio", count: 5 },
  { tag: "legs", count: 4 },
  { tag: "carry", count: 1 },
];

test("searchTags: blank query matches nothing", () => {
  assert.deepEqual(searchTags(counts, ""), []);
  assert.deepEqual(searchTags(counts, "   "), []);
});

test("searchTags: prefix matches come before mid-word matches, each keeping usage order", () => {
  assert.deepEqual(searchTags(counts, "car").map((c) => c.tag), ["cardio", "carry", "upper-cardio"]);
});

test("searchTags is case-insensitive and trims the query", () => {
  assert.deepEqual(searchTags(counts, "  LEG ").map((c) => c.tag), ["legs"]);
  assert.deepEqual(searchTags(counts, "zzz"), []);
});

test("addTagsFromDraft splits on commas, trims, lowercases, and appends", () => {
  assert.deepEqual(addTagsFromDraft(["legs"], " Push , CARDIO "), ["legs", "push", "cardio"]);
});

test("addTagsFromDraft drops blanks and tags already present, including repeats within the draft", () => {
  assert.deepEqual(addTagsFromDraft(["legs"], "legs, , push,push,"), ["legs", "push"]);
  assert.deepEqual(addTagsFromDraft(["a"], ""), ["a"]);
});

test("addTagsFromDraft does not mutate the existing array", () => {
  const existing = ["a"];
  addTagsFromDraft(existing, "b");
  assert.deepEqual(existing, ["a"]);
});

test("tagUsage ranks by use in the last 30 days, then all-time, then alphabetically", () => {
  const today = "2026-09-22";
  const entries = [
    { date: "2026-09-20", tags: ["legs", "push"] },
    { date: "2026-09-10", tags: ["push"] },
    { date: "2026-05-01", tags: ["mobility"] },
    { date: "2026-04-01", tags: ["mobility", "cardio"] },
    { date: "2026-03-01", tags: ["mobility", "legs"] },
  ];
  assert.deepEqual(tagUsage(entries, today), [
    { tag: "push", recent: 2, total: 2 },
    { tag: "legs", recent: 1, total: 2 },
    { tag: "mobility", recent: 0, total: 3 },
    { tag: "cardio", recent: 0, total: 1 },
  ]);
});

test("tagUsage: undated items (routines, techniques, exercises) rank by all-time use", () => {
  const items = [{ tags: ["b"] }, { tags: ["a", "b"] }, { tags: ["a", "a"] }, {}];
  assert.deepEqual(tagUsage(items, "2026-09-22"), [
    { tag: "a", recent: 0, total: 2 },
    { tag: "b", recent: 0, total: 2 },
  ]);
});

test("searchTags keeps tagUsage's order within the starts-with and contains groups", () => {
  const ranked = tagUsage([{ tags: ["single-leg"] }, { tags: ["single-leg"] }, { tags: ["legs"] }], "2026-09-22");
  assert.deepEqual(searchTags(ranked, "leg").map((c) => c.tag), ["legs", "single-leg"]);
});
