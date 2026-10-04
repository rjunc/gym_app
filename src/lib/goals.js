// The Plan page's goals: "plyometrics twice a week", "strength AND chest once
// a month", "deadlift once a week". Pure helpers for matching lifting
// sessions against a goal, its rolling window, and whether it's on track.
// Kept free of React so they're testable.
//
// A goal is one of two kinds (`mode`, see GOAL_MODES):
//   sessions   { id, name, active, mode: "sessions", rules: [{ kind: "any" |
//              "none", scope: "exercise" | "session", tags, exerciseIds }],
//              target, days, order, createdAt, updatedAt } (see matchEntry for
//              what the rules mean): `target` sessions every `days` days.
//   checklist  { id, name, active, mode: "checklist", items: [{ tag, target }
//              | { exerciseId, target }], days, order, createdAt, updatedAt }:
//              each item done in at least its own `target` sessions every
//              `days` days, from any mix of sessions (see matchChecklist).
// `name` is optional (goalLabel spells out the criteria when it's blank). The window is rolling, ending today — the last 7 days
// for a week, 14 for every two weeks — not a calendar week or month, so last
// Friday's session still counts on Thursday. `order` is the goal's place in
// your own order on the Plan page (see moveGoal).

import { blocksOf } from "./sets.js";
import { shiftISODate } from "./id.js";
import { editRecord } from "./records.js";

// The longest window a goal can have, in days.
export const MAX_GOAL_DAYS = 365;

// Quick picks for the window, with what they read as ("a week").
export const GOAL_PERIODS = [
  { days: 7, label: "Week", per: "a week" },
  { days: 14, label: "2 weeks", per: "every 2 weeks" },
  { days: 30, label: "Month", per: "a month" },
];

export const windowDays = (goal) => Math.max(1, Math.min(MAX_GOAL_DAYS, Math.round(goal.days) || 7));

// How close to due a met goal turns At risk: a day per week of window, so
// due tomorrow for a weekly goal, within 4 days for a monthly one.
const riskDays = (goal) => Math.max(1, Math.round(windowDays(goal) / 7));

// What each status is called, its colour, and how urgent it is (for sorting
// the worst first). `solid` statuses get a filled pill, so Behind stands out
// from Overdue.
export const GOAL_STATUSES = {
  behind: { label: "Behind", accent: "--danger", rank: 0, solid: true },
  overdue: { label: "Overdue", accent: "--danger", rank: 1 },
  risk: { label: "At risk", accent: "--accent", rank: 2 },
  on: { label: "On track", accent: "--accent2", rank: 3 },
};

