// Tag vocabulary helpers for the tag picker. Pure, so they're testable.
import { shiftISODate } from "./id.js";

// Every tag used by `entries` with how many entries use it, most-used first
// (ties alphabetical). An entry counts once per tag even if it lists it twice.
export function tagCounts(entries) {
  const counts = new Map();
  entries.forEach((e) => new Set(e.tags || []).forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)));
  return Array.from(counts, ([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

// Tag suggestions for the Tags field in every composer, ordered the same way
// as the Exercises picker: most used in the last `days` days (default 30)
// first, then most used all-time, then alphabetical. Entries without a date
// (routines, techniques, Library exercises) never count as recent, so there
// it's simply all-time use. Returns [{ tag, recent, total }].
export function tagUsage(entries, todayISO, days = 30) {
  const cutoff = shiftISODate(todayISO, -days);
  const counts = new Map();
  entries.forEach((e) => {
    const isRecent = typeof e.date === "string" && e.date >= cutoff;
    new Set(e.tags || []).forEach((tag) => {
      const c = counts.get(tag) || { recent: 0, total: 0 };
      counts.set(tag, { recent: c.recent + (isRecent ? 1 : 0), total: c.total + 1 });
    });
  });
  return Array.from(counts, ([tag, c]) => ({ tag, ...c })).sort(
    (a, b) => b.recent - a.recent || b.total - a.total || a.tag.localeCompare(b.tag)
  );
}

// Narrows `counts` (as returned by tagCounts) to tags containing `query`,
// case-insensitively. Tags that *start* with the query come first; within each
// group the incoming most-used-first order is kept. A blank query matches nothing.
export function searchTags(counts, query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const contains = counts.filter((c) => c.tag.toLowerCase().includes(q));
  return [...contains.filter((c) => c.tag.toLowerCase().startsWith(q)), ...contains.filter((c) => !c.tag.toLowerCase().startsWith(q))];
}

// Adds the tags typed into a draft box to `existing`. The draft may hold
// several comma-separated tags ("push, legs"); each is trimmed and lowercased
// like every other tag in the app, and blanks and duplicates are dropped.
export function addTagsFromDraft(existing, draft) {
  const next = [...existing];
  draft.split(",").forEach((raw) => {
    const t = raw.trim().toLowerCase();
    if (t && !next.includes(t)) next.push(t);
  });
  return next;
}
