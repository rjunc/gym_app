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

// Tag suggestions for a composer, shared across the whole app: the tags used
// by `own` (the records of the kind being edited) first, as tagUsage orders
// them, then every other tag used anywhere in `all`, so a tag made on a
// session is offered on an exercise too and the same thing isn't tagged two
// ways. Returns [{ tag, recent, total }].
export function sharedTagUsage(own, all, todayISO, days = 30) {
  const first = tagUsage(own, todayISO, days);
  const seen = new Set(first.map((s) => s.tag));
  return [...first, ...tagUsage(all, todayISO, days).filter((s) => !seen.has(s.tag))];
}

// Edit distance between two strings, counting a swap of neighbouring letters
// as one edit ("pulls" / "plusl" is 1).
function editDistance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

// How alike two different tags are, or null if they aren't: 0 when they only
// differ by spaces or punctuation ("open mat" / "open-mat") or a plural
// ("leg" / "legs", "stretch" / "stretches"), else the number of typos
// between them — 1 for tags of 4+ letters, up to 2 for 8+ ("mobilty" /
// "mobility"). Shorter tags are left alone: "abs" and "arms" are different
// things. Under 6 letters a slip has to be a letter missed, doubled or
// swapped, not a different letter: "sweep" and "sleep", "core" and "cord"
// are different words.
export function tagLikeness(a, b) {
  if (a === b) return null;
  const bare = (s) => s.replace(/[^\p{L}\p{N}]/gu, "");
  const [x, y] = [bare(a), bare(b)];
  if (!x || !y) return null;
  if (x === y || x === `${y}s` || y === `${x}s` || x === `${y}es` || y === `${x}es`) return 0;
  const shorter = Math.min(x.length, y.length);
  const allowed = shorter >= 8 ? 2 : shorter >= 4 ? 1 : 0;
  if (allowed === 0 || Math.abs(x.length - y.length) > allowed) return null;
  const distance = editDistance(x, y);
  if (distance > allowed) return null;
  if (shorter < 6 && x.length === y.length) {
    const diff = [...x].map((c, i) => (c === y[i] ? -1 : i)).filter((i) => i >= 0);
    const swapped = diff.length === 2 && diff[1] === diff[0] + 1 && x[diff[0]] === y[diff[1]] && x[diff[1]] === y[diff[0]];
    if (!swapped) return null;
  }
  return distance;
}

// The existing tags in `vocabulary` (most used first) that look like a slip
// for `draft`, most alike first, then most used: what a "Did you mean?" hint
// offers before a new tag is made. None when `draft` is already a tag.
export function similarTags(draft, vocabulary, limit = 3) {
  const d = draft.trim().toLowerCase();
  if (!d || vocabulary.includes(d)) return [];
  return vocabulary
    .map((tag, i) => ({ tag, i, likeness: tagLikeness(d, tag) }))
    .filter((c) => c.likeness !== null)
    .sort((a, b) => a.likeness - b.likeness || a.i - b.i)
    .slice(0, limit)
    .map((c) => c.tag);
}

// `tags` with `from` replaced by `to` (or removed, when `to` is null), each
// tag kept once and in place: renaming "leg" to "legs" on ["leg", "legs"]
// gives ["legs"].
export function replaceTag(tags, from, to) {
  const out = [];
  (tags || []).forEach((t) => {
    const next = t === from ? to : t;
    if (next && !out.includes(next)) out.push(next);
  });
  return out;
}
