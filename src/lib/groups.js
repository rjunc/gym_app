import { uid } from "./id.js";

// Groups of blocks done together, alternating round by round: supersets
// (usually two exercises) and circuits (three or more). A session's blocks
// (see lib/sets.js) stay one exercise each; a block in a group carries its
// `groupId`, and the session lists its groups in `groups`:
//   groups: [{ id, kind: "superset" | "circuit" }]
// A group's blocks always sit next to each other, in the order done, and a
// group always has at least two (see tidyGroups). Within a group, set 1 of
// each exercise is round 1, set 2 is round 2, and so on.
// Everything here works on draft and stored blocks alike (anything with
// `groupId`), returning a new { blocks, groups } and never changing its
// arguments.

export const GROUP_KINDS = { superset: "Superset", circuit: "Circuit" };

// The kind a new or grown group starts as: a superset for two exercises, a
// circuit for more.
export const defaultKind = (size) => (size > 2 ? "circuit" : "superset");

const withoutGroup = (b) => {
  const { groupId: _dropped, ...rest } = b;
  return rest;
};

// Makes blocks and groups agree: a group's blocks must be one unbroken run
// (any stragglers after a gap leave it), a group needs two or more blocks,
// and groups no block uses are dropped. Groups come out in the order their
// blocks appear.
export function tidyGroups(blocks, groups) {
  const known = new Map((groups || []).map((g) => [g.id, g]));
  const seen = new Set();
  let out = (blocks || []).map((b, i, all) => {
    if (!b.groupId || !known.has(b.groupId)) return b.groupId ? withoutGroup(b) : b;
    const continues = i > 0 && all[i - 1].groupId === b.groupId;
    if (!continues && seen.has(b.groupId)) return withoutGroup(b); // a second run of the same group
    seen.add(b.groupId);
    return b;
  });
  const counts = new Map();
  out.forEach((b) => b.groupId && counts.set(b.groupId, (counts.get(b.groupId) || 0) + 1));
  out = out.map((b) => (b.groupId && counts.get(b.groupId) < 2 ? withoutGroup(b) : b));
  const order = [...new Set(out.filter((b) => b.groupId).map((b) => b.groupId))];
  return { blocks: out, groups: order.map((id) => known.get(id)) };
}

// The blocks as the form and the sheets show them: a list of items, each a
// single block or a group of blocks, numbered 1, 2, 3… with a group's blocks
// lettered after its number (2a, 2b). `index` is the block's place in
// `blocks`. Groups are tidied first (see tidyGroups), so a record that breaks
// the rules still lays out sensibly.
//   [{ type: "block", number, label, block, index }
//    | { type: "group", number, group, members: [{ label, block, index }] }]
export function layoutBlocks(blocks, groups) {
  const tidy = tidyGroups(blocks, groups);
  const byId = new Map(tidy.groups.map((g) => [g.id, g]));
  const items = [];
  tidy.blocks.forEach((block, index) => {
    const last = items[items.length - 1];
    const group = block.groupId && byId.get(block.groupId);
    if (group && last && last.type === "group" && last.group.id === group.id) {
      last.members.push({ label: `${last.number}${String.fromCharCode(97 + last.members.length)}`, block, index });
    } else if (group) {
      const number = items.length + 1;
      items.push({ type: "group", number, group, members: [{ label: `${number}a`, block, index }] });
    } else {
      const number = items.length + 1;
      items.push({ type: "block", number, label: String(number), block, index });
    }
  });
  return items;
}

// The range [start, end) of blocks the item holding block `index` covers.
function itemRange(blocks, index) {
  const id = blocks[index].groupId;
  if (!id) return [index, index + 1];
  let start = index;
  let end = index + 1;
  while (start > 0 && blocks[start - 1].groupId === id) start--;
  while (end < blocks.length && blocks[end].groupId === id) end++;
  return [start, end];
}

