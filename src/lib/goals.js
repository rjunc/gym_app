// The Plan page's goals: "plyometrics twice a week", "strength AND chest once
// a month", "deadlift once a week". Pure helpers for matching lifting
// sessions against a goal, its rolling window, and whether it's on track.
// Kept free of React so they're testable.
//
// A goal record: { id, name, active, rules: [{ kind: "any" | "none", scope:
// "exercise" | "session", tags, exerciseIds }], target, period: "week" |
// "month", createdAt, updatedAt } (see matchEntry for what the rules mean). `name` is
// optional (goalLabel spells out the criteria when it's blank). The period
// is a rolling window ending today — the last 7 or 30 days — not a calendar
// week or month, so last Friday's session still counts on Thursday.

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

// The goal's window ending on `end` (today by default): the last 7 or 30
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

// Where a rule has to hold. Every "one exercise" rule must be met by the
// same exercise; each "anywhere in the session" rule on its own.
export const GOAL_SCOPES = {
  exercise: { label: "One exercise", hint: "Met by a single exercise, by its own tags. All the rules set to this have to be met by the same exercise." },
  session: { label: "Anywhere in the session", hint: "Met by the session's tags or any exercise in it." },
};
const scopeOf = (rule) => (rule.scope === "session" ? "session" : "exercise");

const ruleChips = (rule) => (rule.tags || []).length + (rule.exerciseIds || []).length;

// A goal needs at least one "Any of" rule with something in it; exclusions
// alone would count every session.
export const hasCriteria = (goal) => (goal.rules || []).some((r) => r.kind !== "none" && ruleChips(r) > 0);

// The goal's name, or its rules spelled out: "(push or pull) + plyometrics,
// not legs" for rules on one exercise, then the session's: "…, in a session
// with legs, not deload". A goal whose rules are all on the session reads
// like the first kind: "strength, not deload".
export function goalLabel(goal, exerciseNameById = new Map()) {
  if (goal.name) return goal.name;
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

// "2× a week", "once a month".
export function frequencyLabel(goal) {
  const per = GOAL_PERIODS[goal.period]?.per || "";
  const times = goal.target === 1 ? "Once" : goal.target === 2 ? "Twice" : `${goal.target}×`;
  return `${times} ${per}`;
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

// Whether the window ending on `day` holds the target. `dates` are the
// matches' dates, sorted.
function metOn(goal, dates, day, target) {
  const { start } = windowEnding(goal, day);
  let n = 0;
  for (const d of dates) if (d >= start && d <= day) n += 1;
  return n >= target;
}

// Where a goal stands today: { status, count, target, needed, due,
// overdueDays, lastMet, window }. `count` is the sessions in the window
// ending today and `needed` how many more it takes to meet the target. A
// session on the `due` day still counts, so the goal only slips the day
// after.
//   on       met, and the next session isn't due soon (`due` is the last day
//            it can come)
//   risk     met, but due within RISK_DAYS (tomorrow, for a weekly goal), or
//            due today: it was met yesterday, and a session today keeps it
//   overdue  short, for up to one window (7 or 30 days) since it was due;
//            `overdueDays` says how long. A goal that has never been met is
//            overdue for its first window after it was created
//   behind   short for a whole window or longer, or never met in all that
//            time. `lastMet` is the last day it was met (null if never)
export function goalStatus(goal, matches, today) {
  const target = Math.max(1, goal.target || 1);
  const days = windowDays(goal);
  const window = windowEnding(goal, today);
  const dates = matches.map((m) => m.entry.date).filter((d) => d <= today).sort();
  const inWindow = dates.filter((d) => d >= window.start);
  const count = inWindow.length;
  const base = { count, target, needed: Math.max(0, target - count), window, due: null, overdueDays: 0, lastMet: null };

  if (count >= target) {
    const due = shiftISODate(inWindow[count - target], days);
    return { ...base, status: daysBetween(today, due) <= (RISK_DAYS[goal.period] ?? 1) ? "risk" : "on", due };
  }

  // Short today: step back to the last day the window was met. Nothing before
  // the first matching session can have been.
  let lastMet = null;
  for (let day = shiftISODate(today, -1); dates.length > 0 && day >= dates[0]; day = shiftISODate(day, -1)) {
    if (metOn(goal, dates, day, target)) {
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

// "3 days", "2 weeks", "3 months": how long a goal has been short.
function howLong(days) {
  if (days < 14) return `${days} ${days === 1 ? "day" : "days"}`;
  if (days < 60) return `${Math.floor(days / 7)} weeks`;
  return `${Math.floor(days / 30)} months`;
}

// One line on where a goal stands:
//   on/risk   "3 in the last 7 days · next by Sat, Oct 3" (or "tomorrow")
//   risk      "1 of 2 in the last 7 days · 1 more due today"
//   overdue   "Overdue 2 days · 1 more needed"
//   behind    "Behind 3 weeks · last met Sep 3", "Never met · 2 more needed"
export function progressText(goal, { status, count, target, needed, due, overdueDays, lastMet }, today) {
  const span = `in the last ${windowDays(goal)} days`;
  const longDate = (iso) => dateOf(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const more = `${needed} more needed`;
  if (status === "behind") return lastMet ? `Behind ${howLong(overdueDays)} · last met ${shortDate(lastMet)}` : `Never met · ${more}`;
  if (status === "overdue") return lastMet ? `Overdue ${howLong(overdueDays)} · ${more}` : `${count} of ${target} ${span} · ${more}`;
  if (due === today) return `${count} of ${target} ${span} · ${needed} more due today`;
  const when = daysBetween(today, due) === 1 ? "tomorrow" : longDate(due);
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
