// TEMPORARY — for pilot testing only. Remove this file, the sidebar's "Test
// data" button and its handlers in App.jsx once it's no longer needed.
//
// Builds a believable, fully linked log for trying the app out as someone who
// has been training for months: a Library of exercises in nested folders
// (a couple left at the top level), logged in every way sets can be measured, routines in nested folders with planned sets for
// those exercises, sessions built from those routines' plans (blocks in the order done,
// with sets that progress over time, notes, the odd extra exercise, some
// exercises done twice, supersets and circuits, and dropsets), journal
// entries, BJJ mat sessions (gi or no-gi, drills, rounds with partners and
// how techniques went), and techniques whose positions chain into a flow.
//
// Every record's id starts with DEMO_PREFIX, which is the only way test data
// is told apart from real data: isDemoRecord finds it again so it can be
// removed without touching anything else.

import { uid } from "./id.js";
import { toISO } from "./activity.js";
import { tidyGroups, withFreshIds } from "./groups.js";
import { blockExerciseIds } from "./sets.js";
import { matTechniqueIds } from "./mat.js";

export const DEMO_PREFIX = "demo-";
export const isDemoRecord = (record) => typeof record.id === "string" && record.id.startsWith(DEMO_PREFIX);

const demoId = () => DEMO_PREFIX + uid();
const toISODate = (d) => toISO(d.getFullYear(), d.getMonth(), d.getDate());
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const between = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const chance = (p) => Math.random() < p;
const roundTo = (n, step) => Math.round(n / step) * step;
const stamp = (date, hour = 18) => `${date}T${String(hour).padStart(2, "0")}:${String(between(0, 59)).padStart(2, "0")}:00.000Z`;

