import test from "node:test";
import assert from "node:assert/strict";
import { newRecord, editRecord, editById, importedTimestamps } from "../../src/lib/records.js";

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

test("newRecord gives a fresh id and matching createdAt/updatedAt", () => {
  const r = newRecord({ name: "Push A" });
  assert.equal(r.name, "Push A");
  assert.equal(typeof r.id, "string");
  assert.match(r.createdAt, ISO);
  assert.equal(r.updatedAt, r.createdAt);
  assert.notEqual(newRecord({}).id, r.id);
});

test("editRecord keeps id and createdAt, bumps updatedAt, merges fields", () => {
  const before = { id: "a", name: "Old", text: "keep", createdAt: "2020-01-01T00:00:00.000Z", updatedAt: "2020-01-01T00:00:00.000Z" };
  const after = editRecord(before, { name: "New" });
  assert.equal(after.id, "a");
  assert.equal(after.name, "New");
  assert.equal(after.text, "keep");
  assert.equal(after.createdAt, before.createdAt);
  assert.ok(after.updatedAt > before.updatedAt);
});

test("editRecord on a record without timestamps (e.g. imported) adds updatedAt but never invents createdAt", () => {
  const after = editRecord({ id: "a", name: "Old" }, { name: "New" });
  assert.match(after.updatedAt, ISO);
  assert.equal("createdAt" in after, false);
});

test("editById only touches the matching record", () => {
  const list = [{ id: "a", n: 1 }, { id: "b", n: 2 }];
  const out = editById(list, "b", { n: 3 });
  assert.equal(out[0], list[0]);
  assert.equal(out[1].n, 3);
  assert.match(out[1].updatedAt, ISO);
});

test("importedTimestamps keeps non-empty strings only", () => {
  assert.deepEqual(importedTimestamps({ createdAt: "x", updatedAt: "y" }), { createdAt: "x", updatedAt: "y" });
  assert.deepEqual(importedTimestamps({ createdAt: "", updatedAt: 5 }), {});
  assert.deepEqual(importedTimestamps({}), {});
});

/* ============================== newestFirst / diffRecords ============================== */

import { newestFirst, diffRecords } from "../../src/lib/records.js";

test("newestFirst sorts by createdAt descending, undated records last by id", () => {
  const records = [
    { id: "b" },
    { id: "old", createdAt: "2026-09-01T00:00:00.000Z" },
    { id: "a" },
    { id: "new", createdAt: "2026-09-20T00:00:00.000Z" },
  ];
  assert.deepEqual(newestFirst(records).map((r) => r.id), ["new", "old", "a", "b"]);
  assert.equal(records[0].id, "b", "input isn't mutated");
});

test("diffRecords writes nothing when every record is the synced object", () => {
  const a = { id: "a" };
  const b = { id: "b" };
  assert.deepEqual(diffRecords(new Map([["a", a], ["b", b]]), [b, a]), { upserts: [], deleteIds: [] });
});

test("diffRecords writes new and edited records only, and deletes removed ones", () => {
  const a = { id: "a", n: 1 };
  const b = { id: "b", n: 1 };
  const c = { id: "c", n: 1 };
  const synced = new Map([["a", a], ["b", b], ["c", c]]);
  const editedB = { ...b, n: 2 };
  const d = { id: "d" };
  const { upserts, deleteIds } = diffRecords(synced, [d, a, editedB]);
  assert.deepEqual(upserts, [d, editedB]);
  assert.deepEqual(deleteIds, ["c"]);
});

test("diffRecords against an empty synced map only adds — it can never delete", () => {
  const { upserts, deleteIds } = diffRecords(new Map(), [{ id: "a" }]);
  assert.equal(upserts.length, 1);
  assert.deepEqual(deleteIds, []);
});
