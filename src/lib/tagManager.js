// The Tag manager's helpers: every tag in the app with where it's used, and
// renaming, merging or deleting one everywhere at once. Pure, so testable.
//
// Tags aren't records of their own: each record keeps its tags as plain
// lowercase strings (`tags`), and a tag exists as long as something uses it.
// Goals use tags too, in their rules (`rules[].tags`) and checklist items
// (`items[].tag`), so those are renamed and deleted along with the rest and a
// goal keeps counting what it did.

import { replaceTag, tagLikeness } from "./tags.js";
import { editRecord } from "./records.js";
import { hasCriteria } from "./goals.js";

// Every kind of record that has tags, in the order the manager lists them,
// with what one and several are called.
export const TAG_KINDS = [
  { key: "sessions", one: "session", many: "sessions" },
  { key: "journals", one: "journal", many: "journals" },
  { key: "rolls", one: "mat session", many: "mat sessions" },
  { key: "routines", one: "routine", many: "routines" },
  { key: "exercises", one: "exercise", many: "exercises" },
  { key: "techniques", one: "technique", many: "techniques" },
  { key: "goals", one: "goal", many: "goals" },
];

// The tags one record uses: its `tags`, or for a goal, the tags in its rules
// and checklist items.
export function tagsOf(kind, record) {
  if (kind !== "goals") return record.tags || [];
  const tags = [...(record.rules || []).flatMap((r) => r.tags || []), ...(record.items || []).filter((it) => it.tag).map((it) => it.tag)];
  return [...new Set(tags)];
}

// Every record that has tags of its own, for suggesting tags across the app
// (goals only refer to tags, so they're left out).
export const taggedRecords = (log) => TAG_KINDS.filter((k) => k.key !== "goals").flatMap((k) => log[k.key] || []);

// Every tag in `log` (an object of record lists by kind, like LogContext) as
// [{ tag, total, counts: { kind: n } }], most used first, ties A–Z. A record
// counts once per tag.
export function tagInventory(log) {
  const byTag = new Map();
  TAG_KINDS.forEach(({ key }) =>
    (log[key] || []).forEach((record) =>
      tagsOf(key, record).forEach((tag) => {
        const entry = byTag.get(tag) || { tag, total: 0, counts: {} };
        entry.total += 1;
        entry.counts[key] = (entry.counts[key] || 0) + 1;
        byTag.set(tag, entry);
      })
    )
  );
  return [...byTag.values()].sort((a, b) => b.total - a.total || a.tag.localeCompare(b.tag));
}

// "30 sessions · 4 exercises · 1 goal".
export function usageLabel(counts) {
  return TAG_KINDS.filter((k) => counts[k.key])
    .map((k) => `${counts[k.key]} ${counts[k.key] === 1 ? k.one : k.many}`)
    .join(" · ");
}

// A goal with `from` renamed to `to` (or removed, when `to` is null) in its
// rules and checklist items. A checklist that ends up with the same tag
// twice keeps it once, with the higher of the two targets.
function retagGoal(goal, from, to) {
  const rules = goal.rules && goal.rules.map((r) => ((r.tags || []).includes(from) ? { ...r, tags: replaceTag(r.tags, from, to) } : r));
  let items = goal.items;
  if (items && items.some((it) => it.tag === from)) {
    items = [];
    goal.items.forEach((it) => {
      const tag = it.tag === from ? to : it.tag;
      if (it.tag && !tag) return;
      const same = tag && items.find((x) => x.tag === tag);
      if (same) same.target = Math.max(same.target, it.target);
      else items.push(tag ? { ...it, tag } : it);
    });
  }
  return { ...goal, ...(rules ? { rules } : {}), ...(items ? { items } : {}) };
}

// `list` (records of `kind`) with the tag `from` renamed to `to` — a merge,
// when `to` is already a tag — or deleted, when `to` is null. Only the
// records that had `from` are edited (with updatedAt bumped); the rest stay
// the very same objects, so only those are written.
export function retagRecords(kind, list, from, to) {
  return list.map((record) => {
    if (!tagsOf(kind, record).includes(from)) return record;
    const fields = kind === "goals" ? retagGoal(record, from, to) : { tags: replaceTag(record.tags, from, to) };
    return editRecord(record, fields);
  });
}

// The goals that deleting `tag` would leave with nothing to count (an "Any
// of" rule or a checklist item), to warn about before deleting it.
export function goalsEmptiedBy(goals, tag) {
  return goals.filter((g) => tagsOf("goals", g).includes(tag) && hasCriteria(g) && !hasCriteria(retagGoal(g, tag, null)));
}

// Pairs of tags in `inventory` (tagInventory output) that look like the same
// thing typed two ways (see tagLikeness), as [{ from, to }]: merge the less
// used `from` into the more used `to`. Most alike first.
export function possibleDuplicates(inventory) {
  const pairs = [];
  inventory.forEach((a, i) =>
    inventory.slice(i + 1).forEach((b) => {
      const likeness = tagLikeness(a.tag, b.tag);
      // `inventory` is most used first, so `a` is the one to keep.
      if (likeness !== null) pairs.push({ from: b, to: a, likeness });
    })
  );
  return pairs.sort((x, y) => x.likeness - y.likeness || y.to.total - x.to.total);
}

// A dismissed pair's key, the same whichever way round: "leg|legs".
export const pairKey = (a, b) => [a, b].sort().join("|");