// The Library's folders (a path per folder), then each exercise: name, its
// folder (none: the top level), tags, how it's logged, and a starting point
// for its numbers. `level` / `weight` / `reps` / `seconds` / `distance` are where the
// first session starts; later sessions creep up from there.
const EXERCISE_FOLDERS = ["Strength", "Strength/Legs", "Strength/Push", "Strength/Pull", "Strength/Arms", "Core", "Conditioning", "Cardio", "Mobility"];
const EXERCISES = [
  { name: "Back squat", folder: "Strength/Legs", tags: ["strength", "legs"], measure: "weight_reps", weight: 135, reps: 5, prescription: "5x5", text: "Brace before unracking. Knees out." },
  { name: "Front squat", folder: "Strength/Legs", tags: ["strength", "legs"], measure: "weight_reps", weight: 95, reps: 5 },
  { name: "Romanian deadlift", folder: "Strength/Legs", tags: ["strength", "legs", "pull"], measure: "weight_reps", weight: 115, reps: 8, prescription: "3x8" },
  { name: "Deadlift", folder: "Strength", tags: ["strength", "pull"], measure: "weight_reps", weight: 185, reps: 5, text: "Slack out of the bar first." },
  { name: "Bulgarian split squat", folder: "Strength/Legs", tags: ["strength", "legs"], measure: "weight_reps", weight: 25, reps: 10, prescription: "3x10 each side" },
  { name: "Walking lunge", folder: "Strength/Legs", tags: ["legs", "conditioning"], measure: "weight_reps", weight: 20, reps: 12 },
  { name: "Leg press", folder: "Strength/Legs", tags: ["strength", "legs"], measure: "weight_reps", weight: 180, reps: 10 },
  { name: "Bench press", folder: "Strength/Push", tags: ["strength", "push"], measure: "weight_reps", weight: 115, reps: 5, prescription: "5x5", text: "Shoulder blades pinned, feet planted." },
  { name: "Incline dumbbell press", folder: "Strength/Push", tags: ["strength", "push"], measure: "weight_reps", weight: 35, reps: 10 },
  { name: "Overhead press", folder: "Strength/Push", tags: ["strength", "push"], measure: "weight_reps", weight: 75, reps: 5 },
  { name: "Dips", folder: "Strength/Push", tags: ["push"], measure: "reps", reps: 8 },
  { name: "Push-ups", folder: "Strength/Push", tags: ["push", "bodyweight"], measure: "reps", reps: 20 },
  { name: "Pull-ups", folder: "Strength/Pull", tags: ["pull", "bodyweight"], measure: "reps", reps: 6, prescription: "3 x max" },
  { name: "Chin-ups", folder: "Strength/Pull", tags: ["pull", "bodyweight"], measure: "reps", reps: 7 },
  { name: "Barbell row", folder: "Strength/Pull", tags: ["strength", "pull"], measure: "weight_reps", weight: 95, reps: 8 },
  { name: "Lat pulldown", folder: "Strength/Pull", tags: ["pull"], measure: "weight_reps", weight: 100, reps: 10 },
  { name: "Face pull", folder: "Strength/Pull", tags: ["pull", "shoulders"], measure: "weight_reps", weight: 30, reps: 15 },
  { name: "Bicep curl", folder: "Strength/Arms", tags: ["arms"], measure: "weight_reps", weight: 25, reps: 12 },
  { name: "Tricep pushdown", folder: "Strength/Arms", tags: ["arms"], measure: "weight_reps", weight: 40, reps: 12 },
  { name: "Plank", folder: "Core", tags: ["core"], measure: "time", seconds: 45, prescription: "3 x 45s" },
  { name: "Side plank", folder: "Core", tags: ["core"], measure: "time", seconds: 30 },
  { name: "Weighted plank", folder: "Core", tags: ["core"], measure: "weight_time", weight: 25, seconds: 40 },
  { name: "Dead hang", folder: "Strength/Pull", tags: ["pull", "grip"], measure: "time", seconds: 40 },
  { name: "Hanging leg raise", folder: "Core", tags: ["core"], measure: "reps", reps: 10 },
  { name: "Ab wheel", folder: "Core", tags: ["core"], measure: "reps", reps: 8 },
  { name: "Farmer carry", folder: "Conditioning", tags: ["grip", "conditioning"], measure: "weight_distance", weight: 60, distance: 40, distanceUnit: "m" },
  { name: "Sled push", folder: "Conditioning", tags: ["conditioning", "legs"], measure: "weight_distance", weight: 90, distance: 20, distanceUnit: "yd" },
  { name: "Kettlebell swing", folder: "Conditioning", tags: ["conditioning", "legs", "pull"], measure: "weight_reps", weight: 35, reps: 15 },
  { name: "Burpees", folder: "Conditioning", tags: ["conditioning", "bodyweight"], measure: "reps_time", reps: 12, seconds: 60 },
  { name: "Box jump", folder: "Conditioning", tags: ["plyometrics", "legs"], measure: "reps", reps: 8 },
  { name: "Run", folder: "Cardio", tags: ["cardio"], measure: "distance", distance: 2, distanceUnit: "mi", minutesPerUnit: 10 },
  { name: "Row", folder: "Cardio", tags: ["cardio"], measure: "distance", distance: 2000, distanceUnit: "m", minutesPerUnit: 0.0045 },
  { name: "Stairmaster", folder: "Cardio", tags: ["cardio"], measure: "time_level", seconds: 900, level: 6 },
  { name: "Assault bike", folder: "Cardio", tags: ["cardio", "conditioning"], measure: "time_level", seconds: 600, level: 5 },
  { name: "Jump rope", folder: "Cardio", tags: ["cardio"], measure: "time", seconds: 180, timeUnit: "min" },
  { name: "Hip flexor stretch", folder: "Mobility", tags: ["mobility"], measure: "time", seconds: 60 },
  { name: "Cat-cow", folder: "Mobility", tags: ["mobility"], measure: "reps", reps: 10 },
  { name: "World's greatest stretch", folder: "Mobility", tags: ["mobility"], measure: "reps", reps: 5 },
  { name: "Couch stretch", folder: "Mobility", tags: ["mobility"], measure: "time", seconds: 90 },
  { name: "Turkish get-up", tags: ["strength", "core"], measure: "weight_reps", weight: 25, reps: 3, active: false, text: "Slow. Eyes on the bell." },
  { name: "Good morning", tags: [], measure: "weight_reps", weight: 45, reps: 10 },
];

