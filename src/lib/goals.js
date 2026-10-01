// The Plan page's goals: "plyometrics twice a week", "strength AND chest once
// a month", "deadlift once a week". Pure helpers for matching lifting
// sessions against a goal, its rolling window, and whether it's on track.
// Kept free of React so they're testable.
//
// A goal record: { id, name, scope: "exercise" | "session", rules: [{ kind:
// "any" | "none", tags, exerciseIds }], target, period: "week" | "month",
// createdAt, updatedAt } (see matchEntry for what the rules mean). `name` is
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

export const GOAL_SCOPES = {
  exercise: { label: "Same exercise", hint: "One exercise has to meet every rule, by its own tags." },
  session: { label: "Same session", hint: "Each rule can be met by anything in the session: its tags or any exercise in it." },
};

const ruleChips = (rule) => (rule.tags || []).length + (rule.exerciseIds || []).length;

// A goal needs at least one "Any of" rule with something in it; exclusions
// alone would count every session.
export const hasCriteria = (goal) => (goal.rules || []).some((r) => r.kind !== "none" && ruleChips(r) > 0);

// The goal's name, or its rules spelled out: "(push or pull) + plyometrics,
// not legs", "Farmer carry or Dead hang".
export function goalLabel(goal, exerciseNameById = new Map()) {
  if (goal.name) return goal.name;
  const rules = (goal.rules || []).filter((r) => ruleChips(r) > 0);
  const chips = (r) => [...(r.tags || []), ...(r.exerciseIds || []).map((id) => exerciseNameById.get(id) || "Deleted exercise")];
  const any = rules.filter((r) => r.kind !== "none");
  const none = rules.filter((r) => r.kind === "none");
  const text = any.map((r) => (chips(r).length > 1 && any.length > 1 ? `(${chips(r).join(" or ")})` : chips(r).join(" or "))).join(" + ");
  const not = none.map((r) => `not ${chips(r).join(" or ")}`).join(", ");
  return [text, not].filter(Boolean).join(", ") || "Untitled goal";
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
// of chips (tags or Library exercises), or "None of" them. Its scope says
// where they have to hold:
//   exercise  one exercise meets every rule on its own: its Library tags and
//             itself. The session's tags don't come into it. The blocks
//             returned are the exercises that did.
//   session   the session as a whole meets every rule: its own tags plus
//             every exercise's tags, and every exercise in it. So push work
//             and plyo work on separate exercises count for "push +
//             plyometrics". The blocks returned are the exercises that hit an
//             "Any of" rule (empty when only the session's tags did).
// Returns the blocks, or null when it doesn't count.
export function matchEntry(goal, entry, exerciseById = new Map()) {
  const rules = goal.rules || [];
  const blocks = blocksOf(entry);
  const tagsOf = (b) => exerciseById.get(b.exerciseId)?.tags || [];
  if (goal.scope === "session") {
    const tags = [...(entry.tags || []), ...blocks.flatMap(tagsOf)];
    if (!meetsRules(rules, tags, blocks.map((b) => b.exerciseId))) return null;
    return blocks.filter((b) => rules.some((r) => r.kind !== "none" && hits(r, tagsOf(b), [b.exerciseId])));
  }
  const matched = blocks.filter((b) => meetsRules(rules, tagsOf(b), [b.exerciseId]));
  return matched.length > 0 ? matched : null;
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
