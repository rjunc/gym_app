// Logged sets on a session: numbers per exercise, alongside the free text.
//
// Stored on a session as `sets`, keyed by Library exercise id, each an array
// of set objects holding only the fields that apply:
//   { reps: 5, weight: 225, weightUnit: "lb" }    weight × reps
//   { reps: 12 }                                  reps only (bodyweight)
//   { seconds: 60 }                               time (holds, planks)
//   { distance: 3.1, distanceUnit: "mi", seconds: 1680 }   distance, time optional
//   { weight: 50, weightUnit: "lb", seconds: 60 }  weight × time (loaded holds)
//   { weight: 50, weightUnit: "lb", distance: 40, distanceUnit: "m" }  carries, sleds
//   { reps: 20, seconds: 60 }                     reps × time (max reps in 1:00)
//   { seconds: 1200, level: 7 }                   time @ level (stairmaster, bike)
// `level` is a machine's own unitless setting, so it only means something
// next to other sets of the same exercise.
// Units are saved on every set that has a weight or distance, so changing the
// app's unit later can't reinterpret old numbers. Distance can be in any of
// DISTANCE_UNITS, picked per exercise while logging. Time is always saved in
// seconds; `timeUnit` ("min" or "sec") only records how it was typed, so a
// plain "20" means what it meant then and the next session starts the same
// way. Sets logged before it existed have none and were typed as seconds.
// Sets are optional: an
// exercise in exerciseIds with no entry here is just "did it, no numbers".

export const WEIGHT_UNIT = "lb";
export const DISTANCE_UNIT = "mi"; // for an exercise never logged with a distance
export const DISTANCE_UNITS = ["mi", "km", "m", "yd"];
export const TIME_UNITS = ["min", "sec"];

// How a never-logged exercise's time is typed: minutes for cardio (a run, a
// stairmaster), seconds for holds and short efforts.
export const defaultTimeUnit = (measure) => (measure === "distance" || measure === "time_level" ? "min" : "sec");

// The ways a set can be measured, each deciding the inputs a set row shows.
// An exercise doesn't own one: it's picked on the session, per exercise, and
// the logged sets themselves record which it was (see measureOfSets), so the
// next session can start from it (see resolveMeasure).
export const MEASURES = {
  weight_reps: { label: "Weight × reps", fields: ["weight", "reps"] },
  reps: { label: "Reps", fields: ["reps"] },
  time: { label: "Time", fields: ["seconds"] },
  distance: { label: "Distance", fields: ["distance", "seconds"] },
  weight_time: { label: "Weight × time", fields: ["weight", "seconds"] },
  weight_distance: { label: "Weight × distance", fields: ["weight", "distance"] },
  reps_time: { label: "Reps × time", fields: ["reps", "seconds"] },
  time_level: { label: "Time @ level", fields: ["seconds", "level"] },
};

// An exercise's `measure`, if it has a valid one, else null. Exercises made
// before the measure moved onto the session still carry one; it's only used
// as a starting point for one that has never been logged.
export const measureOf = (exercise) => (exercise && MEASURES[exercise.measure] ? exercise.measure : null);

const hasValue = (v) => typeof v === "number" || (typeof v === "string" && v.trim() !== "");

// Which measure a list of sets was logged as, read from the fields the first
// set has. For stored sets those are the numbers logged; for draft rows, the
// boxes the row was made with, even while still empty — so half-typing a
// row (weight in, distance not yet) doesn't change what it's logged as.
// Null when there are no sets.
export function measureOfSets(sets) {
  const hasField = (s, f) => s && s[f] !== undefined && s[f] !== null;
  const set = (sets || []).find((s) => SET_FIELDS.some((f) => hasField(s, f)));
  if (!set) return null;
  const has = (f) => hasField(set, f);
  if (has("level")) return "time_level";
  if (has("distance")) return has("weight") ? "weight_distance" : "distance";
  if (has("weight")) return has("seconds") && !has("reps") ? "weight_time" : "weight_reps";
  if (has("reps")) return has("seconds") ? "reps_time" : "reps";
  return "time";
}

