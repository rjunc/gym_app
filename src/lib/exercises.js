import { linkUsageCounts, entriesByLink } from "./links.js";

// How often each Library exercise appears in sessions, keyed by exercise id
// (see linkUsageCounts). Only sessions count — not journal entries or
// routines — since this is meant to reflect actual training. Feeds the
// Exercises picker's ordering everywhere it appears.
export const exerciseUsageCounts = (sessions, todayISO, days = 30) => linkUsageCounts(sessions, "exerciseIds", todayISO, days);

// Backlinks from Library exercises to the entries (sessions, journals,
// routines…) that link them, newest first (see entriesByLink).
export const entriesByExercise = (entries) => entriesByLink(entries, "exerciseIds");
