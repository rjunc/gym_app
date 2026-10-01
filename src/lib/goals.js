// The Plan page's goals: "plyometrics twice a week", "strength AND chest once
// a month", "deadlift once a week". Pure helpers for matching sessions and
// mat sessions against a goal, its weeks/months, and whether it's on track.
// Kept free of React so they're testable.
//
// A goal record: { id, name, tags, tagMatch: "all" | "any", exerciseIds,
// target, period: "week" | "month", createdAt, updatedAt }. `name` is
// optional (goalLabel spells out the criteria when it's blank).

import { matchesTags } from "./activity.js";
import { blocksOf } from "./sets.js";
import { shiftISODate } from "./id.js";

export const GOAL_PERIODS = {
  week: { label: "week", thisLabel: "This week", lastLabel: "Last week", per: "a week" },
  month: { label: "month", thisLabel: "This month", lastLabel: "Last month", per: "a month" },
};

// What each status is called, its colour, and how urgent it is (for sorting
// the worst first).
export const GOAL_STATUSES = {
  off: { label: "Off track", accent: "--danger", rank: 0 },
  risk: { label: "At risk", accent: "--accent", rank: 1 },
  on: { label: "On track", accent: "--accent2", rank: 2 },
  done: { label: "Done", accent: "--accent2", rank: 3 },
};

const pad2 = (n) => String(n).padStart(2, "0");
const isoOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const dateOf = (iso) => new Date(`${iso}T00:00:00`);
const daysBetween = (a, b) => Math.round((dateOf(b) - dateOf(a)) / 86400000);

// The week (Monday to Sunday) or calendar month `iso` falls in, as
// { start, end } ISO dates, both inclusive.
export function periodOf(iso, period) {
  const d = dateOf(iso);
  if (period === "month") {
    return { start: isoOf(new Date(d.getFullYear(), d.getMonth(), 1)), end: isoOf(new Date(d.getFullYear(), d.getMonth() + 1, 0)) };
  }
  const start = shiftISODate(iso, -((d.getDay() + 6) % 7));
  return { start, end: shiftISODate(start, 6) };
}

// The period `delta` periods away from the one starting `start`.
export function shiftPeriod({ start }, period, delta) {
  if (period === "month") {
    const d = dateOf(start);
    return periodOf(isoOf(new Date(d.getFullYear(), d.getMonth() + delta, 1)), "month");
  }
  return periodOf(shiftISODate(start, delta * 7), "week");
}

// "Sep 28 – Oct 4" for a week, "September 2026" for a month.
export function periodLabel({ start, end }, period) {
  if (period === "month") return dateOf(start).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const short = (iso) => dateOf(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${short(start)} – ${short(end)}`;
}

// A short name for a period in a row of them: "Sep 28" (the week's Monday)
// or "Sep" (the month).
export function periodShortLabel({ start }, period) {
  return dateOf(start).toLocaleDateString(undefined, period === "month" ? { month: "short" } : { month: "short", day: "numeric" });
}

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

// Whether `entry` counts toward `goal`, and which of its exercises did it.
// A session counts when its own tags match the goal's, or when any exercise
// in it does: one of the goal's exercises, or an exercise with at least one
// of the goal's tags whose tags — together with the session's — match them.
// So "strength + chest" counts a chest exercise done in a session tagged
// strength, but a session tagged strength + legs doesn't make its planks
// count toward "strength + legs" (the session still counts, by its tags). A
// mat session has no exercises, so only its tags count. Returns the matching
// blocks (empty when only the entry's tags matched), or null when it doesn't
// count.
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

// Every session and mat session that counts toward `goal`, newest first, as
// { source: "sessions" | "rolls", entry, blocks }.
export function goalMatches(goal, { sessions = [], rolls = [] }, exerciseById = new Map()) {
  if (!hasCriteria(goal)) return [];
  const out = [];
  [
    ["sessions", sessions],
    ["rolls", rolls],
  ].forEach(([source, list]) =>
    list.forEach((entry) => {
      if (typeof entry.date !== "string") return;
      const blocks = matchEntry(goal, entry, exerciseById);
      if (blocks) out.push({ source, entry, blocks });
    })
  );
  return out.sort((a, b) => b.entry.date.localeCompare(a.entry.date) || (b.entry.createdAt || "").localeCompare(a.entry.createdAt || ""));
}

// How many different days in `{ start, end }` have a match. Training twice
// in one day counts once, so "twice a week" means two days.
export function daysIn(matches, { start, end }) {
  return new Set(matches.filter((m) => m.entry.date >= start && m.entry.date <= end).map((m) => m.entry.date)).size;
}

// Where a goal stands today: { status, count, target, remaining, daysLeft,
// period: { start, end }, lastCount }.
//   done  the target is already met this period
//   off   it can't be met any more this period, or last period was missed
//         and this one is behind pace too
//   risk  behind pace (fewer days than an even spread would have by now), or
//         it needs every day that's left
//   on    otherwise
export function goalStatus(goal, matches, today) {
  const target = Math.max(1, goal.target || 1);
  const period = periodOf(today, goal.period);
  const count = daysIn(matches, period);
  const lastCount = daysIn(matches, shiftPeriod(period, goal.period, -1));
  const totalDays = daysBetween(period.start, period.end) + 1;
  const daysBefore = daysBetween(period.start, today); // days of the period already over
  const daysLeft = totalDays - daysBefore; // including today
  const remaining = Math.max(0, target - count);
  const behind = count < Math.round((target * daysBefore) / totalDays);
  let status = "on";
  if (remaining === 0) status = "done";
  else if (remaining > daysLeft || (behind && lastCount < target)) status = "off";
  else if (behind || remaining >= daysLeft) status = "risk";
  return { status, count, target, remaining, daysLeft, period, lastCount };
}

// The last `n` periods up to and including the current one, oldest first,
// each as { period, count, met }.
export function recentPeriods(goal, matches, today, n = 8) {
  const current = periodOf(today, goal.period);
  return Array.from({ length: n }, (_, i) => {
    const period = shiftPeriod(current, goal.period, i - (n - 1));
    const count = daysIn(matches, period);
    return { period, count, met: count >= (goal.target || 1) };
  });
}

// "1 of 2 this week · 3 days left", "Done this month (3 of 2)".
export function progressText(goal, { status, count, target, daysLeft }) {
  const which = goal.period === "month" ? "this month" : "this week";
  if (status === "done") return count > target ? `Done ${which} · ${count} days` : `Done ${which} · ${count} of ${target}`;
  return `${count} of ${target} ${which} · ${daysLeft === 1 ? "last day" : `${daysLeft} days left`}`;
}

// Every goal with its matches and where it stands today, as
// [{ goal, matches, state }] in the goals' order (oldest first), for the Plan
// page and Home's warnings. `log` is { sessions, rolls }.
export function goalSummaries(goals, log, exerciseById, today) {
  return [...goals]
    .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""))
    .map((goal) => {
      const matches = goalMatches(goal, log, exerciseById);
      return { goal, matches, state: goalStatus(goal, matches, today) };
    });
}
