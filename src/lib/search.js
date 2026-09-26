import { folderPath } from "./folders.js";

// The one text search behind every list page's search box. The query is split
// into words, and each word may be found in any of the item's fields (so
// "squat legs" matches squat in the text plus a "legs" tag). `mode` "all"
// needs every word to be found somewhere; "any" needs just one. Matching is
// case-insensitive and substring-based ("squ" finds "squat").
//
// Quoting keeps words together as one exact phrase: `"back squat" legs` is two
// terms, "back squat" and "legs", so it won't match "back" and "squat" found in
// separate places. Straight and curly quotes both work (iOS types curly ones by
// default), and a quote left open runs to the end of the query, so a phrase
// already behaves as one while it's still being typed.
const QUOTE = `"“”`;
const TERM = new RegExp(`[${QUOTE}]([^${QUOTE}]*)[${QUOTE}]?|([^\\s${QUOTE}]+)`, "g");

export function searchWords(query) {
  const terms = [];
  for (const [, phrase, word] of (query || "").toLowerCase().matchAll(TERM)) {
    const term = phrase !== undefined ? phrase.trim().replace(/\s+/g, " ") : word;
    if (term) terms.push(term);
  }
  return terms;
}

export function matchesSearch(fields, query, mode = "all") {
  const words = searchWords(query);
  if (words.length === 0) return true;
  const haystack = fields
    .flat()
    .filter((v) => typeof v === "string" && v !== "")
    .map((v) => v.toLowerCase());
  const found = (word) => haystack.some((field) => field.includes(word));
  return mode === "any" ? words.some(found) : words.every(found);
}

// Moves the items where any of `textsOf(item)` starts with `query` ahead of
// the rest, keeping each group's existing order. The pickers use it while
// typing, so "leg" puts "legs" ahead of "single-leg" without otherwise
// disturbing their usage (or A–Z) order.
export function prefixMatchesFirst(items, query, textsOf) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return items;
  const starts = (item) => textsOf(item).some((t) => (t || "").toLowerCase().startsWith(q));
  return [...items.filter(starts), ...items.filter((item) => !starts(item))];
}

// Names of the records an item links to through `field` (exerciseIds,
// routineIds), skipping any that have since been deleted.
function linkedNames(item, field, nameById) {
  return (item[field] || []).map((id) => nameById.get(id)).filter(Boolean);
}

// id -> name for Library exercises or routines.
export function nameMap(records) {
  return new Map(records.map((r) => [r.id, r.name]));
}
export const exerciseNameMap = nameMap;

// What's searchable on each kind of item. Dates are deliberately left out —
// the Home calendar covers finding things by date, and number searches like
// "225" shouldn't start matching them.

// Sessions, journals and rolls: the names of linked exercises and of the
// routines an entry was built from are searchable too.
export function entrySearchFields(entry, exerciseNameById, routineNameById = new Map()) {
  return [
    entry.title,
    entry.text,
    entry.tags || [],
    linkedNames(entry, "exerciseIds", exerciseNameById),
    linkedNames(entry, "routineIds", routineNameById),
  ];
}

// Routines and techniques: the item's folder and every folder above it are
// searchable, and so are a technique's from/leads-to positions.
export function folderItemSearchFields(item, folders, exerciseNameById) {
  return [
    item.name,
    item.text,
    item.tags || [],
    folderPath(folders, item.folderId).map((f) => f.name),
    item.position,
    item.toPosition,
    linkedNames(item, "exerciseIds", exerciseNameById),
  ];
}

// Library exercises.
export function exerciseSearchFields(exercise) {
  return [exercise.name, exercise.text, exercise.tags || [], exercise.prescription];
}