// Routine folders (a path per folder) and routines: which folder, the plan's
// exercises in order (by name, or { name, note, backOff } for a planned note
// or a lighter back-off round of an exercise already done), tags and the
// routine's own text. `groups` are runs of its exercises done as a superset
// or circuit. Each planned exercise gets planned sets (see planSets).
const ROUTINE_FOLDERS = ["Strength", "Strength/Upper", "Strength/Lower", "Conditioning", "Mobility"];
const ROUTINES = [
  { name: "Lower A", folder: "Strength/Lower", tags: ["strength", "legs"], exercises: [{ name: "Back squat", note: "last set AMRAP" }, "Romanian deadlift", "Bulgarian split squat", "Plank"], text: "Squat heavy, RDL moderate. Finish with core." },
  { name: "Lower B", folder: "Strength/Lower", tags: ["strength", "legs"], exercises: ["Deadlift", "Front squat", "Walking lunge", "Hanging leg raise"] },
  { name: "Upper push", folder: "Strength/Upper", tags: ["strength", "push"], exercises: [{ name: "Bench press", note: "pause on the chest" }, "Overhead press", "Incline dumbbell press", "Dips", "Tricep pushdown"], groups: [{ kind: "superset", exercises: ["Dips", "Tricep pushdown"] }], text: "Rest 2–3 min on the big lifts." },
  { name: "Upper pull", folder: "Strength/Upper", tags: ["strength", "pull"], exercises: ["Pull-ups", "Barbell row", "Lat pulldown", "Face pull", "Bicep curl"], groups: [{ kind: "superset", exercises: ["Face pull", "Bicep curl"] }] },
  { name: "Full body", folder: "Strength", tags: ["strength"], exercises: ["Back squat", "Bench press", "Barbell row", "Farmer carry", { name: "Back squat", note: "back-off sets", backOff: true }] },
  { name: "Conditioning circuit", folder: "Conditioning", tags: ["conditioning"], exercises: ["Kettlebell swing", "Burpees", "Sled push", "Farmer carry"], groups: [{ kind: "circuit", exercises: ["Kettlebell swing", "Burpees", "Sled push", "Farmer carry"] }], text: "4 rounds, 90s rest between rounds." },
  { name: "Easy cardio", folder: "Conditioning", tags: ["cardio"], exercises: ["Stairmaster", "Row"] },
  { name: "Long run", folder: "Conditioning", tags: ["cardio"], exercises: ["Run"] },
  { name: "Bike intervals", folder: "Conditioning", tags: ["cardio", "conditioning"], exercises: ["Assault bike", "Jump rope"] },
  { name: "Morning mobility", folder: "Mobility", tags: ["mobility"], exercises: ["Cat-cow", "World's greatest stretch", "Hip flexor stretch", "Plank"] },
  { name: "Hips & back", folder: "Mobility", tags: ["mobility"], exercises: ["Couch stretch", "Hip flexor stretch", "Dead hang"] },
  { name: "Core finisher", folder: null, tags: ["core"], exercises: ["Ab wheel", "Side plank", "Weighted plank"], groups: [{ kind: "circuit", exercises: ["Ab wheel", "Side plank", "Weighted plank"] }] },
];

// The weekly shape sessions follow, cycling through a training block.
const WEEK_PLAN = [["Lower A", "Morning mobility"], ["Upper push"], ["Easy cardio"], ["Lower B", "Core finisher"], ["Upper pull"], ["Long run"], ["Conditioning circuit"], ["Full body"], ["Bike intervals", "Hips & back"]];

const SESSION_NOTES = [
  "Felt strong today, slept 8 hours.",
  "Low energy, kept it light.",
  "Gym was packed, had to swap a couple of things around.",
  "Good session. Rest times were short.",
  "Lower back a little tight, went easy on hinges.",
  "PR day!",
  "Short on time, cut the accessories.",
  "Superset the last two exercises.",
  "",
  "",
  "",
];
const EXERCISE_NOTES = ["last set AMRAP", "go up 5 lb next time", "felt heavy", "paused reps", "left shoulder twinged, stopped early", "grip gave out first", "easy, add a set", "slow tempo", "used the blue band"];
const SESSION_TITLES = ["Leg day", "Push", "Pull", "Cardio", "Deload", "Morning session", "Gym with Sam", "Hotel gym"];

const JOURNAL_TEXTS = [
  "Sleep has been rough this week and it shows in the lifts. Aiming for lights out by 11.",
  "Starting a new block. Focus on squat depth and bench touch point.",
  "Knee feels a lot better after two weeks of mobility work every morning.",
  "Motivation dipped this week. Just showing up counts.",
  "Thinking about signing up for a 10k in the spring.",
  "Ate well all week, weight up 1 lb. Energy great.",
  "Travelling for work, hotel gym only has dumbbells up to 50.",
  "Deload week. Everything felt light and fast by Friday.",
];
const JOURNAL_TAGS = ["sleep", "nutrition", "motivation", "recovery", "goals", "travel"];

