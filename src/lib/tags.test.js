import test from "node:test";
import assert from "node:assert/strict";
import { tagCounts, searchTags } from "./tags.js";

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
