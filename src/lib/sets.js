// Logged sets on a session: numbers per exercise, alongside the free text.
//
// Stored on a session as `sets`, keyed by Library exercise id, each an array
// of set objects holding only the fields that apply:
//   { reps: 5, weight: 225, weightUnit: "lb" }    weight × reps
//   { reps: 12 }                                  reps only (bodyweight)
//   { seconds: 60 }                               time (holds, planks)
//   { distance: 3.1, distanceUnit: "mi", seconds: 1680 }   distance, time optional
// Units are saved on every set that has a weight or distance, so changing the
// app's unit later can't reinterpret old numbers. Sets are optional: an
// exercise in exerciseIds with no entry here is just "did it, no numbers".

export const WEIGHT_UNIT = "lb";
export const DISTANCE_UNIT = "mi";

// How a Library exercise is measured, which decides the inputs each set row
// shows. Stored on the exercise as `measure`.
export const MEASURES = {
  weight_reps: { label: "Weight × reps", fields: ["weight", "reps"] },
  reps: { label: "Reps", fields: ["reps"] },
  time: { label: "Time", fields: ["seconds"] },
  distance: { label: "Distance", fields: ["distance", "seconds"] },
};
export const DEFAULT_MEASURE = "weight_reps";
export const measureOf = (exercise) => (exercise && MEASURES[exercise.measure] ? exercise.measure : DEFAULT_MEASURE);

// Every numeric field a set can have, in display/input order.
export const SET_FIELDS = ["weight", "distance", "reps", "seconds"];

// "90" -> 90, "1:30" -> 90, "1:02:05" -> 3725. Blank or unreadable -> null.
export function parseDuration(text) {
  const s = String(text ?? "").trim();
  if (!s) return null;
  const parts = s.split(":");
  if (parts.length > 3 || parts.some((p) => !/^\d+(\.\d+)?$/.test(p))) return null;
  const total = parts.reduce((acc, p) => acc * 60 + Number(p), 0);
  return Number.isFinite(total) && total > 0 ? Math.round(total) : null;
}

