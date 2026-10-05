// What to do next, worked out from the Plan's goals: which goals need a
// session now and which soon (planSection), the things to train to keep
// them up — merged, so one thing that serves three goals is listed once
// (nextUp) — and the routine that would do the most for them if done next
// (suggestSession). Pure, so testable.

import { isActive, isChecklist, checklistItems, matchEntry, matchChecklist, goalLabel, itemLabel, dayLabel, howLong, GOAL_STATUSES } from "./goals.js";

// Where a goal sits on the Plan page:
//   now   needs a session today: behind, overdue, or due today
//   soon  met, but due in the next few days (At risk)
//   on    on track
export function planSection(state, today) {
  if (state.status === "behind" || state.status === "overdue") return "now";
  if (state.status === "risk") return state.due === today ? "now" : "soon";
  return "on";
}

export const PLAN_SECTIONS = {
  now: { label: "Due now", accent: "--danger" },
  soon: { label: "Coming up", accent: "--accent" },
  on: { label: "On track", accent: "--accent2" },
};

// The chips of a sessions goal's "Any of" rules, as { tag } | { exerciseId }
// | { routineId }.
function anyChips(goal) {
  return (goal.rules || [])
    .filter((r) => r.kind !== "none")
    .flatMap((r) => [...(r.tags || []).map((tag) => ({ tag })), ...(r.exerciseIds || []).map((exerciseId) => ({ exerciseId })), ...(r.routineIds || []).map((routineId) => ({ routineId }))]);
}

// The indexes of a checklist's items that need doing: the ones short when
// it's due now, or the ones due first when it's coming up.
function itemsToDo(state, section) {
  const items = state.items || [];
  if (section === "now") return items.map((it, i) => (it.met ? -1 : i)).filter((i) => i >= 0);
  return items.map((it, i) => (it.met && it.due === state.due ? i : -1)).filter((i) => i >= 0);
}

// What doing a goal comes down to, as [{ key, chip }]: a checklist's items
// that need doing; a sessions goal with a single chip to look for, that
// chip; anything more involved, the goal itself (chip null).
function goalTodos(goal, state, section) {
  if (isChecklist(goal)) {
    const items = checklistItems(goal);
    return itemsToDo(state, section).map((i) => ({ key: chipKey(items[i]), chip: items[i] }));
  }
  const chips = anyChips(goal);
  return chips.length === 1 ? [{ key: chipKey(chips[0]), chip: chips[0] }] : [{ key: `goal:${goal.id}`, chip: null }];
}
const chipKey = (chip) => (chip.tag ? `tag:${chip.tag}` : chip.exerciseId ? `exercise:${chip.exerciseId}` : `routine:${chip.routineId}`);

// How urgent a goal is, smaller first: behind, then overdue (longest first),
// then due today, then coming up (soonest first).
function urgency({ state }, section) {
  if (section === "soon") return [3, state.due];
  const rank = GOAL_STATUSES[state.status].rank;
  const short = state.lastMet ? state.overdueDays : state.status === "behind" ? 99999 : 0;
  return [rank, String(99999 - short).padStart(5, "0")];
}
const compareUrgency = (a, b) => a[0] - b[0] || a[1].localeCompare(b[1]);

// "behind 3 weeks", "never done", "overdue 4 days", "due today", "due Fri".
function urgencyLabel({ state }, section, today) {
  if (section === "soon" || state.status === "risk") return `due ${dayLabel(state.due, today)}`;
  if (state.status === "behind") return state.lastMet ? `behind ${howLong(state.overdueDays)}` : "never done";
  return state.lastMet ? `overdue ${howLong(state.overdueDays)}` : "not done yet";
}

