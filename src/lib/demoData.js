// TEMPORARY — for pilot testing only. Remove this file, the sidebar's "Test
// data" button and its handlers in App.jsx once it's no longer needed.
//
// Builds a believable, fully linked log for trying the app out as someone who
// has been training for months: a Library of exercises logged in every way
// sets can be measured, routines in nested folders built from those
// exercises, sessions built from those routines (with sets that progress
// over time, exercise notes, tags and the odd extra exercise), journal
// entries, BJJ rolls, and techniques whose positions chain into a flow.
//
// Every record's id starts with DEMO_PREFIX, which is the only way test data
// is told apart from real data: isDemoRecord finds it again so it can be
// removed without touching anything else.

import { uid } from "./id.js";
import { toISO } from "./activity.js";

export const DEMO_PREFIX = "demo-";
export const isDemoRecord = (record) => typeof record.id === "string" && record.id.startsWith(DEMO_PREFIX);

const demoId = () => DEMO_PREFIX + uid();
const toISODate = (d) => toISO(d.getFullYear(), d.getMonth(), d.getDate());
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const between = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const chance = (p) => Math.random() < p;
const roundTo = (n, step) => Math.round(n / step) * step;
const stamp = (date, hour = 18) => `${date}T${String(hour).padStart(2, "0")}:${String(between(0, 59)).padStart(2, "0")}:00.000Z`;

// The Library: name, tags, how it's logged, and a starting point for its
// numbers. `level` / `weight` / `reps` / `seconds` / `distance` are where the
// first session starts; later sessions creep up from there.
const EXERCISES = [
  { name: "Back squat", tags: ["strength", "legs"], measure: "weight_reps", weight: 135, reps: 5, prescription: "5x5", text: "Brace before unracking. Knees out." },
  { name: "Front squat", tags: ["strength", "legs"], measure: "weight_reps", weight: 95, reps: 5 },
  { name: "Romanian deadlift", tags: ["strength", "legs", "pull"], measure: "weight_reps", weight: 115, reps: 8, prescription: "3x8" },
  { name: "Deadlift", tags: ["strength", "pull"], measure: "weight_reps", weight: 185, reps: 5, text: "Slack out of the bar first." },
  { name: "Bulgarian split squat", tags: ["strength", "legs"], measure: "weight_reps", weight: 25, reps: 10, prescription: "3x10 each side" },
  { name: "Walking lunge", tags: ["legs", "conditioning"], measure: "weight_reps", weight: 20, reps: 12 },
  { name: "Leg press", tags: ["strength", "legs"], measure: "weight_reps", weight: 180, reps: 10 },
  { name: "Bench press", tags: ["strength", "push"], measure: "weight_reps", weight: 115, reps: 5, prescription: "5x5", text: "Shoulder blades pinned, feet planted." },
  { name: "Incline dumbbell press", tags: ["strength", "push"], measure: "weight_reps", weight: 35, reps: 10 },
  { name: "Overhead press", tags: ["strength", "push"], measure: "weight_reps", weight: 75, reps: 5 },
  { name: "Dips", tags: ["push"], measure: "reps", reps: 8 },
  { name: "Push-ups", tags: ["push", "bodyweight"], measure: "reps", reps: 20 },
  { name: "Pull-ups", tags: ["pull", "bodyweight"], measure: "reps", reps: 6, prescription: "3 x max" },
  { name: "Chin-ups", tags: ["pull", "bodyweight"], measure: "reps", reps: 7 },
  { name: "Barbell row", tags: ["strength", "pull"], measure: "weight_reps", weight: 95, reps: 8 },
  { name: "Lat pulldown", tags: ["pull"], measure: "weight_reps", weight: 100, reps: 10 },
  { name: "Face pull", tags: ["pull", "shoulders"], measure: "weight_reps", weight: 30, reps: 15 },
  { name: "Bicep curl", tags: ["arms"], measure: "weight_reps", weight: 25, reps: 12 },
  { name: "Tricep pushdown", tags: ["arms"], measure: "weight_reps", weight: 40, reps: 12 },
  { name: "Plank", tags: ["core"], measure: "time", seconds: 45, prescription: "3 x 45s" },
  { name: "Side plank", tags: ["core"], measure: "time", seconds: 30 },
  { name: "Weighted plank", tags: ["core"], measure: "weight_time", weight: 25, seconds: 40 },
  { name: "Dead hang", tags: ["pull", "grip"], measure: "time", seconds: 40 },
  { name: "Hanging leg raise", tags: ["core"], measure: "reps", reps: 10 },
  { name: "Ab wheel", tags: ["core"], measure: "reps", reps: 8 },
  { name: "Farmer carry", tags: ["grip", "conditioning"], measure: "weight_distance", weight: 60, distance: 40, distanceUnit: "m" },
  { name: "Sled push", tags: ["conditioning", "legs"], measure: "weight_distance", weight: 90, distance: 20, distanceUnit: "yd" },
  { name: "Kettlebell swing", tags: ["conditioning", "legs", "pull"], measure: "weight_reps", weight: 35, reps: 15 },
  { name: "Burpees", tags: ["conditioning", "bodyweight"], measure: "reps_time", reps: 12, seconds: 60 },
  { name: "Box jump", tags: ["plyometrics", "legs"], measure: "reps", reps: 8 },
  { name: "Run", tags: ["cardio"], measure: "distance", distance: 2, distanceUnit: "mi", minutesPerUnit: 10 },
  { name: "Row", tags: ["cardio"], measure: "distance", distance: 2000, distanceUnit: "m", minutesPerUnit: 0.0045 },
  { name: "Stairmaster", tags: ["cardio"], measure: "time_level", seconds: 900, level: 6 },
  { name: "Assault bike", tags: ["cardio", "conditioning"], measure: "time_level", seconds: 600, level: 5 },
  { name: "Jump rope", tags: ["cardio"], measure: "time", seconds: 180, timeUnit: "min" },
  { name: "Hip flexor stretch", tags: ["mobility"], measure: "time", seconds: 60 },
  { name: "Cat-cow", tags: ["mobility"], measure: "reps", reps: 10 },
  { name: "World's greatest stretch", tags: ["mobility"], measure: "reps", reps: 5 },
  { name: "Couch stretch", tags: ["mobility"], measure: "time", seconds: 90 },
  { name: "Turkish get-up", tags: ["strength", "core"], measure: "weight_reps", weight: 25, reps: 3, active: false, text: "Slow. Eyes on the bell." },
  { name: "Good morning", tags: [], measure: "weight_reps", weight: 45, reps: 10 },
];

