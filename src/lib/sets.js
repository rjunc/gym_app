import { uid } from "./id.js";

// What was done in a session, in order, alongside its free text.
//
// Stored on a session as `blocks`: one block per exercise done at one point
// in the session, in the order they were done. The same exercise can appear
// in more than one block (squats first, then back-off squats at the end).
//   { id, exerciseId, sets: [...], note?: "last set AMRAP" }
// `sets` is a list of set objects holding only the fields that apply:
//   { reps: 5, weight: 225, weightUnit: "lb" }    weight × reps
//   { reps: 12 }                                  reps only (bodyweight)
//   { seconds: 60 }                               time (holds, planks)
//   { distance: 3.1, distanceUnit: "mi", seconds: 1680 }   distance, time optional
//   { weight: 50, weightUnit: "lb", seconds: 60 }  weight × time (loaded holds)
//   { weight: 50, weightUnit: "lb", distance: 40, distanceUnit: "m" }  carries, sleds
//   { reps: 20, seconds: 60 }                     reps × time (max reps in 1:00)
//   { seconds: 1200, level: 7 }                   time @ level (stairmaster, bike)
// A set with `drop: true` follows straight on from the set before it, with no
// rest (a dropset, or rest-pause/cluster reps at the same weight).
// A block in a superset or circuit also carries `groupId` (see lib/groups.js).
// A block with no sets is just "did it, no numbers". `note` is what the
// numbers can't say, shown next to them and on the next session's "Last"
// line. The session's `exerciseIds` is kept as the distinct exercises of its
// blocks, in first-done order (see blockExerciseIds), which is what links,
// usage counts and search go by.
// `level` is a machine's own unitless setting, so it only means something
// next to other sets of the same exercise.
// Units are saved on every set that has a weight or distance, so changing the
// app's unit later can't reinterpret old numbers. Distance can be in any of
// DISTANCE_UNITS, picked per block while logging. Time is always saved in
// seconds; `timeUnit` ("min" or "sec") only records how it was typed, so a
// plain "20" means what it meant then and the next session starts the same
// way. Sets logged before it existed have none and were typed as seconds.

export const WEIGHT_UNIT = "lb";
export const DISTANCE_UNIT = "mi"; // for an exercise never logged with a distance
export const DISTANCE_UNITS = ["mi", "km", "m", "yd"];
export const TIME_UNITS = ["min", "sec"];

// How a never-logged exercise's time is typed: minutes for cardio (a run, a
// stairmaster), seconds for holds and short efforts.
export const defaultTimeUnit = (measure) => (measure === "distance" || measure === "time_level" ? "min" : "sec");

// The ways a set can be measured, each deciding the inputs a set row shows.
// An exercise doesn't own one: it's picked on the session, per block, and
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

// Stored sets -> the form's editable rows: the same shape, with every value
// as the string its text box shows (see draftDuration for time).
export function toDraftRows(sets) {
  return (sets || []).map((set) => {
    const row = {};
    SET_FIELDS.forEach((field) => {
      if (typeof set[field] === "number") row[field] = field === "seconds" ? draftDuration(set[field], set.timeUnit) : String(set[field]);
    });
    if (typeof set.distance === "number") row.distanceUnit = set.distanceUnit || DISTANCE_UNIT;
    if (typeof set.seconds === "number" && TIME_UNITS.includes(set.timeUnit)) row.timeUnit = set.timeUnit;
    if (set.drop === true) row.drop = true;
    return row;
  });
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
  if (Object.keys(set).length === 0) return null;
  if (row.drop === true) set.drop = true;
  return set;
}

// Draft rows -> the sets saved: only rows with at least one usable number.
// Weight is saved in WEIGHT_UNIT; distance in the row's `distanceUnit`
// (DISTANCE_UNIT if it has none); time in seconds, read in the row's
// `timeUnit`.
export const fromDraftRows = (rows) => (rows || []).map(toStoredSet).filter(Boolean);

// A session's blocks, or [] (journals and older records have none).
export const blocksOf = (entry) => (entry && Array.isArray(entry.blocks) ? entry.blocks : []);

// Stored blocks -> the form's draft: { key, exerciseId, rows, note, groupId? }.
// `key` is the block's id, or a fresh one with `fresh` (a redo starts new
// blocks).
export const toDraftBlocks = (blocks, { fresh = false } = {}) =>
  (blocks || []).map((b) => ({
    key: fresh || !b.id ? uid() : b.id,
    exerciseId: b.exerciseId,
    rows: toDraftRows(b.sets),
    note: b.note || "",
    ...(b.groupId ? { groupId: b.groupId } : {}),
  }));

// A draft block for an exercise just added to the form.
export const newDraftBlock = (exerciseId) => ({ key: uid(), exerciseId, rows: [], note: "" });

// The form's draft blocks -> what's saved, in order: every block (one with
// no sets still says the exercise was done), its usable sets, and its note
// trimmed to one line, left out when blank.
export const fromDraftBlocks = (draft) =>
  (draft || []).map((b) => {
    const note = typeof b.note === "string" ? b.note.replace(/\s+/g, " ").trim() : "";
    return { id: b.key, exerciseId: b.exerciseId, sets: fromDraftRows(b.rows), ...(note ? { note } : {}), ...(b.groupId ? { groupId: b.groupId } : {}) };
  });

