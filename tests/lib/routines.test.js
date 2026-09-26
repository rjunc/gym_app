import test from "node:test";
import assert from "node:assert/strict";
import { routineOptions, applyRoutine } from "../../src/lib/routines.js";

const folders = [
  { id: "f1", name: "Push day", parentId: null },
  { id: "f2", name: "Heavy", parentId: "f1" },
];
const routines = [
  { id: "r1", name: "Push A", folderId: "f2", tags: ["push"], text: "Bench 5x5", exerciseIds: ["e1", "e2"] },
  { id: "r2", name: "Full body", folderId: null, tags: [], text: "Squat, row" },
  { id: "r3", name: "Push B", folderId: "f1", tags: [], text: "OHP" },
];

test("routineOptions builds folder-path labels and sorts them", () => {
  assert.deepEqual(routineOptions(routines, folders), [
    { id: "r2", label: "Full body" },
    { id: "r1", label: "Push day / Heavy / Push A" },
    { id: "r3", label: "Push day / Push B" },
  ]);
});

test("routineOptions handles no routines", () => {
  assert.deepEqual(routineOptions([], folders), []);
});

const blank = { date: "2026-09-21", title: "", tags: [], text: "", exerciseIds: [] };

test("applyRoutine fills an empty form from the routine", () => {
  assert.deepEqual(applyRoutine(blank, routines[0]), {
    date: "2026-09-21",
    title: "Push A",
    tags: ["push"],
    text: "Bench 5x5",
    exerciseIds: ["e1", "e2"],
    routineIds: ["r1"],
  });
});

test("applyRoutine keeps a title that's already there", () => {
  assert.equal(applyRoutine({ ...blank, title: "Morning lift" }, routines[0]).title, "Morning lift");
});

test("applyRoutine merges tags without duplicating", () => {
  assert.deepEqual(applyRoutine({ ...blank, tags: ["legs", "push"] }, routines[0]).tags, ["legs", "push"]);
  assert.deepEqual(applyRoutine({ ...blank, tags: ["legs"] }, routines[0]).tags, ["legs", "push"]);
});

test("applyRoutine merges exercises without duplicating", () => {
  assert.deepEqual(applyRoutine({ ...blank, exerciseIds: ["e2", "e3"] }, routines[0]).exerciseIds, ["e2", "e3", "e1"]);
});

test("applyRoutine appends to text that's already been written instead of replacing it", () => {
  assert.equal(applyRoutine({ ...blank, text: "felt strong\n" }, routines[0]).text, "felt strong\n\nBench 5x5");
});

test("applyRoutine tolerates a routine with missing fields", () => {
  assert.deepEqual(applyRoutine(blank, { id: "x" }), { date: "2026-09-21", title: "", tags: [], text: "", exerciseIds: [], routineIds: ["x"] });
});

test("applyRoutine records each routine once, in the order added", () => {
  const once = applyRoutine(blank, routines[0]);
  const twice = applyRoutine(applyRoutine(once, routines[1]), routines[0]);
  assert.deepEqual(twice.routineIds, ["r1", "r2"]);
});

test("applyRoutine keeps routine links the form already has", () => {
  assert.deepEqual(applyRoutine({ ...blank, routineIds: ["r3"] }, routines[1]).routineIds, ["r3", "r2"]);
});

/* ============================== routine backlinks ============================== */

import { routineUsageCounts, entriesByRoutine } from "../../src/lib/routines.js";
import { usageList, compareByUsage } from "../../src/lib/links.js";

const logged = [
  { id: "s1", date: "2026-09-20", routineIds: ["r1"] },
  { id: "s2", date: "2026-08-01", routineIds: ["r1", "r2"] },
  { id: "s3", date: "2026-09-24", routineIds: ["r2", "r2"] },
  { id: "s4", date: "2026-09-24" },
];

test("routineUsageCounts counts recent and all-time session uses, once per session", () => {
  const usage = routineUsageCounts(logged, "2026-09-25");
  assert.deepEqual(usage.get("r1"), { recent: 1, total: 2 });
  assert.deepEqual(usage.get("r2"), { recent: 1, total: 2 });
  assert.equal(usage.get("r3"), undefined);
});

