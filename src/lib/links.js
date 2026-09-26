import { shiftISODate } from "./id.js";

// Helpers for records that other records link to by id — Library exercises
// (via an entry's exerciseIds) and routines (via routineIds). `field` names
// the id list on the linking records, e.g. "exerciseIds".

// How often each linked id appears in `entries`, keyed by id: `recent`
// counts entries from the last `days` days (default 30), `total` counts
// every entry ever. Feeds the pickers' most-used ordering (see
// compareByUsage).
export function linkUsageCounts(entries, field, todayISO, days = 30) {
  const cutoff = shiftISODate(todayISO, -days);
  const counts = new Map();
  entries.forEach((entry) => {
    const isRecent = typeof entry.date === "string" && entry.date >= cutoff;
    new Set(entry[field] || []).forEach((id) => {
      const c = counts.get(id) || { recent: 0, total: 0 };
      counts.set(id, { recent: c.recent + (isRecent ? 1 : 0), total: c.total + 1 });
    });
  });
  return counts;
}

// Sort comparator given linkUsageCounts output: most used in the last 30
// days first, then most used all-time (so older staples still come before
// never-used ones), then alphabetical by `nameOf` (default: item.name).
export function compareByUsage(usage, nameOf = (item) => item.name) {
  const of = (id) => usage.get(id) || { recent: 0, total: 0 };
  return (a, b) => of(b.id).recent - of(a.id).recent || of(b.id).total - of(a.id).total || nameOf(a).localeCompare(nameOf(b));
}

// Backlinks: a Map of linked id -> the entries whose `field` includes it.
// Dated entries come back newest-first so a card can slice off the most
// recent few; undated ones (routines) keep their original order.
export function entriesByLink(entries, field) {
  const map = new Map();
  entries.forEach((entry) => {
    new Set(entry[field] || []).forEach((id) => {
      const list = map.get(id) || [];
      list.push(entry);
      map.set(id, list);
    });
  });
  map.forEach((list) => list.sort((a, b) => (a.date && b.date ? (a.date < b.date ? 1 : a.date > b.date ? -1 : 0) : 0)));
  return map;
}

// One timeline of sessions and journal entries together, newest first, each
// tagged with its `kind` so the timeline can label it. Ties on the same day
// list sessions first.
export function entryHistory(sessions, journals) {
  return [...sessions.map((entry) => ({ kind: "session", entry })), ...journals.map((entry) => ({ kind: "journal", entry }))].sort(
    (a, b) => (a.entry.date < b.entry.date ? 1 : a.entry.date > b.entry.date ? -1 : a.kind === b.kind ? 0 : a.kind === "session" ? -1 : 1)
  );
}

// "12 sessions", "3 journal entries", "2 routines" — one part per kind that
// has any, in that order.
function usageParts({ sessions = [], journals = [], routines = [] }) {
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const parts = [];
  if (sessions.length) parts.push(plural(sessions.length, "session", "sessions"));
  if (journals.length) parts.push(plural(journals.length, "journal entry", "journal entries"));
  if (routines.length) parts.push(plural(routines.length, "routine", "routines"));
  return parts;
}

// A card's one-line usage summary, e.g. "12 sessions · 3 journal entries · 2
// routines", with the most recent dated use (or null when it's never been
// logged). Empty parts are left out; `text` is "" if it's used nowhere.
export function usageSummary(uses) {
  const { sessions = [], journals = [] } = uses;
  const lastDate = [...sessions, ...journals].reduce((latest, e) => (typeof e.date === "string" && e.date > latest ? e.date : latest), "");
  return { text: usageParts(uses).join(" · "), lastDate: lastDate || null };
}

// "8 sessions and 1 journal entry" — the same parts joined for a sentence,
// e.g. a delete warning. "" when nothing uses it.
export function usageList(uses) {
  const parts = usageParts(uses);
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0] || "";
}
