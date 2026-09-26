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
