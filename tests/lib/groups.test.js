import test from "node:test";
import assert from "node:assert/strict";
import { tidyGroups, layoutBlocks, linkWithNext, ungroup, setGroupKind, moveBlockInLayout, moveItem, normalizeGroups, defaultKind, withFreshIds } from "../../src/lib/groups.js";

// Blocks as just their ids and group, which is all the grouping logic reads.
const b = (id, groupId) => ({ id, ...(groupId ? { groupId } : {}) });
const ids = (blocks) => blocks.map((x) => (x.groupId ? `${x.id}:${x.groupId}` : x.id));

test("tidyGroups drops lone members, stragglers after a gap, and unused or unknown groups", () => {
  const groups = [{ id: "G", kind: "superset" }, { id: "H", kind: "circuit" }, { id: "U", kind: "superset" }];
  const blocks = [b("1", "G"), b("2", "G"), b("3"), b("4", "G"), b("5", "H"), b("6", "X")];
  const out = tidyGroups(blocks, groups);
  assert.deepEqual(ids(out.blocks), ["1:G", "2:G", "3", "4", "5", "6"]);
  assert.deepEqual(out.groups, [{ id: "G", kind: "superset" }]);
});

test("layoutBlocks numbers items and letters a group's blocks", () => {
  const items = layoutBlocks([b("1"), b("2", "G"), b("3", "G"), b("4")], [{ id: "G", kind: "superset" }]);
  assert.deepEqual(
    items.map((it) => (it.type === "block" ? it.label : `${it.number}[${it.members.map((m) => m.label).join(",")}]`)),
    ["1", "2[2a,2b]", "3"]
  );
  assert.deepEqual(items[1].members.map((m) => m.index), [1, 2]);
});

test("linkWithNext makes a superset of two single blocks", () => {
  const out = linkWithNext([b("1"), b("2"), b("3")], [], 0);
  assert.equal(out.groups.length, 1);
  assert.equal(out.groups[0].kind, "superset");
  assert.deepEqual(out.blocks.map((x) => Boolean(x.groupId)), [true, true, false]);
});

test("linkWithNext grows a group, turning a superset into a circuit, and merges two groups", () => {
  const groups = [{ id: "G", kind: "superset" }];
  const grown = linkWithNext([b("1", "G"), b("2", "G"), b("3")], groups, 1);
  assert.deepEqual(ids(grown.blocks), ["1:G", "2:G", "3:G"]);
  assert.deepEqual(grown.groups, [{ id: "G", kind: "circuit" }]);
  const merged = linkWithNext([b("1", "G"), b("2", "G"), b("3", "H"), b("4", "H")], [{ id: "G", kind: "superset" }, { id: "H", kind: "superset" }], 0);
  assert.deepEqual(ids(merged.blocks), ["1:G", "2:G", "3:G", "4:G"]);
  assert.deepEqual(merged.groups, [{ id: "G", kind: "circuit" }]);
  assert.equal(linkWithNext([b("1"), b("2")], [], 1).groups.length, 0);
});

test("a single block linked into the group after it joins that group", () => {
  const out = linkWithNext([b("1"), b("2", "H"), b("3", "H")], [{ id: "H", kind: "superset" }], 0);
  assert.deepEqual(ids(out.blocks), ["1:H", "2:H", "3:H"]);
  assert.deepEqual(out.groups, [{ id: "H", kind: "circuit" }]);
});

test("ungroup splits a group back into single blocks; setGroupKind relabels it", () => {
  const groups = [{ id: "G", kind: "superset" }];
  const out = ungroup([b("1", "G"), b("2", "G")], groups, "G");
  assert.deepEqual(ids(out.blocks), ["1", "2"]);
  assert.deepEqual(out.groups, []);
  assert.deepEqual(setGroupKind(groups, "G", "circuit"), [{ id: "G", kind: "circuit" }]);
});

test("a block in a group moves only within it", () => {
  const groups = [{ id: "G", kind: "superset" }];
  const blocks = [b("1"), b("2", "G"), b("3", "G"), b("4")];
  assert.deepEqual(ids(moveBlockInLayout(blocks, groups, 2, -1).blocks), ["1", "3:G", "2:G", "4"]);
  assert.equal(moveBlockInLayout(blocks, groups, 1, -1).blocks, blocks);
  assert.equal(moveBlockInLayout(blocks, groups, 2, 1).blocks, blocks);
});

test("a single block or a whole group moves past the neighbouring item, never into a group", () => {
  const groups = [{ id: "G", kind: "superset" }];
  const blocks = [b("1"), b("2", "G"), b("3", "G"), b("4")];
  assert.deepEqual(ids(moveBlockInLayout(blocks, groups, 0, 1).blocks), ["2:G", "3:G", "1", "4"]);
  assert.deepEqual(ids(moveBlockInLayout(blocks, groups, 3, -1).blocks), ["1", "4", "2:G", "3:G"]);
  assert.deepEqual(ids(moveItem(blocks, groups, 1, -1).blocks), ["2:G", "3:G", "1", "4"]);
  assert.deepEqual(ids(moveItem(blocks, groups, 2, 1).blocks), ["1", "4", "2:G", "3:G"]);
  assert.equal(moveItem(blocks, groups, 0, -1).blocks, blocks);
  assert.equal(moveItem(blocks, groups, 3, 1).blocks, blocks);
});

test("normalizeGroups keeps groups with an id, defaulting unknown kinds to superset", () => {
  assert.deepEqual(normalizeGroups([{ id: "G", kind: "circuit" }, { id: "H", kind: "tabata" }, { kind: "circuit" }, null]), [
    { id: "G", kind: "circuit" },
    { id: "H", kind: "superset" },
  ]);
  assert.equal(normalizeGroups("nope"), undefined);
  assert.equal(defaultKind(2), "superset");
  assert.equal(defaultKind(3), "circuit");
});

test("withFreshIds copies blocks and groups with new ids, remapping groupIds", () => {
  let n = 0;
  const blocks = [
    { id: "b1", exerciseId: "e1", sets: [{ reps: 5 }] },
    { id: "b2", exerciseId: "e2", sets: [], groupId: "g1", note: "slow" },
    { id: "b3", exerciseId: "e3", sets: [], groupId: "g1" },
  ];
  const out = withFreshIds(blocks, [{ id: "g1", kind: "circuit" }], () => `n${++n}`);
  assert.deepEqual(out.groups, [{ id: "n1", kind: "circuit" }]);
  assert.deepEqual(out.blocks, [
    { id: "n2", exerciseId: "e1", sets: [{ reps: 5 }] },
    { id: "n3", exerciseId: "e2", sets: [], note: "slow", groupId: "n1" },
    { id: "n4", exerciseId: "e3", sets: [], groupId: "n1" },
  ]);
  out.blocks[0].sets[0].reps = 9;
  assert.equal(blocks[0].sets[0].reps, 5);
});

test("withFreshIds tolerates missing blocks and groups", () => {
  assert.deepEqual(withFreshIds(undefined, undefined), { blocks: [], groups: [] });
});
