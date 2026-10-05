import test from "node:test";
import assert from "node:assert/strict";
import { tagCounts, tagUsage, searchTags, addTagsFromDraft, sharedTagUsage, tagLikeness, similarTags, replaceTag } from "../../src/lib/tags.js";

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

test("sharedTagUsage: the kind's own tags first, then every other tag in the app", () => {
  const own = [{ tags: ["legs"] }, { tags: ["legs", "strength"] }];
  const all = [...own, { tags: ["sleep"] }, { tags: ["sleep"] }, { tags: ["sleep", "legs"] }];
  assert.deepEqual(sharedTagUsage(own, all, "2026-10-01").map((s) => s.tag), ["legs", "strength", "sleep"]);
});

test("tagLikeness: spelling slips, plurals and punctuation, but not short different words", () => {
  assert.equal(tagLikeness("leg", "legs"), 0);
  assert.equal(tagLikeness("stretches", "stretch"), 0);
  assert.equal(tagLikeness("open mat", "open-mat"), 0);
  assert.equal(tagLikeness("mobilty", "mobility"), 1);
  assert.equal(tagLikeness("plyometircs", "plyometrics"), 1); // a swap is one slip
  assert.equal(tagLikeness("condtioning", "conditionnig"), 2);
  assert.equal(tagLikeness("push", "pull"), null);
  assert.equal(tagLikeness("abs", "arms"), null);
  assert.equal(tagLikeness("core", "cord"), null); // short words: a different letter is a different word
  assert.equal(tagLikeness("sweep", "sleep"), null);
  assert.equal(tagLikeness("pussh", "push"), 1);
  assert.equal(tagLikeness("psuh", "push"), 1);
  assert.equal(tagLikeness("cardoi", "cardio"), 1);
  assert.equal(tagLikeness("strenth", "strength"), 1);
  assert.equal(tagLikeness("legs", "legs"), null);
});

test("similarTags: what a new tag might have meant, most alike then most used", () => {
  const vocabulary = ["legs", "strength", "mobility", "leg day"];
  assert.deepEqual(similarTags("Leg", vocabulary), ["legs"]);
  assert.deepEqual(similarTags("mobilty ", vocabulary), ["mobility"]);
  assert.deepEqual(similarTags("legs", vocabulary), []); // already a tag
  assert.deepEqual(similarTags("cardio", vocabulary), []);
});

test("replaceTag: renames in place, keeps each tag once, or removes it", () => {
  assert.deepEqual(replaceTag(["leg", "strength"], "leg", "legs"), ["legs", "strength"]);
  assert.deepEqual(replaceTag(["strength", "leg", "legs"], "leg", "legs"), ["strength", "legs"]);
  assert.deepEqual(replaceTag(["leg", "strength"], "leg", null), ["strength"]);
});