// The distinct exercises of some blocks, in first-done order — a session's
// exerciseIds.
export const blockExerciseIds = (blocks) => [...new Set((blocks || []).map((b) => b.exerciseId))];

// Whether a draft has anything worth saving besides the text: a set or a
// note in any block (a session may be saved with no text).
export const hasLoggedBlocks = (draft) => fromDraftBlocks(draft).some((b) => b.sets.length > 0 || b.note);

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
// block). Typed times are kept as typed, so a "20" entered
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

// The most recent other session that logged `exerciseId` with sets or a note,
// on or before `onOrBefore` (the date being logged), as { date, blocks } —
// that exercise's blocks in it, in order — or null. Same-day ties go to the
// one created last.
export function lastBlocksFor(sessions, exerciseId, { excludeId, onOrBefore } = {}) {
  let best = null;
  sessions.forEach((s) => {
    const blocks = blocksOf(s).filter((b) => b.exerciseId === exerciseId && ((b.sets || []).length > 0 || b.note));
    if (blocks.length === 0 || s.id === excludeId) return;
    if (onOrBefore && s.date > onOrBefore) return;
    const key = `${s.date}|${s.createdAt || ""}`;
    if (!best || key > best.key) best = { key, date: s.date, blocks };
  });
  return best && { date: best.date, blocks: best.blocks };
}

// Of last time's blocks for an exercise, the one to compare the `occurrence`th
// (0-based) block of it with now: the same occurrence if there was one, else
// the last. So a second round of squats lines up with last session's second.
export const matchingBlock = (lastBlocks, occurrence) => (lastBlocks.length === 0 ? null : lastBlocks[Math.min(occurrence, lastBlocks.length - 1)]);

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
const sameChain = (a, b) => a.length === b.length && a.every((set, i) => sameSet(set, b[i]));

// Sets split into chains: each set followed by the drop sets that carry
// straight on from it.
export function dropChains(sets) {
  const chains = [];
  (sets || []).forEach((set) => {
    if (set.drop && chains.length > 0) chains[chains.length - 1].push(set);
    else chains.push([set]);
  });
  return chains;
}

// A list of sets as one line, with runs of identical sets grouped:
// "3×5 @ 225 lb, 225 lb × 4" or "3×10" or "2 × 1:00". A dropset reads as one
// chain — "185 lb × 8 → 155 lb × 6 → 125 lb × 5" — and identical chains
// group the same way ("2 × (…)").
export function formatSets(sets) {
  const groups = [];
  dropChains(sets).forEach((chain) => {
    const last = groups[groups.length - 1];
    if (last && sameChain(last.chain, chain)) last.count++;
    else groups.push({ chain, count: 1 });
  });
  return groups
    .map(({ chain, count }) => {
      if (chain.length > 1) {
        const text = chain.map(formatSet).join(" → ");
        return count === 1 ? text : `${count} × (${text})`;
      }
      const set = chain[0];
      if (count === 1) return formatSet(set);
      const onlyReps = typeof set.reps === "number" && SET_FIELDS.every((f) => f === "reps" || f === "weight" || typeof set[f] !== "number");
      if (onlyReps && typeof set.weight === "number") return `${count}×${set.reps} @ ${trimNumber(set.weight)} ${set.weightUnit || WEIGHT_UNIT}`;
      if (onlyReps) return `${count}×${set.reps}`;
      return `${count} × ${formatSet(set)}`;
    })
    .join(", ");
}

// Validates one block's `sets` from an imported file: plain objects only, and
// within each set only positive numeric fields plus string units.
function normalizeSetList(list) {
  return (Array.isArray(list) ? list : [])
    .filter((s) => s && typeof s === "object")
    .map((s) => {
      const set = {};
      SET_FIELDS.forEach((f) => {
        if (typeof s[f] === "number" && s[f] > 0) set[f] = s[f];
      });
      if ("weight" in set) set.weightUnit = typeof s.weightUnit === "string" ? s.weightUnit : WEIGHT_UNIT;
      if ("distance" in set) set.distanceUnit = typeof s.distanceUnit === "string" ? s.distanceUnit : DISTANCE_UNIT;
      if ("seconds" in set && TIME_UNITS.includes(s.timeUnit)) set.timeUnit = s.timeUnit;
      if (Object.keys(set).length > 0 && s.drop === true) set.drop = true;
      return set;
    })
    .filter((s) => Object.keys(s).length > 0);
}

// Validates `blocks` from an imported file: blocks need a string exerciseId;
// each gets an id if it has none, its sets validated and its note trimmed.
// Returns undefined when `raw` isn't a list at all, so the field is left out.
export function normalizeBlocks(raw) {
  if (!Array.isArray(raw)) return undefined;
  return raw
    .filter((b) => b && typeof b === "object" && typeof b.exerciseId === "string" && b.exerciseId)
    .map((b) => {
      const note = typeof b.note === "string" ? b.note.trim() : "";
      return {
        id: typeof b.id === "string" && b.id ? b.id : uid(),
        exerciseId: b.exerciseId,
        sets: normalizeSetList(b.sets),
        ...(note ? { note } : {}),
        ...(typeof b.groupId === "string" && b.groupId ? { groupId: b.groupId } : {}),
      };
    });
}
