import test from "node:test";
import assert from "node:assert/strict";
import { routineOptions, applyRoutine } from "./routines.js";

const folders = [
  { id: "f1", name: "Push day", parentId: null },
  { id: "f2", name: "Heavy", parentId: "f1" },
];
const routines = [
  { id: "r1", name: "Push A", folderId: "f2", tags: ["push"], text: "Bench 5x5" },
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

const blank = { date: "2026-09-21", title: "", tags: [], text: "" };

test("applyRoutine fills an empty form from the routine", () => {
  assert.deepEqual(applyRoutine(blank, routines[0]), { date: "2026-09-21", title: "Push A", tags: ["push"], text: "Bench 5x5" });
});

test("applyRoutine keeps a title that's already there", () => {
  assert.equal(applyRoutine({ ...blank, title: "Morning lift" }, routines[0]).title, "Morning lift");
});

test("applyRoutine merges tags without duplicating", () => {
  assert.deepEqual(applyRoutine({ ...blank, tags: ["legs", "push"] }, routines[0]).tags, ["legs", "push"]);
  assert.deepEqual(applyRoutine({ ...blank, tags: ["legs"] }, routines[0]).tags, ["legs", "push"]);
});

test("applyRoutine appends to text that's already been written instead of replacing it", () => {
  assert.equal(applyRoutine({ ...blank, text: "felt strong\n" }, routines[0]).text, "felt strong\n\nBench 5x5");
});

test("applyRoutine tolerates a routine with missing fields", () => {
  assert.deepEqual(applyRoutine(blank, { id: "x" }), { date: "2026-09-21", title: "", tags: [], text: "" });
});