// Routine folders (a path per folder) and routines: which folder, which
// exercises (by name), tags and the routine's own text.
const ROUTINE_FOLDERS = ["Strength", "Strength/Upper", "Strength/Lower", "Conditioning", "Mobility"];
const ROUTINES = [
  { name: "Lower A", folder: "Strength/Lower", tags: ["strength", "legs"], exercises: ["Back squat", "Romanian deadlift", "Bulgarian split squat", "Plank"], text: "Squat heavy, RDL moderate. Finish with core." },
  { name: "Lower B", folder: "Strength/Lower", tags: ["strength", "legs"], exercises: ["Deadlift", "Front squat", "Walking lunge", "Hanging leg raise"] },
  { name: "Upper push", folder: "Strength/Upper", tags: ["strength", "push"], exercises: ["Bench press", "Overhead press", "Incline dumbbell press", "Dips", "Tricep pushdown"], text: "Rest 2–3 min on the big lifts." },
  { name: "Upper pull", folder: "Strength/Upper", tags: ["strength", "pull"], exercises: ["Pull-ups", "Barbell row", "Lat pulldown", "Face pull", "Bicep curl"] },
  { name: "Full body", folder: "Strength", tags: ["strength"], exercises: ["Back squat", "Bench press", "Barbell row", "Farmer carry"] },
  { name: "Conditioning circuit", folder: "Conditioning", tags: ["conditioning"], exercises: ["Kettlebell swing", "Burpees", "Sled push", "Farmer carry"], text: "4 rounds, 90s rest between rounds." },
  { name: "Easy cardio", folder: "Conditioning", tags: ["cardio"], exercises: ["Stairmaster", "Row"] },
  { name: "Long run", folder: "Conditioning", tags: ["cardio"], exercises: ["Run"] },
  { name: "Bike intervals", folder: "Conditioning", tags: ["cardio", "conditioning"], exercises: ["Assault bike", "Jump rope"] },
  { name: "Morning mobility", folder: "Mobility", tags: ["mobility"], exercises: ["Cat-cow", "World's greatest stretch", "Hip flexor stretch"] },
  { name: "Hips & back", folder: "Mobility", tags: ["mobility"], exercises: ["Couch stretch", "Hip flexor stretch", "Dead hang"] },
  { name: "Core finisher", folder: null, tags: ["core"], exercises: ["Ab wheel", "Side plank", "Weighted plank"] },
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
const ROLL_TEXTS = [
  "Gi class. Drilled scissor sweep to mount, then 5 x 5 min rounds. Got stuck under side control a lot.",
  "No-gi open mat. Hit a knee slice twice, got caught in a triangle once.",
  "Fundamentals: upa escape and elbow-knee. Positional sparring from mount.",
  "Hard rounds today. Cardio is getting better.",
  "Worked half guard all class. Dogfight to back take finally clicked.",
  "Competition class, lots of takedowns. Shoulder a bit sore.",
  "Light flow rolls, focused on staying calm on the bottom.",
];
const ROLL_TAGS = ["gi", "no-gi", "open mat", "fundamentals", "competition"];

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

// One exercise's sets on a session `progress` of the way (0..1) through the
// log, creeping its numbers up over time.
function setsFor(ex, progress) {
  const count = ex.measure === "distance" || ex.measure === "time_level" ? 1 : between(2, 5);
  const grow = 1 + progress * 0.3;
  const sets = [];
  for (let i = 0; i < count; i++) {
    const tired = i >= count - 1 && chance(0.4) ? 1 : 0;
    switch (ex.measure) {
      case "weight_reps":
        sets.push({ weight: roundTo(ex.weight * grow, 5) || 5, weightUnit: "lb", reps: Math.max(1, ex.reps - tired) });
        break;
      case "reps":
        sets.push({ reps: Math.max(1, Math.round(ex.reps * grow) - tired - i) });
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
  return sets;
}

// Everything, as { exercises, folders, routines, sessions, journals, rolls,
// jitsFolders, techniques }, with sessions and the rest spread over the
// `months` before `today` (a Date).
export function generateDemoData(today = new Date(), months = 9) {
  const start = new Date(today);
  start.setMonth(start.getMonth() - months);
  const startDate = toISODate(start);
  const setupStamp = stamp(startDate, 8);

  const exercises = EXERCISES.map((ex) => ({
    id: demoId(),
    name: ex.name,
    tags: ex.tags,
    text: ex.text || "",
    prescription: ex.prescription || "",
    active: ex.active !== false,
    createdAt: setupStamp,
    updatedAt: setupStamp,
  }));
  const exerciseByName = new Map(EXERCISES.map((ex, i) => [ex.name, { ...ex, id: exercises[i].id }]));

  const { folders, idByPath: folderIdByPath } = buildFolders(ROUTINE_FOLDERS, setupStamp);
  const routines = ROUTINES.map((r) => ({
    id: demoId(),
    name: r.name,
    folderId: r.folder ? folderIdByPath.get(r.folder) : null,
    tags: r.tags,
    text: r.text || "",
    exerciseIds: r.exercises.map((name) => exerciseByName.get(name).id),
    createdAt: setupStamp,
    updatedAt: setupStamp,
  }));
  const routineByName = new Map(ROUTINES.map((r, i) => [r.name, { ...r, id: routines[i].id }]));

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
      const exerciseNames = [...new Set(used.flatMap((r) => r.exercises))];
      if (chance(0.25)) exerciseNames.push(pick(EXERCISES.filter((e) => e.active !== false)).name);
      const ids = [...new Set(exerciseNames.map((name) => exerciseByName.get(name).id))];
      const sets = {};
      const exerciseNotes = {};
      ids.forEach((id) => {
        const ex = [...exerciseByName.values()].find((e) => e.id === id);
        if (chance(0.88)) sets[id] = setsFor(ex, progress);
        if (chance(0.12)) exerciseNotes[id] = pick(EXERCISE_NOTES);
      });
      const text = pick(SESSION_NOTES);
      sessions.push({
        id: demoId(),
        date,
        title: chance(0.2) ? pick(SESSION_TITLES) : "",
        tags: [...new Set([...used.flatMap((r) => r.tags), ...(chance(0.1) ? ["deload"] : [])])],
        text,
        exerciseIds: ids,
        routineIds: used.map((r) => r.id),
        sets,
        exerciseNotes,
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
      const tags = [pick(ROLL_TAGS), ...(chance(0.3) ? [pick(ROLL_TAGS)] : [])].filter((t, i, all) => all.indexOf(t) === i);
      rolls.push({
        id: demoId(),
        date,
        title: chance(0.15) ? "Open mat" : "",
        tags,
        text: pick(ROLL_TEXTS),
        createdAt: stamp(date, 19),
        updatedAt: stamp(date, 19),
      });
    }
  }

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

  return { exercises, folders, routines, sessions, journals, rolls, jitsFolders, techniques };
}