// 90 -> "1:30", 3725 -> "1:02:05", 45 -> "0:45".
export function formatDuration(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

// A positive number from a text box, or null. Reps round to whole numbers.
function parseAmount(text, { whole = false } = {}) {
  const s = String(text ?? "").trim();
  if (!/^\d*\.?\d+$/.test(s)) return null;
  const n = Number(s);
  if (!(n > 0)) return null;
  return whole ? Math.round(n) : n;
}

// Stored sets -> the form's editable draft: the same shape, with every value
// as the string its text box shows (time as "m:ss").
export function toDraftSets(sets) {
  const draft = {};
  Object.entries(sets || {}).forEach(([exerciseId, list]) => {
    draft[exerciseId] = (list || []).map((set) => {
      const row = {};
      SET_FIELDS.forEach((field) => {
        if (typeof set[field] === "number") row[field] = field === "seconds" ? formatDuration(set[field]) : String(set[field]);
      });
      return row;
    });
  });
  return draft;
}

// One draft row -> a stored set, or null if nothing in it is a usable number.
function toStoredSet(row) {
  const set = {};
  const weight = parseAmount(row.weight);
  const distance = parseAmount(row.distance);
  const reps = parseAmount(row.reps, { whole: true });
  const seconds = parseDuration(row.seconds);
  if (weight !== null) Object.assign(set, { weight, weightUnit: WEIGHT_UNIT });
  if (distance !== null) Object.assign(set, { distance, distanceUnit: DISTANCE_UNIT });
  if (reps !== null) set.reps = reps;
  if (seconds !== null) set.seconds = seconds;
  return Object.keys(set).length > 0 ? set : null;
}

// The form's draft -> what's saved: only exercises still in `exerciseIds`,
// only rows with at least one usable number, and no empty exercise entries.
// Units come from WEIGHT_UNIT/DISTANCE_UNIT at save time.
export function fromDraftSets(draft, exerciseIds) {
  const out = {};
  (exerciseIds || []).forEach((id) => {
    const rows = ((draft || {})[id] || []).map(toStoredSet).filter(Boolean);
    if (rows.length > 0) out[id] = rows;
  });
  return out;
}

// Whether a draft has any set worth saving (a session may be saved with sets
// and no text).
export const hasLoggedSets = (draft, exerciseIds) => Object.keys(fromDraftSets(draft, exerciseIds)).length > 0;

// An empty draft row for an exercise's measure.
export function blankRow(measure) {
  const row = {};
  (MEASURES[measure] || MEASURES[DEFAULT_MEASURE]).fields.forEach((f) => (row[f] = ""));
  return row;
}

// The inputs a draft row shows: its exercise's measure fields, plus any other
// field the row already has a value in (e.g. logged before the exercise's
// measure was changed), so nothing is ever hidden or silently dropped.
export function rowFields(row, measure) {
  const fields = new Set((MEASURES[measure] || MEASURES[DEFAULT_MEASURE]).fields);
  SET_FIELDS.forEach((f) => {
    if (row && String(row[f] ?? "").trim() !== "") fields.add(f);
  });
  return SET_FIELDS.filter((f) => fields.has(f));
}

// The most recent other session that logged sets for `exerciseId`, on or
// before `onOrBefore` (the date being logged), as { date, sets } — or null.
// Same-day ties go to the one created last.
export function lastSetsFor(sessions, exerciseId, { excludeId, onOrBefore } = {}) {
  let best = null;
  sessions.forEach((s) => {
    const list = s.sets && s.sets[exerciseId];
    if (!list || list.length === 0 || s.id === excludeId) return;
    if (onOrBefore && s.date > onOrBefore) return;
    const key = `${s.date}|${s.createdAt || ""}`;
    if (!best || key > best.key) best = { key, date: s.date, sets: list };
  });
  return best && { date: best.date, sets: best.sets };
}

const trimNumber = (n) => String(Math.round(n * 100) / 100);

// One set as text: "225 lb × 5", "12 reps", "1:00", "3.1 mi in 28:00".
export function formatSet(set) {
  const weight = typeof set.weight === "number" ? `${trimNumber(set.weight)} ${set.weightUnit || WEIGHT_UNIT}` : null;
  const distance = typeof set.distance === "number" ? `${trimNumber(set.distance)} ${set.distanceUnit || DISTANCE_UNIT}` : null;
  const time = typeof set.seconds === "number" ? formatDuration(set.seconds) : null;
  const reps = typeof set.reps === "number" ? set.reps : null;
  const parts = [];
  if (weight && reps !== null) parts.push(`${weight} × ${reps}`);
  else if (weight) parts.push(weight);
  else if (reps !== null) parts.push(`${reps} ${reps === 1 ? "rep" : "reps"}`);
  if (distance) parts.push(distance);
  if (time) parts.push(parts.length > 0 ? `in ${time}` : time);
  return parts.join(" ");
}

const sameSet = (a, b) => SET_FIELDS.every((f) => a[f] === b[f]) && a.weightUnit === b.weightUnit && a.distanceUnit === b.distanceUnit;

// A list of sets as one line, with runs of identical sets grouped:
// "3×5 @ 225 lb, 225 lb × 4" or "3×10" or "2 × 1:00".
export function formatSets(sets) {
  const groups = [];
  (sets || []).forEach((set) => {
    const last = groups[groups.length - 1];
    if (last && sameSet(last.set, set)) last.count++;
    else groups.push({ set, count: 1 });
  });
  return groups
    .map(({ set, count }) => {
      if (count === 1) return formatSet(set);
      const onlyReps = typeof set.reps === "number" && SET_FIELDS.every((f) => f === "reps" || f === "weight" || typeof set[f] !== "number");
      if (onlyReps && typeof set.weight === "number") return `${count}×${set.reps} @ ${trimNumber(set.weight)} ${set.weightUnit || WEIGHT_UNIT}`;
      if (onlyReps) return `${count}×${set.reps}`;
      return `${count} × ${formatSet(set)}`;
    })
    .join(", ");
}

// Validates `sets` from an imported file: keeps only arrays of plain objects,
// and within each set only positive numeric fields plus string units.
// Returns undefined when `raw` isn't an object at all, so the field is left out.
export function normalizeSets(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const out = {};
  Object.entries(raw).forEach(([exerciseId, list]) => {
    if (!Array.isArray(list)) return;
    const clean = list
      .filter((s) => s && typeof s === "object")
      .map((s) => {
        const set = {};
        SET_FIELDS.forEach((f) => {
          if (typeof s[f] === "number" && s[f] > 0) set[f] = s[f];
        });
        if ("weight" in set) set.weightUnit = typeof s.weightUnit === "string" ? s.weightUnit : WEIGHT_UNIT;
        if ("distance" in set) set.distanceUnit = typeof s.distanceUnit === "string" ? s.distanceUnit : DISTANCE_UNIT;
        return set;
      })
      .filter((s) => Object.keys(s).length > 0);
    if (clean.length > 0) out[exerciseId] = clean;
  });
  return out;
}