// BJJ: technique folders and techniques whose positions link up into a flow.
const JITS_FOLDERS = ["Guard", "Guard/Closed guard", "Guard/Half guard", "Top", "Top/Side control", "Escapes", "Submissions"];
const TECHNIQUES = [
  { name: "Scissor sweep", folder: "Guard/Closed guard", position: "Closed guard", toPosition: "Mount", tags: ["sweep"], starred: true, text: "Break posture first, knee across the belly." },
  { name: "Hip bump sweep", folder: "Guard/Closed guard", position: "Closed guard", toPosition: "Mount", tags: ["sweep"] },
  { name: "Triangle from closed guard", folder: "Submissions", position: "Closed guard", toPosition: "Triangle", tags: ["submission"], starred: true },
  { name: "Armbar from closed guard", folder: "Submissions", position: "Closed guard", toPosition: "Armbar", tags: ["submission"] },
  { name: "Kimura from closed guard", folder: "Submissions", position: "Closed guard", toPosition: "Kimura", tags: ["submission"] },
  { name: "Old school sweep", folder: "Guard/Half guard", position: "Half guard bottom", toPosition: "Side control", tags: ["sweep"] },
  { name: "Knee shield to underhook", folder: "Guard/Half guard", position: "Half guard bottom", toPosition: "Dogfight", tags: ["transition"] },
  { name: "Dogfight to back take", folder: "Guard/Half guard", position: "Dogfight", toPosition: "Back control", tags: ["transition"] },
  { name: "Knee slice pass", folder: "Top", position: "Half guard top", toPosition: "Side control", tags: ["pass"], starred: true },
  { name: "Toreando pass", folder: "Top", position: "Open guard top", toPosition: "Side control", tags: ["pass"], giOnly: true },
  { name: "Knee on belly", folder: "Top/Side control", position: "Side control", toPosition: "Knee on belly", tags: ["transition"] },
  { name: "Mount from side control", folder: "Top/Side control", position: "Side control", toPosition: "Mount", tags: ["transition"] },
  { name: "Americana", folder: "Submissions", position: "Side control", toPosition: "Americana", tags: ["submission"] },
  { name: "Cross collar choke", folder: "Submissions", position: "Mount", toPosition: "Cross collar choke", tags: ["submission"], giOnly: true },
  { name: "Armbar from mount", folder: "Submissions", position: "Mount", toPosition: "Armbar", tags: ["submission"] },
  { name: "Rear naked choke", folder: "Submissions", position: "Back control", toPosition: "Rear naked choke", tags: ["submission"], starred: true },
  { name: "Bow and arrow choke", folder: "Submissions", position: "Back control", toPosition: "Bow and arrow", tags: ["submission"], giOnly: true },
  { name: "Upa escape", folder: "Escapes", position: "Mount bottom", toPosition: "Closed guard", tags: ["escape"] },
  { name: "Elbow-knee escape", folder: "Escapes", position: "Mount bottom", toPosition: "Half guard bottom", tags: ["escape"] },
  { name: "Side control frame and shrimp", folder: "Escapes", position: "Side control bottom", toPosition: "Closed guard", tags: ["escape"] },
  { name: "Mount to back take", folder: "Top", position: "Mount", toPosition: "Back control", tags: ["transition"] },
];
// Mat sessions: notes (a quick log is just one of these), who you roll with,
// and round notes.
const ROLL_TEXTS = [
  "Got stuck under side control a lot. Frames before shrimping.",
  "Hard rounds today. Cardio is getting better.",
  "Worked half guard all class. Dogfight to back take finally clicked.",
  "Lots of takedowns. Shoulder a bit sore.",
  "Light flow rolls, focused on staying calm on the bottom.",
  "Positional sparring from mount, then open rounds.",
  "",
  "",
];
const ROLL_TAGS = ["open mat", "fundamentals", "competition", "drilling"];
const PARTNERS = ["Sam", "Alex", "Jordan", "Priya", "Marco", "Coach Dave", "Lena"];
const ROUND_NOTES = ["good pace", "went light", "stuck in bottom side", "long scramble", "he's a lot bigger", "caught me twice", "felt sharp"];
// How the rounds' techniques go: mostly hits and attempts, sometimes caught.
const RESULT_WEIGHTS = ["hit", "hit", "attempted", "attempted", "attempted", "caught"];