// Joins the item holding block `index` with the item right after it: two
// single blocks become a new group; a single block joins the neighbouring
// group; two groups merge into the first. A group that grows past two
// becomes a circuit if it was a superset.
export function linkWithNext(blocks, groups, index) {
  const [, end] = itemRange(blocks, index);
  if (end >= blocks.length) return { blocks, groups };
  const [, nextEnd] = itemRange(blocks, end);
  const existing = blocks[index].groupId ? (groups || []).find((g) => g.id === blocks[index].groupId) : null;
  const target = existing || (blocks[end].groupId ? (groups || []).find((g) => g.id === blocks[end].groupId) : null);
  const id = target ? target.id : uid();
  const [start] = itemRange(blocks, index);
  const size = nextEnd - start;
  const nextBlocks = blocks.map((b, i) => (i >= start && i < nextEnd ? { ...b, groupId: id } : b));
  const kind = target ? (target.kind === "superset" && size > 2 ? "circuit" : target.kind) : defaultKind(size);
  const nextGroups = [...(groups || []).filter((g) => g.id !== id), { ...(target || { id }), kind }];
  return tidyGroups(nextBlocks, nextGroups);
}

// Splits a group back into single blocks, in place.
export function ungroup(blocks, groups, groupId) {
  return tidyGroups(
    blocks.map((b) => (b.groupId === groupId ? withoutGroup(b) : b)),
    (groups || []).filter((g) => g.id !== groupId)
  );
}

// Changes a group's kind (superset/circuit).
export const setGroupKind = (groups, groupId, kind) => (groups || []).map((g) => (g.id === groupId ? { ...g, kind } : g));

// Moves block `index` one place (`delta` -1 up, +1 down). A block in a group
// moves only within its group; a single block moves past the whole item next
// to it (so it never lands inside a group). Out of range leaves things as
// they are.
export function moveBlockInLayout(blocks, groups, index, delta) {
  const block = blocks[index];
  if (block.groupId) {
    const to = index + delta;
    if (to < 0 || to >= blocks.length || blocks[to].groupId !== block.groupId) return { blocks, groups };
    const next = [...blocks];
    [next[index], next[to]] = [next[to], next[index]];
    return { blocks: next, groups };
  }
  return moveItem(blocks, groups, index, delta);
}

// Moves the whole item holding block `index` (a single block or a group) one
// item up or down, past the neighbouring item.
export function moveItem(blocks, groups, index, delta) {
  const [start, end] = itemRange(blocks, index);
  if (delta < 0) {
    if (start === 0) return { blocks, groups };
    const [prevStart] = itemRange(blocks, start - 1);
    return { blocks: [...blocks.slice(0, prevStart), ...blocks.slice(start, end), ...blocks.slice(prevStart, start), ...blocks.slice(end)], groups };
  }
  if (end >= blocks.length) return { blocks, groups };
  const [, nextEnd] = itemRange(blocks, end);
  return { blocks: [...blocks.slice(0, start), ...blocks.slice(end, nextEnd), ...blocks.slice(start, end), ...blocks.slice(nextEnd)], groups };
}

// Validates `groups` from an imported file: string id and a known kind
// (superset otherwise). Undefined when `raw` isn't a list, so the field is
// left out.
export function normalizeGroups(raw) {
  if (!Array.isArray(raw)) return undefined;
  return raw
    .filter((g) => g && typeof g === "object" && typeof g.id === "string" && g.id)
    .map((g) => ({ id: g.id, kind: GROUP_KINDS[g.kind] ? g.kind : "superset" }));
}

// A copy of some blocks and their groups with new ids throughout, each
// block's groupId following its group — for bringing a routine's plan into a
// session (or a session's blocks into a new routine) without the two sharing
// ids. `newId` makes each id (uid unless given). Blocks' other fields are
// copied as they are, sets included.
export function withFreshIds(blocks, groups, newId = uid) {
  const groupIds = new Map((groups || []).map((g) => [g.id, newId()]));
  return {
    blocks: (blocks || []).map((b) => {
      const { groupId, ...rest } = b;
      const copy = { ...rest, id: newId(), sets: (b.sets || []).map((s) => ({ ...s })) };
      return groupId && groupIds.has(groupId) ? { ...copy, groupId: groupIds.get(groupId) } : copy;
    }),
    groups: (groups || []).map((g) => ({ ...g, id: groupIds.get(g.id) })),
  };
}