// The distance unit / time unit a list of sets was logged in: the first one
// that has one, or null.
const unitOfSets = (key) => (sets) => {
  const set = (sets || []).find((s) => s && typeof s[key] === "string" && s[key]);
  return set ? set[key] : null;
};
export const distanceUnitOfSets = unitOfSets("distanceUnit");
export const timeUnitOfSets = unitOfSets("timeUnit");

// The measure an exercise's set rows use on a session being logged: the one
// picked on this session (`chosen`), else what its rows were logged as, else
// what it was logged as last time (`lastSets`), else the exercise's old
// measure. Null means it's never been logged and nothing was picked yet, so
// the form asks.
export function resolveMeasure({ chosen, rows, lastSets, exercise }) {
  if (MEASURES[chosen]) return chosen;
  return measureOfSets(rows) || measureOfSets(lastSets) || measureOf(exercise);
}

// Draft rows switched to another measure: each row keeps only the new
// measure's fields, carrying over the values they share (reps stay reps when
// going from weight × reps to reps). Rows that gain a distance or time get
// the given `units` ({ distanceUnit, timeUnit }) unless they already had one.
export function switchMeasure(rows, measure, units = {}) {
  return (rows || []).map((row) => {
    const next = blankRow(measure, {
      distanceUnit: row.distanceUnit || units.distanceUnit,
      timeUnit: row.timeUnit || units.timeUnit,
    });
    MEASURES[measure].fields.forEach((f) => (next[f] = row[f] ?? ""));
    return next;
  });
}

// Every numeric field a set can have, in display/input order.
export const SET_FIELDS = ["weight", "distance", "reps", "seconds", "level"];