const dateOf = (iso) => new Date(`${iso}T00:00:00`);
const daysBetween = (a, b) => Math.round((dateOf(b) - dateOf(a)) / 86400000);
const shortDate = (iso) => dateOf(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

// The goal's window ending on `end` (today by default): the last `days`
// days, as { start, end } ISO dates, both inclusive.
export function windowEnding(goal, end) {
  return { start: shiftISODate(end, -(windowDays(goal) - 1)), end };
}

// "Sep 25 – Oct 1".
export const windowLabel = ({ start, end }) => `${shortDate(start)} – ${shortDate(end)}`;

// "Last 7 days", "Last 30 days".
export const windowName = (goal) => `Last ${windowDays(goal)} days`;

// An inactive goal is kept, history and all, but isn't tracked: it sits in
// its own section on the Plan page and Home never warns about it.
export const isActive = (goal) => goal.active !== false;

// What a goal counts: sessions that meet its rules, or a checklist of items
// that each have to be done often enough.
export const GOAL_MODES = {
  sessions: { label: "Sessions", hint: "Sessions that meet every rule." },
  checklist: { label: "Checklist", hint: "Each item done often enough, from any mix of sessions." },
};
export const isChecklist = (goal) => goal.mode === "checklist";

// A checklist's items: each a tag or a Library exercise, and how many
// sessions it has to be done in (at least 1).
export const checklistItems = (goal) => (goal.items || []).filter((it) => it && (it.tag || it.exerciseId));
export const itemTarget = (item) => Math.max(1, Math.round(item.target) || 1);
export const itemLabel = (item, exerciseNameById = new Map()) => item.tag || exerciseNameById.get(item.exerciseId) || "Deleted exercise";

// The goal minus what it counts (its mode, rules or items, and target), for
// replacing them on an edit that may switch the mode.
export const withoutCriteria = ({ mode, rules, items, target, ...rest }) => rest;

// Where a rule has to hold. Every "one exercise" rule must be met by the
// same exercise; each "anywhere in the session" rule on its own.
export const GOAL_SCOPES = {
  exercise: { label: "One exercise", hint: "Met by a single exercise, by its own tags. All the rules set to this have to be met by the same exercise." },
  session: { label: "Anywhere in the session", hint: "Met by the session's tags or any exercise in it." },
};
const scopeOf = (rule) => (rule.scope === "session" ? "session" : "exercise");

const ruleChips = (rule) => (rule.tags || []).length + (rule.exerciseIds || []).length;

// A sessions goal needs at least one "Any of" rule with something in it
// (exclusions alone would count every session); a checklist, an item.
export const hasCriteria = (goal) =>
  isChecklist(goal) ? checklistItems(goal).length > 0 : (goal.rules || []).some((r) => r.kind !== "none" && ruleChips(r) > 0);

// The goal's name, or its rules spelled out: "(push or pull) + plyometrics,
// not legs" for rules on one exercise, then the session's: "…, in a session
// with legs, not deload". A goal whose rules are all on the session reads
// like the first kind: "strength, not deload". A checklist lists its items,
// with how many times when it's more than once: "L-sit, wall sit ×2".
export function goalLabel(goal, exerciseNameById = new Map()) {
  if (goal.name) return goal.name;
  if (isChecklist(goal)) {
    const items = checklistItems(goal);
    return items.length ? items.map((it) => itemLabel(it, exerciseNameById) + (itemTarget(it) > 1 ? ` ×${itemTarget(it)}` : "")).join(", ") : "Untitled goal";
  }
  const rules = (goal.rules || []).filter((r) => ruleChips(r) > 0);
  const chips = (r) => [...(r.tags || []), ...(r.exerciseIds || []).map((id) => exerciseNameById.get(id) || "Deleted exercise")];
  const spell = (list) => {
    const any = list.filter((r) => r.kind !== "none");
    const anyText = any.map((r) => (chips(r).length > 1 && any.length > 1 ? `(${chips(r).join(" or ")})` : chips(r).join(" or "))).join(" + ");
    return [anyText, ...list.filter((r) => r.kind === "none").map((r) => `not ${chips(r).join(" or ")}`)].filter(Boolean).join(", ");
  };
  const onExercise = spell(rules.filter((r) => scopeOf(r) === "exercise"));
  const onSession = spell(rules.filter((r) => scopeOf(r) === "session"));
  if (!onExercise) return onSession || "Untitled goal";
  return onSession ? `${onExercise}, in a session with ${onSession}` : onExercise;
}

// "a week", "every 2 weeks", "every 10 days", "every day".
export function perLabel(goal) {
  const days = windowDays(goal);
  const preset = GOAL_PERIODS.find((p) => p.days === days);
  if (preset) return preset.per;
  return days === 1 ? "every day" : `every ${days} days`;
}

const timesLabel = (n) => (n === 1 ? "Once" : n === 2 ? "Twice" : `${n}×`);

// "Twice a week", "Once every 2 weeks", "2× every 10 days". A checklist:
// "Each once a month" when every item has the same target, else "4 items a
// month".
export function frequencyLabel(goal) {
  const per = perLabel(goal);
  if (isChecklist(goal)) {
    const targets = [...new Set(checklistItems(goal).map(itemTarget))];
    if (targets.length === 1) return `Each ${timesLabel(targets[0]).toLowerCase()} ${per}`;
    const n = checklistItems(goal).length;
    return `${n} ${n === 1 ? "item" : "items"} ${per}`;
  }
  return `${timesLabel(goal.target)} ${per}`;
}

// Whether one rule's chips hit something with these `tags` and exercise ids.
const hits = (rule, tags, exerciseIds) => (rule.tags || []).some((t) => tags.includes(t)) || (rule.exerciseIds || []).some((id) => exerciseIds.includes(id));

// Whether `tags` + `exerciseIds` meet every rule: each "Any of" rule hits,
// no "None of" rule does. Rules with nothing in them are ignored.
function meetsRules(rules, tags, exerciseIds) {
  return rules.every((r) => ruleChips(r) === 0 || (r.kind === "none" ? !hits(r, tags, exerciseIds) : hits(r, tags, exerciseIds)));
}

// Whether a session counts toward `goal`, and which of its exercises did it.
// A goal is a list of rules, every one of which must hold: "Any of" a set
// of chips (tags or Library exercises), or "None of" them. Each rule says
// where it has to hold:
//   exercise  on one exercise, by its Library tags and itself (the
//             session's tags don't come into it). All the exercise rules
//             must be met by the same exercise: "push" + "plyometrics" both
//             on one exercise needs a clap push-up, not bench press plus box
//             jumps.
//   session   anywhere in the session: its own tags plus every exercise's
//             tags, and every exercise in it. Each such rule is met on its
//             own, so "push" + "plyometrics" both on the session counts bench
//             press plus box jumps.
// Returns the exercises that made it count — the ones meeting the exercise
// rules, and any hitting an "Any of" session rule — in the order done
// (empty when only the session's tags did), or null when it doesn't count.
export function matchEntry(goal, entry, exerciseById = new Map()) {
  const rules = (goal.rules || []).filter((r) => ruleChips(r) > 0);
  const exerciseRules = rules.filter((r) => scopeOf(r) === "exercise");
  const sessionRules = rules.filter((r) => scopeOf(r) === "session");
  const blocks = blocksOf(entry);
  const tagsOf = (b) => exerciseById.get(b.exerciseId)?.tags || [];

  const sessionTags = [...(entry.tags || []), ...blocks.flatMap(tagsOf)];
  if (!meetsRules(sessionRules, sessionTags, blocks.map((b) => b.exerciseId))) return null;
  const onExercise = exerciseRules.length > 0 ? blocks.filter((b) => meetsRules(exerciseRules, tagsOf(b), [b.exerciseId])) : [];
  if (exerciseRules.length > 0 && onExercise.length === 0) return null;

  return blocks.filter((b) => onExercise.includes(b) || sessionRules.some((r) => r.kind !== "none" && hits(r, tagsOf(b), [b.exerciseId])));
}

// Which of a checklist's items a session does, as { items, blocks }: the
// indexes of the items done, and the exercises that did them in the order
// done (empty when only the session's tags did), or null when it does none.
// A tag item is done by the session's own tags or any exercise's, like a
// rule anywhere in the session; an exercise item, by that exercise being in
// it. One session can do several items.
export function matchChecklist(goal, entry, exerciseById = new Map()) {
  const blocks = blocksOf(entry);
  const tagsOf = (b) => exerciseById.get(b.exerciseId)?.tags || [];
  const hitsItem = (item, b) => (item.tag ? tagsOf(b).includes(item.tag) : b.exerciseId === item.exerciseId);
  const items = [];
  checklistItems(goal).forEach((item, i) => {
    if ((item.tag && (entry.tags || []).includes(item.tag)) || blocks.some((b) => hitsItem(item, b))) items.push(i);
  });
  if (items.length === 0) return null;
  const done = items.map((i) => checklistItems(goal)[i]);
  return { items, blocks: blocks.filter((b) => done.some((item) => hitsItem(item, b))) };
}

// Every lifting session that counts toward `goal`, newest first, as
// { entry, blocks }, plus `items` (the indexes of the items it does) for a
// checklist. Mat sessions don't count: goals are for lifting.
export function goalMatches(goal, sessions = [], exerciseById = new Map()) {
  if (!hasCriteria(goal)) return [];
  const checklist = isChecklist(goal);
  const out = [];
  sessions.forEach((entry) => {
    if (typeof entry.date !== "string") return;
    if (checklist) {
      const hit = matchChecklist(goal, entry, exerciseById);
      if (hit) out.push({ entry, ...hit });
      return;
    }
    const blocks = matchEntry(goal, entry, exerciseById);
    if (blocks) out.push({ entry, blocks });
  });
  return out.sort((a, b) => b.entry.date.localeCompare(a.entry.date) || (b.entry.createdAt || "").localeCompare(a.entry.createdAt || ""));
}

// The matches dated within `{ start, end }`. Every session counts, even two
// on the same day.
export const matchesIn = (matches, { start, end }) => matches.filter((m) => m.entry.date >= start && m.entry.date <= end);

// What a goal has to keep up, as tracks of { target, dates, item? }: one for
// a sessions goal (its matching sessions' dates), one per item for a
// checklist (the dates of the sessions doing that item). The goal is met
// when every track is.
function goalTracks(goal, matches) {
  if (!isChecklist(goal)) return [{ target: Math.max(1, goal.target || 1), dates: matches.map((m) => m.entry.date) }];
  return checklistItems(goal).map((item, i) => ({
    item,
    target: itemTarget(item),
    dates: matches.filter((m) => (m.items || []).includes(i)).map((m) => m.entry.date),
  }));
}

// How a window went: { count, target, met }. For a sessions goal, its
// sessions in the window against the target; for a checklist, how many
// items were done often enough against how many there are, with `items`
// saying how each went ({ item, count, target, met }).
function tally(goal, tracks, { start, end }) {
  const items = tracks.map((t) => {
    const count = t.dates.filter((d) => d >= start && d <= end).length;
    return { item: t.item, count, target: t.target, met: count >= t.target };
  });
  const met = items.length > 0 && items.every((it) => it.met);
  if (!isChecklist(goal)) return { count: items[0].count, target: items[0].target, met };
  return { count: items.filter((it) => it.met).length, target: items.length, met, items };
}

// Where a goal stands today: { status, count, target, needed, due,
// overdueDays, lastMet, window }, plus `items` for a checklist. `count` is
// the sessions in the window ending today (a checklist: the items done often
// enough) and `needed` how many more it takes to meet the target (a
// checklist: the items still short). A session on the `due` day still
// counts, so the goal only slips the day after.
//   on       met, and the next session isn't due soon (`due` is the last day
//            it can come; for a checklist, the first day any item would
//            drop short)
//   risk     met, but due within riskDays (tomorrow, for a weekly goal), or
//            due today: it was met yesterday, and a session today keeps it
//   overdue  short, for up to one window (`days` days) since it was due;
//            `overdueDays` says how long. A goal that has never been met is
//            overdue for its first window after it was created
//   behind   short for a whole window or longer, or never met in all that
//            time. `lastMet` is the last day it was met (null if never)
export function goalStatus(goal, matches, today) {
  const days = windowDays(goal);
  const window = windowEnding(goal, today);
  const tracks = goalTracks(goal, matches).map((t) => ({ ...t, dates: t.dates.filter((d) => d <= today).sort() }));
  const now = tally(goal, tracks, window);
  const base = { ...now, needed: Math.max(0, now.target - now.count), window, due: null, overdueDays: 0, lastMet: null };
  delete base.met;

  if (now.met) {
    // Each track is due once its oldest session that's still needed drops
    // out of the window; the goal, when the first of them is.
    const due = tracks
      .map((t) => {
        const inWindow = t.dates.filter((d) => d >= window.start);
        return shiftISODate(inWindow[inWindow.length - t.target], days);
      })
      .sort()[0];
    return { ...base, status: daysBetween(today, due) <= riskDays(goal) ? "risk" : "on", due };
  }

  // Short today: step back to the last day the window was met. Nothing before
  // every track's first session can have been.
  let lastMet = null;
  const earliest = tracks.length > 0 && tracks.every((t) => t.dates.length > 0) ? tracks.map((t) => t.dates[0]).sort().pop() : null;
  for (let day = shiftISODate(today, -1); earliest && day >= earliest; day = shiftISODate(day, -1)) {
    if (tally(goal, tracks, windowEnding(goal, day)).met) {
      lastMet = day;
      break;
    }
  }
  if (lastMet === shiftISODate(today, -1)) return { ...base, status: "risk", due: today, lastMet };
  if (lastMet) {
    const overdueDays = daysBetween(shiftISODate(lastMet, 1), today); // since the day it was due
    return { ...base, status: overdueDays >= days ? "behind" : "overdue", overdueDays, lastMet };
  }
  const created = (goal.createdAt || "").slice(0, 10) || today;
  return { ...base, status: daysBetween(created, today) >= days ? "behind" : "overdue" };
}

// The last `n` windows back to back, ending today, oldest first, each as
// { window, count, met } (see tally; a checklist's count is items done): for
// a weekly goal, the last 7 days, the 7 before those, and so on.
export function recentWindows(goal, matches, today, n = 8) {
  const days = windowDays(goal);
  const tracks = goalTracks(goal, matches);
  return Array.from({ length: n }, (_, i) => {
    const window = windowEnding(goal, shiftISODate(today, -days * (n - 1 - i)));
    const { count, met } = tally(goal, tracks, window);
    return { window, count, met };
  });
}

// "3 days", "2 weeks", "3 months": how long a goal has been short.
function howLong(days) {
  if (days < 14) return `${days} ${days === 1 ? "day" : "days"}`;
  if (days < 60) return `${Math.floor(days / 7)} weeks`;
  return `${Math.floor(days / 30)} months`;
}

// A checklist's items still short, named when there are one or two ("Wall
// sit and Copenhagen plank"), else counted ("3 items").
function shortItems(state, exerciseNameById) {
  const short = (state.items || []).filter((it) => !it.met);
  if (short.length > 2) return `${short.length} items`;
  return short.map((it) => itemLabel(it.item, exerciseNameById)).join(" and ");
}

// One line on where a goal stands:
//   on/risk   "3 in the last 7 days · next by Sat, Oct 3" (or "tomorrow")
//   risk      "1 of 2 in the last 7 days · 1 more due today"
//   overdue   "Overdue 2 days · 1 more needed"
//   behind    "Behind 3 weeks · last met Sep 3", "Never met · 2 more needed"
// A checklist counts items, and names the ones left when there are one or
// two: "All 4 done in the last 30 days · next by Sat, Oct 3", "3 of 4 done
// in the last 30 days · Wall sit due today", "Overdue 2 days · Wall sit
// left". `exerciseNameById` names its exercise items.
export function progressText(goal, { status, count, target, needed, due, overdueDays, lastMet, items }, today, exerciseNameById = new Map()) {
  const span = `in the last ${windowDays(goal)} days`;
  const longDate = (iso) => dateOf(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const checklist = isChecklist(goal);
  const left = checklist ? shortItems({ items }, exerciseNameById) : "";
  const more = checklist ? `${left} left` : `${needed} more needed`;
  const done = checklist ? `${count} of ${target} done ${span}` : `${count} of ${target} ${span}`;
  if (status === "behind") return lastMet ? `Behind ${howLong(overdueDays)} · last met ${shortDate(lastMet)}` : `Never met · ${more}`;
  if (status === "overdue") return lastMet ? `Overdue ${howLong(overdueDays)} · ${more}` : `${done} · ${more}`;
  if (due === today) return `${done} · ${checklist ? left : `${needed} more`} due today`;
  const when = daysBetween(today, due) === 1 ? "tomorrow" : longDate(due);
  if (checklist) return `${target === 1 ? "Done" : `All ${target} done`} ${span} · next by ${when}`;
  return `${count} ${span} · next by ${when}`;
}

// Every goal with its matches and where it stands today, as
// [{ goal, matches, state }] in the goals' order (oldest first), for the Plan
// page and Home's warnings.
export function goalSummaries(goals, sessions, exerciseById, today) {
  return [...goals]
    .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""))
    .map((goal) => {
      const matches = goalMatches(goal, sessions, exerciseById);
      return { goal, matches, state: goalStatus(goal, matches, today) };
    });
}

