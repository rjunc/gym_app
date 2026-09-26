import { linkUsageCounts, entriesByLink, compareByUsage } from "./links.js";
import { matchesSearch, exerciseSearchFields } from "./search.js";
import { matchesTags } from "./activity.js";

// How often each Library exercise appears in sessions, keyed by exercise id
// (see linkUsageCounts). Only sessions count — not journal entries or
// routines — since this is meant to reflect actual training. Feeds the
// Exercises picker's ordering everywhere it appears.
export const exerciseUsageCounts = (sessions, todayISO, days = 30) => linkUsageCounts(sessions, "exerciseIds", todayISO, days);

// Backlinks from Library exercises to the entries (sessions, journals,
// routines…) that link them, newest first (see entriesByLink).
export const entriesByExercise = (entries) => entriesByLink(entries, "exerciseIds");

// What the exercise picker shows: every Library exercise matching the search
// and tag filter (search matches the same fields as the Library page), active
// ones before inactive, then by `usage` (exerciseUsageCounts) — most used
// first — then A–Z.
export function exercisePickerView({ exercises, query = "", tags = [], tagMode = "all", usage = new Map() }) {
  const byUse = compareByUsage(usage);
  return exercises
    .filter((e) => matchesSearch(exerciseSearchFields(e), query) && matchesTags(e.tags, tags, tagMode))
    .sort((a, b) => (a.active === false) - (b.active === false) || byUse(a, b));
}
