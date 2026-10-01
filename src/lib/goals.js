// The Plan page's goals: "plyometrics twice a week", "strength AND chest once
// a month", "deadlift once a week". Pure helpers for matching lifting
// sessions against a goal, its rolling window, and whether it's on track.
// Kept free of React so they're testable.
//
// A goal record: { id, name, tags, tagMatch: "all" | "any", exerciseIds,
// target, period: "week" | "month", createdAt, updatedAt }. `name` is
// optional (goalLabel spells out the criteria when it's blank). The period
// is a rolling window ending today — the last 7 or 30 days — not a calendar
// week or month, so last Friday's session still counts on Thursday.

import { matchesTags } from "./activity.js";
import { blocksOf } from "./sets.js";
import { shiftISODate } from "./id.js";

export const GOAL_PERIODS = {
  week: { label: "week", per: "a week", days: 7 },
  month: { label: "month", per: "a month", days: 30 },
};

const windowDays = (goal) => (GOAL_PERIODS[goal.period] || GOAL_PERIODS.week).days;

// How close to due a met goal turns At risk: due tomorrow for a weekly goal,
// within 4 days for a monthly one.
const RISK_DAYS = { week: 1, month: 4 };

// What each status is called, its colour, and how urgent it is (for sorting
// the worst first).
export const GOAL_STATUSES = {
  off: { label: "Off track", accent: "--danger", rank: 0 },
  risk: { label: "At risk", accent: "--accent", rank: 1 },
  on: { label: "On track", accent: "--accent2", rank: 2 },
};

const dateOf = (iso) => new Date(`${iso}T00:00:00`);
const daysBetween = (a, b) => Math.round((dateOf(b) - dateOf(a)) / 86400000);
const shortDate = (iso) => dateOf(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

// The goal's window ending on `end` (today by default): the last 7 or 30
// days, as { start, end } ISO dates, both inclusive.
export function windowEnding(goal, end) {
  return { start: shiftISODate(end, -(windowDays(goal) - 1)), end };
}

// "Sep 25 – Oct 1".
export const windowLabel = ({ start, end }) => `${shortDate(start)} – ${shortDate(end)}`;

// "Last 7 days", "Last 30 days".
export const windowName = (goal) => `Last ${windowDays(goal)} days`;

export const hasCriteria = (goal) => (goal.tags || []).length > 0 || (goal.exerciseIds || []).length > 0;

// The goal's name, or its criteria spelled out: "strength + chest",
// "push or pull", "Deadlift", "plyometrics, or Box jump".
export function goalLabel(goal, exerciseNameById = new Map()) {
  if (goal.name) return goal.name;
  const tags = goal.tags || [];
  const tagText = tags.join(goal.tagMatch === "any" ? " or " : " + ");
  const exerciseText = (goal.exerciseIds || []).map((id) => exerciseNameById.get(id) || "Deleted exercise").join(" or ");
  return [tagText, exerciseText].filter(Boolean).join(", or ") || "Untitled goal";
}

// "2× a week", "once a month".
export function frequencyLabel(goal) {
  const per = GOAL_PERIODS[goal.period]?.per || "";
  const times = goal.target === 1 ? "Once" : goal.target === 2 ? "Twice" : `${goal.target}×`;
  return `${times} ${per}`;
}

// Whether a session counts toward `goal`, and which of its exercises did it.
// It counts when its own tags match the goal's, or when any exercise in it
// does: one of the goal's exercises, or an exercise with at least one of the
// goal's tags whose tags — together with the session's — match them. So
// "strength + chest" counts a chest exercise done in a session tagged
// strength, but a session tagged strength + legs doesn't make its planks
// count toward "strength + legs" (the session still counts, by its tags).
// Returns the matching blocks (empty when only the session's tags matched),
// or null when it doesn't count.
export function matchEntry(goal, entry, exerciseById = new Map()) {
  const tags = goal.tags || [];
  const exerciseIds = goal.exerciseIds || [];
  const tagsMatch = (list) => tags.length > 0 && matchesTags(list, tags, goal.tagMatch === "any" ? "any" : "all");
  const entryTags = entry.tags || [];
  const blocks = blocksOf(entry).filter((b) => {
    if (exerciseIds.includes(b.exerciseId)) return true;
    const exerciseTags = exerciseById.get(b.exerciseId)?.tags || [];
    return exerciseTags.some((t) => tags.includes(t)) && tagsMatch([...entryTags, ...exerciseTags]);
  });
  return blocks.length > 0 || tagsMatch(entryTags) ? blocks : null;
}

// Every lifting session that counts toward `goal`, newest first, as
// { entry, blocks }. Mat sessions don't count: goals are for lifting.
export function goalMatches(goal, sessions = [], exerciseById = new Map()) {
  if (!hasCriteria(goal)) return [];
  const out = [];
  sessions.forEach((entry) => {
    if (typeof entry.date !== "string") return;
    const blocks = matchEntry(goal, entry, exerciseById);
    if (blocks) out.push({ entry, blocks });
  });
  return out.sort((a, b) => b.entry.date.localeCompare(a.entry.date) || (b.entry.createdAt || "").localeCompare(a.entry.createdAt || ""));
}

// The matches dated within `{ start, end }`. Every session counts, even two
// on the same day.
export const matchesIn = (matches, { start, end }) => matches.filter((m) => m.entry.date >= start && m.entry.date <= end);

// Where a goal stands today: { status, count, target, needed, due, window }.
// `count` is the sessions in the window ending today. When that meets the
// target, `due` is the last day the next session can come before the window
// falls short (the day the session that's keeping it met slides out).
//   on    met, and not due soon
//   risk  met, but due within RISK_DAYS (tomorrow, for a weekly goal)
//   off   not met: fewer sessions in the window than the target (`needed`
//         more to get back on track)
export function goalStatus(goal, matches, today) {
  const target = Math.max(1, goal.target || 1);
  const window = windowEnding(goal, today);
  const dates = matchesIn(matches, window)
    .map((m) => m.entry.date)
    .sort();
  const count = dates.length;
  if (count < target) return { status: "off", count, target, needed: target - count, due: null, window };
  const due = shiftISODate(dates[count - target], windowDays(goal));
  const status = daysBetween(today, due) <= (RISK_DAYS[goal.period] ?? 1) ? "risk" : "on";
  return { status, count, target, needed: 0, due, window };
}

// The last `n` windows back to back, ending today, oldest first, each as
// { window, count, met }: for a weekly goal, the last 7 days, the 7 before
// those, and so on.
export function recentWindows(goal, matches, today, n = 8) {
  const days = windowDays(goal);
  return Array.from({ length: n }, (_, i) => {
    const window = windowEnding(goal, shiftISODate(today, -days * (n - 1 - i)));
    const count = matchesIn(matches, window).length;
    return { window, count, met: count >= (goal.target || 1) };
  });
}

// "3 in the last 7 days · next by Sat, Oct 3", "1 of 2 in the last 7 days ·
// 1 more needed".
export function progressText(goal, { status, count, target, needed, due }, today) {
  const span = `in the last ${windowDays(goal)} days`;
  if (status === "off") return `${count} of ${target} ${span} · ${needed} more needed`;
  const days = daysBetween(today, due);
  const when = days === 1 ? "tomorrow" : dateOf(due).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
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