// How the Plan page can order its goals.
export const GOAL_SORTS = {
  status: { label: "Status" },
  name: { label: "Name" },
  custom: { label: "My order" },
};

// Your own order: by `order`, then oldest first for any without one.
function byOrder(a, b) {
  const oa = Number.isFinite(a.order) ? a.order : Infinity;
  const ob = Number.isFinite(b.order) ? b.order : Infinity;
  if (oa !== ob) return oa < ob ? -1 : 1;
  return (a.createdAt || "").localeCompare(b.createdAt || "");
}

// The `order` for a goal added now: after every other.
export const nextGoalOrder = (goals) => goals.reduce((max, g) => (Number.isFinite(g.order) ? Math.max(max, g.order + 1) : max), 0);

// How urgent a goal is within its status, most urgent first: Behind and
// Overdue by how long they've been short (a goal never met at all heads
// Behind, and trails Overdue, being still in its first window); At risk and
// On track by the soonest due.
function byUrgency({ state: a }, { state: b }) {
  if (a.status === "behind" || a.status === "overdue") {
    const short = (st) => (st.lastMet ? st.overdueDays : st.status === "behind" ? Infinity : -1);
    return short(b) - short(a) || 0;
  }
  return (a.due || "").localeCompare(b.due || "");
}

// Goal summaries (see goalSummaries) in the order `sort` asks for:
//   status  worst status first (Behind, Overdue, At risk, On track), then
//           the most urgent, then by name
//   name    A–Z by goalLabel
//   custom  your own order (`order`, see moveGoal)
// `labelOf` names a goal, for sorting by name.
export function sortSummaries(summaries, sort, labelOf = (goal) => goalLabel(goal)) {
  const byName = (a, b) => labelOf(a.goal).localeCompare(labelOf(b.goal), undefined, { sensitivity: "base" });
  const compare =
    sort === "name"
      ? byName
      : sort === "custom"
        ? (a, b) => byOrder(a.goal, b.goal)
        : (a, b) => GOAL_STATUSES[a.state.status].rank - GOAL_STATUSES[b.state.status].rank || byUrgency(a, b) || byName(a, b);
  return [...summaries].sort(compare);
}

// Moves the goal `id` one place up (`dir` -1) or down (1) in your own order,
// past its neighbour in the same section (active or inactive), and returns
// the goals with every `order` renumbered 0, 1, 2… Only goals whose order
// changed are edited. At either end, nothing moves.
export function moveGoal(goals, id, dir) {
  const ordered = [...goals].sort(byOrder);
  const i = ordered.findIndex((g) => g.id === id);
  if (i < 0) return goals;
  let j = i + dir;
  while (j >= 0 && j < ordered.length && isActive(ordered[j]) !== isActive(ordered[i])) j += dir;
  if (j < 0 || j >= ordered.length) return goals;
  [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
  const order = new Map(ordered.map((g, k) => [g.id, k]));
  return goals.map((g) => (g.order === order.get(g.id) ? g : editRecord(g, { order: order.get(g.id) })));
}