test("entriesByRoutine lists the entries built from each routine, newest first", () => {
  const byRoutine = entriesByRoutine(logged);
  assert.deepEqual(byRoutine.get("r1").map((s) => s.id), ["s1", "s2"]);
  assert.deepEqual(byRoutine.get("r2").map((s) => s.id), ["s3", "s2"]);
});

test("compareByUsage can rank by a label instead of a name (routine picker options)", () => {
  const usage = routineUsageCounts(logged, "2026-09-25");
  const options = [
    { id: "r3", label: "A never used" },
    { id: "r2", label: "Legs / B" },
    { id: "r1", label: "Push / A" },
  ];
  assert.deepEqual(options.sort(compareByUsage(usage, (o) => o.label)).map((o) => o.id), ["r2", "r1", "r3"]);
});

test("usageList joins the parts for a sentence", () => {
  assert.equal(usageList({ sessions: [{}, {}], journals: [{}] }), "2 sessions and 1 journal entry");
  assert.equal(usageList({ sessions: [{}], journals: [{}], routines: [{}, {}] }), "1 session, 1 journal entry and 2 routines");
  assert.equal(usageList({ sessions: [{}] }), "1 session");
  assert.equal(usageList({}), "");
});

/* ============================== routine picker ============================== */

import { routinePickerView } from "../../src/lib/routines.js";
import { itemCountUnder } from "../../src/lib/folders.js";

const pickerFolders = [
  { id: "str", name: "Strength", parentId: null },
  { id: "heavy", name: "Heavy", parentId: "str" },
  { id: "cond", name: "Conditioning", parentId: null },
];
const pickerRoutines = [
  { id: "pa", name: "Push A", folderId: "str", tags: ["push"], text: "Bench 5x5", exerciseIds: ["bp"] },
  { id: "pb", name: "Push B", folderId: "str", tags: ["push"], text: "OHP" },
  { id: "dl", name: "Deadlift day", folderId: "heavy", tags: ["pull"], text: "" },
  { id: "ab", name: "Abs", folderId: null, tags: [], text: "Planks" },
];

test("routinePickerView without filters shows the current folder's subfolders (A–Z) and routines", () => {
  const top = routinePickerView({ routines: pickerRoutines, folders: pickerFolders });
  assert.equal(top.filtering, false);
  assert.deepEqual(top.subfolders.map((f) => f.id), ["cond", "str"]);
  assert.deepEqual(top.items.map((r) => r.id), ["ab"]);
  const inStrength = routinePickerView({ routines: pickerRoutines, folders: pickerFolders, folderId: "str" });
  assert.deepEqual(inStrength.subfolders.map((f) => f.id), ["heavy"]);
  assert.deepEqual(inStrength.items.map((r) => r.id), ["pa", "pb"]);
});

test("routinePickerView orders a folder's routines by use, then A–Z", () => {
  const usage = new Map([["pb", { recent: 2, total: 5 }]]);
  const view = routinePickerView({ routines: pickerRoutines, folders: pickerFolders, folderId: "str", usage });
  assert.deepEqual(view.items.map((r) => r.id), ["pb", "pa"]);
});

test("routinePickerView with a search or tag filter searches every folder", () => {
  const byFolderName = routinePickerView({ routines: pickerRoutines, folders: pickerFolders, folderId: "cond", query: "heavy" });
  assert.equal(byFolderName.filtering, true);
  assert.deepEqual(byFolderName.subfolders, []);
  assert.deepEqual(byFolderName.items.map((r) => r.id), ["dl"]);
  const byExercise = routinePickerView({ routines: pickerRoutines, folders: pickerFolders, query: "bench press", exerciseNameById: new Map([["bp", "Bench press"]]) });
  assert.deepEqual(byExercise.items.map((r) => r.id), ["pa"]);
  const byTag = routinePickerView({ routines: pickerRoutines, folders: pickerFolders, tags: ["push"] });
  assert.deepEqual(byTag.items.map((r) => r.id).sort(), ["pa", "pb"]);
});

test("itemCountUnder counts routines in a folder and everything beneath it", () => {
  assert.equal(itemCountUnder(pickerFolders, pickerRoutines, "str"), 3);
  assert.equal(itemCountUnder(pickerFolders, pickerRoutines, "heavy"), 1);
  assert.equal(itemCountUnder(pickerFolders, pickerRoutines, "cond"), 0);
});
