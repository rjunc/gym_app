import { folderPath } from "./folders.js";

// The one text search behind every list page's search box. The query is split
// into words, and each word may be found in any of the item's fields (so
// "squat legs" matches squat in the text plus a "legs" tag). `mode` "all"
// needs every word to be found somewhere; "any" needs just one. Matching is
// case-insensitive and substring-based ("squ" finds "squat").
export function searchWords(query) {
  return (query || "").toLowerCase().split(/\s+/).filter(Boolean);
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

// Names of the Library exercises an item links to, skipping any that have
// since been deleted from the Library.
function exerciseNames(item, exerciseNameById) {
  return (item.exerciseIds || []).map((id) => exerciseNameById.get(id)).filter(Boolean);
}

export function exerciseNameMap(exercises) {
  return new Map(exercises.map((e) => [e.id, e.name]));
}

// What's searchable on each kind of item. Dates are deliberately left out —
// the Home calendar covers finding things by date, and number searches like
// "225" shouldn't start matching them.

// Sessions, journals and rolls.
export function entrySearchFields(entry, exerciseNameById) {
  return [entry.title, entry.text, entry.tags || [], exerciseNames(entry, exerciseNameById)];
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
    exerciseNames(item, exerciseNameById),
  ];
}

// Library exercises.
export function exerciseSearchFields(exercise) {
  return [exercise.name, exercise.text, exercise.tags || [], exercise.prescription];
}
