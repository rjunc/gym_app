import { shiftISODate } from "./id.js";

// How often each Library exercise appears in sessions, keyed by exercise id:
// `recent` counts sessions from the last `days` days (default 30), `total`
// counts every session ever. Only sessions count — not journal entries or
// routines — since this is meant to reflect actual training. Feeds the
// Exercises picker's ordering everywhere it appears (see compareByUsage).
export function exerciseUsageCounts(sessions, todayISO, days = 30) {
  const cutoff = shiftISODate(todayISO, -days);
  const counts = new Map();
  sessions.forEach((s) => {
    const isRecent = typeof s.date === "string" && s.date >= cutoff;
    (s.exerciseIds || []).forEach((id) => {
      const c = counts.get(id) || { recent: 0, total: 0 };
      counts.set(id, { recent: c.recent + (isRecent ? 1 : 0), total: c.total + 1 });
    });
  });
  return counts;
}

// Sort comparator for exercises given exerciseUsageCounts output: most used in
// the last 30 days first, then most used all-time (so older staples still come
// before never-done exercises), then alphabetical.
export function compareByUsage(usage) {
  const of = (id) => usage.get(id) || { recent: 0, total: 0 };
  return (a, b) => of(b.id).recent - of(a.id).recent || of(b.id).total - of(a.id).total || a.name.localeCompare(b.name);
}

// Backlinks from Library exercises to the entries that link them: a Map of
// exercise id -> the entries (sessions, journals, routines…) whose exerciseIds
// include it. Dated entries come back newest-first so a card can slice off the
// most recent few; undated ones (routines) keep their original order.
export function entriesByExercise(entries) {
  const map = new Map();
  entries.forEach((entry) => {
    (entry.exerciseIds || []).forEach((id) => {
      const list = map.get(id) || [];
      list.push(entry);
      map.set(id, list);
    });
  });
  map.forEach((list) => list.sort((a, b) => (a.date && b.date ? (a.date < b.date ? 1 : a.date > b.date ? -1 : 0) : 0)));
  return map;
}

// One timeline of everything dated that links an exercise — sessions and
// journal entries together, newest first, each tagged with its `kind` so the
// timeline can label it. Ties on the same day list sessions first.
export function exerciseHistory(sessions, journals) {
  return [...sessions.map((entry) => ({ kind: "session", entry })), ...journals.map((entry) => ({ kind: "journal", entry }))].sort(
    (a, b) => (a.entry.date < b.entry.date ? 1 : a.entry.date > b.entry.date ? -1 : a.kind === b.kind ? 0 : a.kind === "session" ? -1 : 1)
  );
}

// The exercise card's one-line usage summary, e.g. "12 sessions · 3 journal
// entries · 2 routines", with the most recent dated use (or null when it's
// never been logged). Empty parts are left out; `text` is "" if it's used
// nowhere.
export function exerciseUsageSummary({ sessions = [], journals = [], routines = [] }) {
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const parts = [];
  if (sessions.length) parts.push(plural(sessions.length, "session", "sessions"));
  if (journals.length) parts.push(plural(journals.length, "journal entry", "journal entries"));
  if (routines.length) parts.push(plural(routines.length, "routine", "routines"));
  const lastDate = [...sessions, ...journals].reduce((latest, e) => (typeof e.date === "string" && e.date > latest ? e.date : latest), "");
  return { text: parts.join(" · "), lastDate: lastDate || null };
}