// Builds a folder record per path in `paths` ("A/B" nests B under A), and
// returns them with a path -> id map.
function buildFolders(paths, createdAt) {
  const idByPath = new Map();
  const folders = paths.map((path) => {
    const parts = path.split("/");
    const parentPath = parts.slice(0, -1).join("/");
    const id = demoId();
    idByPath.set(path, id);
    return { id, name: parts[parts.length - 1], parentId: parentPath ? idByPath.get(parentPath) : null, createdAt, updatedAt: createdAt };
  });
  return { folders, idByPath };
}

// Exercises that sometimes end in a dropset.
const DROPSET_EXERCISES = ["Lat pulldown", "Bicep curl", "Tricep pushdown", "Leg press", "Incline dumbbell press"];

// One exercise's sets on a session `progress` of the way (0..1) through the
// log, creeping its numbers up over time.
// `count` fixes how many (a circuit's rounds); machine and cable work
// sometimes ends in a dropset. With `plan`, they're a routine's planned sets
// instead: all the same, no tiring on the last one, no drops.
function setsFor(ex, progress, count = ex.measure === "distance" || ex.measure === "time_level" ? 1 : between(2, 5), { plan = false } = {}) {
  const grow = 1 + progress * 0.3;
  const sets = [];
  for (let i = 0; i < count; i++) {
    const tired = !plan && i >= count - 1 && chance(0.4) ? 1 : 0;
    const fade = plan ? 0 : i;
    switch (ex.measure) {
      case "weight_reps":
        sets.push({ weight: roundTo(ex.weight * grow, 5) || 5, weightUnit: "lb", reps: Math.max(1, ex.reps - tired) });
        break;
      case "reps":
        sets.push({ reps: Math.max(1, Math.round(ex.reps * grow) - tired - fade) });
        break;
      case "time":
        sets.push({ seconds: roundTo(ex.seconds * grow, 5), timeUnit: ex.timeUnit || "sec" });
        break;
      case "weight_time":
        sets.push({ weight: roundTo(ex.weight * grow, 5), weightUnit: "lb", seconds: roundTo(ex.seconds, 5), timeUnit: "sec" });
        break;
      case "weight_distance":
        sets.push({ weight: roundTo(ex.weight * grow, 5), weightUnit: "lb", distance: ex.distance, distanceUnit: ex.distanceUnit });
        break;
      case "reps_time":
        sets.push({ reps: Math.round(ex.reps * grow) - tired, seconds: ex.seconds, timeUnit: "sec" });
        break;
      case "distance": {
        const distance = ex.distanceUnit === "m" ? roundTo(ex.distance * (1 + progress * 0.25), 250) : Math.round(ex.distance * (1 + progress) * 10) / 10;
        const seconds = Math.round(distance * ex.minutesPerUnit * (1 - progress * 0.1) * 60);
        sets.push({ distance, distanceUnit: ex.distanceUnit, seconds, timeUnit: "min" });
        break;
      }
      case "time_level":
        sets.push({ seconds: roundTo(ex.seconds * grow, 60), timeUnit: "min", level: Math.round(ex.level + progress * 3) });
        break;
    }
  }
  if (!plan && DROPSET_EXERCISES.includes(ex.name) && sets.length > 0 && chance(0.4)) {
    let last = sets[sets.length - 1];
    for (let d = between(1, 2); d > 0 && last.weight > 10; d--) {
      last = { ...last, weight: roundTo(last.weight * 0.75, 5), reps: Math.max(3, last.reps - between(0, 2)), drop: true };
      sets.push(last);
    }
  }
  return sets;
}

// How many sets a routine plans for an exercise: one for cardio, the group's
// rounds in a superset/circuit, 5 for a "5x5" lift, otherwise 3.
function plannedCount(ex, rounds) {
  if (ex.measure === "distance" || ex.measure === "time_level") return 1;
  if (rounds) return rounds;
  return ex.prescription === "5x5" ? 5 : 3;
}

// A back-off round: the same sets, lighter.
const backOffSets = (sets) => sets.slice(0, 2).map((set) => (set.weight ? { ...set, weight: roundTo(set.weight * 0.8, 5) || 5 } : set));

