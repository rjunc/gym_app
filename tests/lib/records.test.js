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

test("editRecord on a record from before timestamps adds updatedAt but never invents createdAt", () => {
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
