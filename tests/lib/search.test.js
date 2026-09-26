import test from "node:test";
import assert from "node:assert/strict";
import {
  searchWords,
  prefixMatchesFirst,
  matchesSearch,
  exerciseNameMap,
  entrySearchFields,
  folderItemSearchFields,
  exerciseSearchFields,
} from "../../src/lib/search.js";

test("searchWords lowercases and splits on any whitespace", () => {
  assert.deepEqual(searchWords("  Back  SQUAT\tlegs "), ["back", "squat", "legs"]);
  assert.deepEqual(searchWords(""), []);
  assert.deepEqual(searchWords(undefined), []);
});

test("searchWords keeps a quoted phrase together as one term", () => {
  assert.deepEqual(searchWords('"Back Squat" legs'), ["back squat", "legs"]);
  assert.deepEqual(searchWords('legs "back   squat"'), ["legs", "back squat"]);
  assert.deepEqual(searchWords('"upper body""back squat"'), ["upper body", "back squat"]);
});

test("searchWords accepts curly quotes, as typed by iOS", () => {
  assert.deepEqual(searchWords("“back squat” legs"), ["back squat", "legs"]);
});

test("searchWords treats an unclosed quote as a phrase running to the end", () => {
  assert.deepEqual(searchWords('legs "back sq'), ["legs", "back sq"]);
});

test("searchWords drops empty quotes", () => {
  assert.deepEqual(searchWords('"" legs " "'), ["legs"]);
  assert.deepEqual(searchWords('"'), []);
});

test("matchesSearch: a quoted phrase must appear as-is within a single field", () => {
  const linked = ["Morning", "felt good", ["legs"], ["Back squat"]];
  const scattered = ["Back from vacation", "light front squats", ["legs"], []];
  assert.equal(matchesSearch(linked, '"back squat"'), true);
  assert.equal(matchesSearch(scattered, '"back squat"'), false);
  assert.equal(matchesSearch(scattered, "back squat"), true, "unquoted still matches words in separate fields");
  assert.equal(matchesSearch(linked, '"back squat" legs'), true);
  assert.equal(matchesSearch(linked, '"back squat" arms'), false);
  assert.equal(matchesSearch(scattered, '"back squat" legs', "any"), true);
});

test("matchesSearch: an empty query matches everything", () => {
  assert.equal(matchesSearch(["anything"], ""), true);
  assert.equal(matchesSearch([], "   "), true);
});

test("matchesSearch: case-insensitive substring match", () => {
  assert.equal(matchesSearch(["Back Squat 5x5"], "squ"), true);
  assert.equal(matchesSearch(["Back Squat 5x5"], "bench"), false);
});

test("matchesSearch 'all': every word must be found, but each may be in a different field", () => {
  const fields = ["Leg day", "Squat 5x5", ["legs", "strength"]];
  assert.equal(matchesSearch(fields, "squat strength", "all"), true);
  assert.equal(matchesSearch(fields, "squat bench", "all"), false);
});

test("matchesSearch defaults to 'all'", () => {
  assert.equal(matchesSearch(["squat"], "squat bench"), false);
});

test("matchesSearch 'any': one found word is enough", () => {
  assert.equal(matchesSearch(["squat"], "squat bench", "any"), true);
  assert.equal(matchesSearch(["squat"], "deadlift bench", "any"), false);
});

test("matchesSearch ignores missing and empty fields", () => {
  assert.equal(matchesSearch([undefined, null, "", [], "plank"], "plank"), true);
  assert.equal(matchesSearch([undefined, null, ""], "x"), false);
});

const exerciseNameById = exerciseNameMap([
  { id: "e1", name: "Back squat" },
  { id: "e2", name: "Bench press" },
]);

test("entrySearchFields covers title, text, tags and linked exercise names — but not the date", () => {
  const session = { id: "s1", date: "2026-09-24", title: "Morning", text: "felt strong", tags: ["legs"], exerciseIds: ["e1", "gone"] };
  const fields = entrySearchFields(session, exerciseNameById);
  for (const q of ["morning", "strong", "legs", "back squat"]) assert.equal(matchesSearch(fields, q), true, q);
  assert.equal(matchesSearch(fields, "2026"), false);
  assert.equal(matchesSearch(fields, "09-24"), false);
});

test("entrySearchFields tolerates an entry with only text (e.g. an old roll)", () => {
  assert.equal(matchesSearch(entrySearchFields({ text: "rolled 5 rounds" }, exerciseNameById), "rounds"), true);
});

test("folderItemSearchFields covers the whole folder path, positions and linked exercises", () => {
  const folders = [
    { id: "f1", name: "Lifting", parentId: null },
    { id: "f2", name: "Push", parentId: "f1" },
  ];
  const routine = { id: "r1", name: "Day A", folderId: "f2", tags: [], text: "", exerciseIds: ["e2"] };
  const fields = folderItemSearchFields(routine, folders, exerciseNameById);
  for (const q of ["day a", "push", "lifting", "bench"]) assert.equal(matchesSearch(fields, q), true, q);

  const technique = { id: "t1", name: "Scissor sweep", folderId: null, tags: [], text: "", position: "Closed guard", toPosition: "Mount" };
  const tFields = folderItemSearchFields(technique, folders, exerciseNameById);
  assert.equal(matchesSearch(tFields, "closed mount"), true);
});

test("exerciseSearchFields covers name, text, tags and prescription", () => {
  const exercise = { id: "e1", name: "Plank", text: "Brace hard", tags: ["core"], prescription: "3x60s" };
  const fields = exerciseSearchFields(exercise);
  for (const q of ["plank", "brace", "core", "60s"]) assert.equal(matchesSearch(fields, q), true, q);
});

test("prefixMatchesFirst moves starts-with matches ahead, keeping each group's order", () => {
  const items = ["single-leg rdl", "back squat", "legs day", "leg press"];
  assert.deepEqual(prefixMatchesFirst(items, "leg", (s) => [s]), ["legs day", "leg press", "single-leg rdl", "back squat"]);
});

test("prefixMatchesFirst checks every text it's given, case-insensitively", () => {
  const routines = [
    { name: "Day A", label: "Legs / Day A" },
    { name: "Leg blaster", label: "Leg blaster" },
    { name: "Upper", label: "Upper" },
  ];
  const out = prefixMatchesFirst(routines, "LEG", (r) => [r.name, r.label]).map((r) => r.name);
  assert.deepEqual(out, ["Day A", "Leg blaster", "Upper"]);
});

test("prefixMatchesFirst leaves the order alone for a blank query", () => {
  const items = ["b", "a"];
  assert.equal(prefixMatchesFirst(items, "  ", (s) => [s]), items);
});

test("entrySearchFields matches the names of the routines an entry was built from, skipping deleted ones", () => {
  const routineNameById = exerciseNameMap([{ id: "r1", name: "Push A" }]);
  const session = { id: "s1", text: "", tags: [], routineIds: ["r1", "gone"] };
  assert.equal(matchesSearch(entrySearchFields(session, exerciseNameById, routineNameById), "push a"), true);
  assert.equal(matchesSearch(entrySearchFields(session, exerciseNameById), "push"), false);
});

test("entrySearchFields finds a session by its per-exercise notes", () => {
  const session = { text: "", tags: [], exerciseIds: ["e1"], exerciseNotes: { e1: "left shoulder twinged" } };
  assert.equal(matchesSearch(entrySearchFields(session, new Map()), "shoulder"), true);
});