// The goals that need a session now or soon, with what doing each comes
// down to: [{ summary, section, todos }], most urgent first. `summaries` is
// goalSummaries output; inactive goals are left out.
export function dueGoals(summaries, today) {
  return summaries
    .filter(({ goal }) => isActive(goal))
    .map((summary) => ({ summary, section: planSection(summary.state, today) }))
    .filter((d) => d.section !== "on")
    .map((d) => ({ ...d, todos: goalTodos(d.summary.goal, d.summary.state, d.section) }))
    .sort((a, b) => compareUrgency(urgency(a.summary, a.section), urgency(b.summary, b.section)));
}

// The Up next list: each thing to train for the goals due now or soon, once
// however many goals it serves, as [{ key, chip, label, section, when,
// goals }] — `chip` null for a goal that takes more than one thing (`label`
// is then the goal's) — most urgent first, then the one serving most goals.
// `nameById` names exercises and routines.
export function nextUp(due, nameById, today) {
  const byKey = new Map();
  due.forEach(({ summary, section, todos }) =>
    todos.forEach(({ key, chip }) => {
      const entry = byKey.get(key);
      if (entry) {
        entry.goals.push(summary.goal);
        return;
      }
      byKey.set(key, {
        key,
        chip,
        label: chip ? itemLabel(chip, nameById) : goalLabel(summary.goal, nameById),
        section,
        when: urgencyLabel(summary, section, today),
        order: byKey.size,
        goals: [summary.goal],
      });
    })
  );
  // `due` is most urgent first, so each entry already took its most urgent
  // goal's section and timing.
  return [...byKey.values()].sort((a, b) => (a.section === b.section ? 0 : a.section === "now" ? -1 : 1) || a.order - b.order).map(({ order, ...rest }) => rest);
}

// A session as if `routine` were done today, for trying it against goals:
// its planned exercises, its tags, and the routine itself.
function sessionOf(routine, today) {
  const blocks = (routine.blocks || []).length > 0 ? routine.blocks : (routine.exerciseIds || []).map((id) => ({ id, exerciseId: id }));
  return { date: today, tags: routine.tags || [], routineIds: [routine.id], blocks };
}

// Whether a session would do something for a due goal: count toward a
// sessions goal, or do one of a checklist's items that need doing.
function helps(d, entry, exerciseById) {
  const { goal, state } = d.summary;
  if (!isChecklist(goal)) return matchEntry(goal, entry, exerciseById) !== null;
  const hit = matchChecklist(goal, entry, exerciseById);
  const wanted = itemsToDo(state, d.section);
  return !!hit && hit.items.some((i) => wanted.includes(i));
}

// The routine that would do most for the due goals if done next — the most
// due-now goals, then the most coming up, then the one used most lately —
// as { routine, goals, addOn }, where `goals` are the due goals it helps and
// `addOn` ({ routine, goals } or null) is a second routine that would help
// the most of the rest, to do alongside it. Null when no routine helps any.
// `due` is dueGoals output; `usage` ranks ties (see routineUsageCounts).
export function suggestSession(due, routines, exerciseById, today, usage = new Map()) {
  if (due.length === 0) return null;
  const covers = routines.map((routine) => {
    const entry = sessionOf(routine, today);
    return { routine, helped: due.filter((d) => helps(d, entry, exerciseById)) };
  });
  const score = (helped) => [helped.filter((d) => d.section === "now").length, helped.length];
  const better = (a, b, of) => {
    const [x, y] = [score(of(a)), score(of(b))];
    return x[0] - y[0] || x[1] - y[1] || (usage.get(a.routine.id)?.total || 0) - (usage.get(b.routine.id)?.total || 0);
  };
  const pick = (list, of) => list.filter((c) => of(c).length > 0).reduce((best, c) => (!best || better(c, best, of) > 0 ? c : best), null);

  const first = pick(covers, (c) => c.helped);
  if (!first) return null;
  const rest = (c) => c.helped.filter((d) => !first.helped.includes(d));
  const second = pick(
    covers.filter((c) => c !== first),
    rest
  );
  return {
    routine: first.routine,
    goals: first.helped.map((d) => d.summary.goal),
    addOn: second ? { routine: second.routine, goals: rest(second).map((d) => d.summary.goal) } : null,
  };
}
