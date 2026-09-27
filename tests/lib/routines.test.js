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

/* ============================== routine plans ============================== */

import { routineFromSession } from "../../src/lib/routines.js";
import { fromDraftBlocks, hasLoggedBlocks, planHints } from "../../src/lib/sets.js";

const legs = {
  id: "r1",
  name: "Legs",
  tags: [],
  text: "",
  exerciseIds: ["e1", "e2", "e3"],
  blocks: [
    { id: "b1", exerciseId: "e1", sets: [{ weight: 225, weightUnit: "lb", reps: 5 }, { weight: 225, weightUnit: "lb", reps: 5 }], note: "pause at bottom" },
    { id: "b2", exerciseId: "e2", sets: [{ reps: 10 }], groupId: "g1" },
    { id: "b3", exerciseId: "e3", sets: [], groupId: "g1" },
  ],
  groups: [{ id: "g1", kind: "superset" }],
};
const sessionForm = { title: "", tags: [], text: "", routineIds: [], blocks: [{ key: "k1", exerciseId: "e1", rows: [], note: "" }], groups: [] };

test("applyRoutine on a session form appends the routine's whole plan after what's there, repeats included", () => {
  const out = applyRoutine(sessionForm, legs);
  assert.deepEqual(out.blocks.map((b) => b.exerciseId), ["e1", "e1", "e2", "e3"]);
  assert.deepEqual(out.blocks[0], sessionForm.blocks[0]);
  assert.equal("exerciseIds" in out, false);
  assert.deepEqual(out.routineIds, ["r1"]);
});

test("applyRoutine gives the plan fresh ids and keeps its superset together", () => {
  const out = applyRoutine(sessionForm, legs);
  const [, squat, a, b] = out.blocks;
  assert.notEqual(squat.key, "b1");
  assert.equal(out.groups.length, 1);
  assert.notEqual(out.groups[0].id, "g1");
  assert.equal(out.groups[0].kind, "superset");
  assert.equal(a.groupId, out.groups[0].id);
  assert.equal(b.groupId, out.groups[0].id);
  assert.equal("groupId" in squat, false);
});

test("applyRoutine adding the same plan twice gives two separate copies", () => {
  const out = applyRoutine(applyRoutine(sessionForm, legs), { ...legs, id: "r2" });
  assert.equal(out.blocks.length, 7);
  assert.equal(out.groups.length, 2);
  assert.equal(new Set(out.blocks.map((b) => b.key)).size, 7);
});

test("applyRoutine brings planned sets as empty rows with the plan kept for hints, and copies the note", () => {
  const squat = applyRoutine(sessionForm, legs).blocks[1];
  assert.deepEqual(squat.rows, [
    { weight: "", reps: "" },
    { weight: "", reps: "" },
  ]);
  assert.deepEqual(squat.plan, legs.blocks[0].sets);
  assert.equal(squat.note, "pause at bottom");
  assert.deepEqual(planHints(squat.plan)[0], { weight: "225", reps: "5" });
});

test("a plan's untouched rows are never saved as sets, and the plan itself isn't saved", () => {
  const out = applyRoutine(sessionForm, { ...legs, blocks: legs.blocks.map((b) => ({ ...b, note: undefined })) });
  assert.equal(hasLoggedBlocks(out.blocks), false);
  const saved = fromDraftBlocks(out.blocks);
  assert.deepEqual(saved[1].sets, []);
  assert.equal(saved.some((b) => "plan" in b), false);
});

test("applyRoutine doesn't change the routine it copies from", () => {
  const before = JSON.stringify(legs);
  applyRoutine(sessionForm, legs);
  assert.equal(JSON.stringify(legs), before);
});

test("applyRoutine on a journal form still links the routine's exercises it doesn't have", () => {
  const out = applyRoutine({ title: "", tags: [], text: "", exerciseIds: ["e2"] }, legs);
  assert.deepEqual(out.exerciseIds, ["e2", "e1", "e3"]);
  assert.equal("blocks" in out, false);
});

test("routineFromSession copies the session's blocks and groups as a plan with fresh ids", () => {
  const session = { id: "s1", title: "Leg day", tags: ["legs"], text: "felt strong", blocks: legs.blocks, groups: legs.groups };
  const out = routineFromSession(session);
  assert.equal(out.name, "Leg day");
  assert.deepEqual(out.tags, ["legs"]);
  assert.equal(out.text, "");
  assert.deepEqual(out.blocks.map((b) => [b.exerciseId, b.sets.length, b.note]), [
    ["e1", 2, "pause at bottom"],
    ["e2", 1, undefined],
    ["e3", 0, undefined],
  ]);
  assert.notEqual(out.blocks[0].id, "b1");
  assert.equal(out.blocks[1].groupId, out.groups[0].id);
  assert.notEqual(out.groups[0].id, "g1");
  out.blocks[0].sets[0].weight = 1;
  assert.equal(legs.blocks[0].sets[0].weight, 225);
});
