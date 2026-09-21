// Pure helpers behind the Home calendar: grouping dated entries by day, tag
// matching, and laying out a month grid. Kept free of React so they're testable.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const pad2 = (n) => String(n).padStart(2, "0");

// `month` is 0-based, matching Date.
export const toISO = (year, month, day) => `${year}-${pad2(month + 1)}-${pad2(day)}`;

// Same rule the list tabs use for their tag filter: "all" means every active
// tag must be on the entry, "any" means at least one. No active tags matches
// everything.
export function matchesTags(entryTags, activeTags, mode) {
  if (activeTags.length === 0) return true;
  const tags = entryTags || [];
  return mode === "any" ? activeTags.some((t) => tags.includes(t)) : activeTags.every((t) => tags.includes(t));
}

// Buckets entries by their ISO date. Entries with a missing or malformed date
// can't be placed on a calendar, so they're skipped.
export function groupByDate(entries) {
  const byDate = new Map();
  entries.forEach((e) => {
    if (typeof e.date !== "string" || !ISO_DATE.test(e.date)) return;
    const bucket = byDate.get(e.date);
    if (bucket) bucket.push(e);
    else byDate.set(e.date, [e]);
  });
  return byDate;
}

// One month as a flat list of cells, padded with nulls so the first day lands
// under the right weekday column. `weekStart` is 0 for Sunday, 1 for Monday.
export function monthCells(year, month, weekStart = 0) {
  const lead = (new Date(year, month, 1).getDay() - weekStart + 7) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array(lead).fill(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push({ day, iso: toISO(year, month, day) });
  return cells;
}

// Shifts a { year, month } pair by `delta` months, rolling the year over.
export function shiftMonth({ year, month }, delta) {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}