// Everything, as { exercises, exerciseFolders, folders, routines, sessions,
// journals, rolls, jitsFolders, techniques }, with sessions and the rest spread over the
// `months` before `today` (a Date).
export function generateDemoData(today = new Date(), months = 9) {
  const start = new Date(today);
  start.setMonth(start.getMonth() - months);
  const startDate = toISODate(start);
  const setupStamp = stamp(startDate, 8);

  const { folders: exerciseFolders, idByPath: exerciseFolderIdByPath } = buildFolders(EXERCISE_FOLDERS, setupStamp);
  const exercises = EXERCISES.map((ex) => ({
    id: demoId(),
    name: ex.name,
    folderId: ex.folder ? exerciseFolderIdByPath.get(ex.folder) : null,
    tags: ex.tags,
    text: ex.text || "",
    prescription: ex.prescription || "",
    active: ex.active !== false,
    createdAt: setupStamp,
    updatedAt: setupStamp,
  }));
  const exerciseByName = new Map(EXERCISES.map((ex, i) => [ex.name, { ...ex, id: exercises[i].id }]));

  const { folders, idByPath: folderIdByPath } = buildFolders(ROUTINE_FOLDERS, setupStamp);
  // Each routine's plan: a block per planned exercise, with planned sets
  // about halfway along the numbers the sessions progress through, so early
  // sessions fall short of it and later ones beat it.
  const routines = ROUTINES.map((r) => {
    const groups = (r.groups || []).map((g) => ({ id: demoId(), kind: g.kind, exercises: g.exercises, rounds: g.kind === "circuit" ? 4 : 3 }));
    const blocks = r.exercises.map((entry) => {
      const { name, note, backOff } = typeof entry === "string" ? { name: entry } : entry;
      const ex = exerciseByName.get(name);
      const group = !backOff && groups.find((g) => g.exercises.includes(name));
      const sets = setsFor(ex, 0.5, plannedCount(ex, group && group.rounds), { plan: true });
      return { id: demoId(), exerciseId: ex.id, sets: backOff ? backOffSets(sets) : sets, ...(note ? { note } : {}), ...(group ? { groupId: group.id } : {}) };
    });
    const tidy = tidyGroups(blocks, groups.map(({ id, kind }) => ({ id, kind })));
    return {
      id: demoId(),
      name: r.name,
      folderId: r.folder ? folderIdByPath.get(r.folder) : null,
      tags: r.tags,
      text: r.text || "",
      exerciseIds: blockExerciseIds(tidy.blocks),
      blocks: tidy.blocks,
      groups: tidy.groups,
      createdAt: setupStamp,
      updatedAt: setupStamp,
    };
  });
  const routineByName = new Map(ROUTINES.map((r, i) => [r.name, routines[i]]));
  const exerciseById = new Map([...exerciseByName.values()].map((ex) => [ex.id, ex]));

  const { folders: jitsFolders, idByPath: jitsFolderIdByPath } = buildFolders(JITS_FOLDERS, setupStamp);
  const techniques = TECHNIQUES.map((t) => ({
    id: demoId(),
    name: t.name,
    folderId: jitsFolderIdByPath.get(t.folder) || null,
    tags: t.tags,
    text: t.text || "",
    position: t.position,
    toPosition: t.toPosition,
    giOnly: !!t.giOnly,
    starred: !!t.starred,
    createdAt: setupStamp,
    updatedAt: setupStamp,
  }));

  // Sessions: most days following WEEK_PLAN, with rest days, the odd missed
  // week, a sometimes-added extra exercise, and some linked but not logged.
  const sessions = [];
  const journals = [];
  const rolls = [];
  const totalDays = Math.round((today - start) / 86400000);
  let planIndex = 0;
  for (let d = 0; d <= totalDays; d++) {
    const day = new Date(start);
    day.setDate(day.getDate() + d);
    const date = toISODate(day);
    const progress = d / totalDays;
    const weekday = day.getDay();

    if (weekday !== 0 && chance(0.62)) {
      const plan = WEEK_PLAN[planIndex++ % WEEK_PLAN.length];
      const used = plan.map((name) => routineByName.get(name));
      // The routines' plans copied in one after the other, the way adding
      // them to a session does (see applyRoutine), then logged: numbers
      // progressing over time, the planned number of sets (a circuit's
      // rounds) most of the time, the odd exercise with nothing logged, the
      // routine's notes kept or one of the day's instead. Supersets and
      // circuits are sometimes done straight instead.
      const copied = used.map((r) => withFreshIds(r.blocks, r.groups, demoId));
      const straight = new Set(copied.flatMap((c) => c.groups).filter(() => chance(0.15)).map((g) => g.id));
      const blocks = copied
        .flatMap((c) => c.blocks)
        .map((b) => {
          const ex = exerciseById.get(b.exerciseId);
          const grouped = b.groupId && !straight.has(b.groupId);
          const planned = b.sets.length;
          const count = grouped || chance(0.7) ? planned : undefined;
          let sets = grouped || chance(0.88) ? setsFor(ex, progress, count || undefined) : [];
          if (b.note === "back-off sets") sets = backOffSets(setsFor(ex, progress * 0.5, 2));
          const note = b.note || (chance(0.12) ? pick(EXERCISE_NOTES) : "");
          return { id: b.id, exerciseId: b.exerciseId, sets, ...(note ? { note } : {}), ...(grouped ? { groupId: b.groupId } : {}) };
        });
      // Now and then, an extra exercise not in the plan.
      if (chance(0.25)) {
        const extra = exerciseByName.get(pick(EXERCISES.filter((e) => e.active !== false)).name);
        blocks.push({ id: demoId(), exerciseId: extra.id, sets: setsFor(extra, progress) });
      }
      const tidy = tidyGroups(blocks, copied.flatMap((c) => c.groups));
      const text = pick(SESSION_NOTES);
      sessions.push({
        id: demoId(),
        date,
        title: chance(0.2) ? pick(SESSION_TITLES) : "",
        tags: [...new Set([...used.flatMap((r) => r.tags), ...(chance(0.1) ? ["deload"] : [])])],
        text,
        exerciseIds: blockExerciseIds(tidy.blocks),
        routineIds: used.map((r) => r.id),
        blocks: tidy.blocks,
        groups: tidy.groups,
        createdAt: stamp(date, between(6, 20)),
        updatedAt: stamp(date, 21),
      });
    }

    if (chance(0.09)) {
      const linked = chance(0.4) ? [pick(EXERCISES).name] : [];
      journals.push({
        id: demoId(),
        date,
        title: "",
        tags: [pick(JOURNAL_TAGS), ...(chance(0.3) ? [pick(JOURNAL_TAGS)] : [])].filter((t, i, all) => all.indexOf(t) === i),
        text: pick(JOURNAL_TEXTS),
        exerciseIds: linked.map((name) => exerciseByName.get(name).id),
        routineIds: chance(0.2) ? [pick(routines).id] : [],
        createdAt: stamp(date, 22),
        updatedAt: stamp(date, 22),
      });
    }

    if ((weekday === 2 || weekday === 4 || weekday === 6) && chance(0.55)) {
      const tags = chance(0.6) ? [pick(ROLL_TAGS)] : [];
      // Now and then just a quick note; otherwise gi or no-gi, a couple of
      // drills, and some rounds with partners and how techniques went.
      const quick = chance(0.2);
      const gi = chance(0.6) ? "gi" : "no-gi";
      const usable = techniques.filter((t) => gi === "gi" || !t.giOnly);
      const drilledIds = quick ? [] : [...new Set([pick(usable).id, ...(chance(0.6) ? [pick(usable).id] : [])])];
      const rounds = quick
        ? []
        : Array.from({ length: between(3, 6) }, () => {
            const partner = chance(0.85) ? pick(PARTNERS) : "";
            const note = chance(0.2) ? pick(ROUND_NOTES) : "";
            // Most rounds go the distance; some restart after a tap, once or
            // twice.
            const parts = Array.from({ length: chance(0.7) ? 1 : between(2, 3) }, () => {
              const ids = [...new Set(Array.from({ length: between(0, 3) }, () => pick(usable).id))];
              return { id: demoId(), techniques: ids.map((techniqueId) => ({ techniqueId, result: pick(RESULT_WEIGHTS) })) };
            });
            return { id: demoId(), ...(partner ? { partner } : {}), ...(note ? { note } : {}), parts };
          });
      const text = pick(ROLL_TEXTS) || (quick ? "Open mat, rolled a bunch." : "");
      rolls.push({
        id: demoId(),
        date,
        title: chance(0.15) ? "Open mat" : "",
        tags,
        text,
        ...(quick ? {} : { gi, drilledIds, rounds, techniqueIds: matTechniqueIds({ drilledIds, rounds }) }),
        createdAt: stamp(date, 19),
        updatedAt: stamp(date, 19),
      });
    }
  }

  return { exercises, exerciseFolders, folders, routines, sessions, journals, rolls, jitsFolders, techniques };
}