// "90" -> 90, "1:30" -> 90, "1:02:05" -> 3725. Blank or unreadable -> null.
// With unit "min", a plain number is minutes ("20" -> 1200, "2.5" -> 150);
// anything with a colon reads the same either way.
export function parseDuration(text, unit = "sec") {
  const s = String(text ?? "").trim().replace(",", ".");
  if (!s) return null;
  if (unit === "min" && !s.includes(":")) {
    const minutes = parseAmount(s);
    return minutes === null ? null : Math.round(minutes * 60) || null;
  }
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
// A comma counts as the decimal point, since that's what the iPhone number pad
// shows in some regions.
function parseAmount(text, { whole = false } = {}) {
  const s = String(text ?? "").trim().replace(",", ".");
  if (!/^\d*\.?\d+$/.test(s)) return null;
  const n = Number(s);
  if (!(n > 0)) return null;
  return whole ? Math.round(n) : n;
}

// A stored time as its text box shows it: whole minutes as "20" when typed in
// minutes, under a minute as "45" when typed in seconds (or before time units
// existed — so an old "20" meant as minutes is fixed by switching to min),
// otherwise "m:ss".
function draftDuration(seconds, unit) {
  if (unit === "min" && seconds % 60 === 0) return String(seconds / 60);
  if (unit !== "min" && seconds < 60) return String(seconds);
  return formatDuration(seconds);
}

// Stored sets -> the form's editable draft: the same shape, with every value
// as the string its text box shows (see draftDuration for time).
export function toDraftSets(sets) {
  const draft = {};
  Object.entries(sets || {}).forEach(([exerciseId, list]) => {
    draft[exerciseId] = (list || []).map((set) => {
      const row = {};
      SET_FIELDS.forEach((field) => {
        if (typeof set[field] === "number") row[field] = field === "seconds" ? draftDuration(set[field], set.timeUnit) : String(set[field]);
      });
      if (typeof set.distance === "number") row.distanceUnit = set.distanceUnit || DISTANCE_UNIT;
      if (typeof set.seconds === "number" && TIME_UNITS.includes(set.timeUnit)) row.timeUnit = set.timeUnit;
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
  const seconds = parseDuration(row.seconds, row.timeUnit);
  const level = parseAmount(row.level);
  if (weight !== null) Object.assign(set, { weight, weightUnit: WEIGHT_UNIT });
  if (distance !== null) Object.assign(set, { distance, distanceUnit: row.distanceUnit || DISTANCE_UNIT });
  if (reps !== null) set.reps = reps;
  if (seconds !== null) set.seconds = seconds;
  if (seconds !== null && TIME_UNITS.includes(row.timeUnit)) set.timeUnit = row.timeUnit;
  if (level !== null) set.level = level;
  return Object.keys(set).length > 0 ? set : null;
}

// The form's draft -> what's saved: only exercises still in `exerciseIds`,
// only rows with at least one usable number, and no empty exercise entries.
// Weight is saved in WEIGHT_UNIT; distance in the row's `distanceUnit`
// (DISTANCE_UNIT if it has none); time in seconds, read in the row's
// `timeUnit`.
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

// An empty draft row for a measure, with a distance unit if it has a
// distance and a time unit if it has a time (the measure's default unless
// given).
export function blankRow(measure, { distanceUnit, timeUnit } = {}) {
  const row = {};
  const fields = (MEASURES[measure] || {}).fields || [];
  fields.forEach((f) => (row[f] = ""));
  if (fields.includes("distance")) row.distanceUnit = distanceUnit || DISTANCE_UNIT;
  if (fields.includes("seconds")) row.timeUnit = timeUnit || defaultTimeUnit(measure);
  return row;
}

// Draft rows with every distance / time switched to `unit` (one of each per
// exercise per session). Typed times are kept as typed, so a "20" entered
// under the wrong unit is fixed by switching it.
export const setDistanceUnit = (rows, unit) => (rows || []).map((row) => ("distance" in row ? { ...row, distanceUnit: unit } : row));
export const setTimeUnit = (rows, unit) => (rows || []).map((row) => ("seconds" in row ? { ...row, timeUnit: unit } : row));

// The inputs a draft row shows: its measure's fields, plus any other field the
// row already has a value in (e.g. an old set logged some other way), so
// nothing is ever hidden or silently dropped.
export function rowFields(row, measure) {
  const fields = new Set((MEASURES[measure] || {}).fields || []);
  SET_FIELDS.forEach((f) => {
    if (row && hasValue(row[f])) fields.add(f);
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

// One set as text: "225 lb × 5", "12 reps", "1:00", "3.1 mi in 28:00",
// "50 lb for 1:00", "50 lb × 40 m", "20 reps in 1:00", "20:00 @ level 7".
export function formatSet(set) {
  const weight = typeof set.weight === "number" ? `${trimNumber(set.weight)} ${set.weightUnit || WEIGHT_UNIT}` : null;
  const distance = typeof set.distance === "number" ? `${trimNumber(set.distance)} ${set.distanceUnit || DISTANCE_UNIT}` : null;
  const time = typeof set.seconds === "number" ? formatDuration(set.seconds) : null;
  const reps = typeof set.reps === "number" ? set.reps : null;
  let text = weight || "";
  if (reps !== null) text = text ? `${text} × ${reps}` : `${reps} ${reps === 1 ? "rep" : "reps"}`;
  if (distance) text = text ? `${text} × ${distance}` : distance;
  // A weight held for a time reads "for"; anything done within a time, "in".
  if (time) text = !text ? time : `${text} ${weight && reps === null && !distance ? "for" : "in"} ${time}`;
  if (typeof set.level === "number") text = text ? `${text} @ level ${trimNumber(set.level)}` : `level ${trimNumber(set.level)}`;
  return text;
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
        if ("seconds" in set && TIME_UNITS.includes(s.timeUnit)) set.timeUnit = s.timeUnit;
        return set;
      })
      .filter((s) => Object.keys(s).length > 0);
    if (clean.length > 0) out[exerciseId] = clean;
  });
  return out;
}
