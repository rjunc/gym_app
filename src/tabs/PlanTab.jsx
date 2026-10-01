import { useState, useMemo } from "react";
import { Plus, Target } from "lucide-react";
import { todayISO } from "../lib/id.js";
import { nameMap } from "../lib/search.js";
import { useSheets } from "../lib/SheetStack.js";
import { goalSummaries, goalLabel, frequencyLabel, recentPeriods, progressText, GOAL_STATUSES } from "../lib/goals.js";
import { PageHeader, PageBody } from "../ui/Page.jsx";
import EmptyState from "../ui/EmptyState.jsx";
import GoalEditor, { GOAL_ACCENT } from "./GoalEditor.jsx";
import { StatusPill, PeriodStrip } from "./GoalParts.jsx";
import { cardStyle, primaryBtnStyle, metaStyle } from "../ui/styles.js";

// The Plan: goals for how often to train something ("plyometrics twice a
// week", "strength + chest once a month"), each checked against your
// sessions and mat sessions. A card per goal with where it stands this
// week or month and the last eight at a glance; tapping one opens its
// summary and history (see GoalSheet). Home warns about the ones slipping.
export default function PlanTab({ goals, sessions, rolls, exercises }) {
  const sheets = useSheets();
  const [adding, setAdding] = useState(false);
  const today = todayISO();
  const exerciseById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const exerciseNameById = useMemo(() => nameMap(exercises), [exercises]);
  const summaries = useMemo(() => goalSummaries(goals, { sessions, rolls }, exerciseById, today), [goals, sessions, rolls, exerciseById, today]);

  const counts = {};
  summaries.forEach(({ state }) => (counts[state.status] = (counts[state.status] || 0) + 1));
  const overview = ["off", "risk", "on", "done"]
    .filter((s) => counts[s])
    .map((s) => `${counts[s]} ${GOAL_STATUSES[s].label.toLowerCase()}`)
    .join(" · ");

  const addButton = (
    <button onClick={() => setAdding(true)} style={{ ...primaryBtnStyle, background: `var(${GOAL_ACCENT})` }}>
      <Plus size={16} /> Add goal
    </button>
  );

  return (
    <>
      <PageHeader eyebrow="Training" title="Plan" actions={goals.length > 0 ? addButton : undefined}>
        {overview && <div style={metaStyle}>{overview}</div>}
      </PageHeader>

      <PageBody>
        {summaries.length === 0 ? (
          <EmptyState icon={Target} title="No goals yet" action={addButton}>
            Set how often you want to train something — a tag like plyometrics, a mix like strength + chest, or a particular exercise — and the Plan checks your sessions to keep you on track.
          </EmptyState>
        ) : (
          summaries.map(({ goal, matches, state }) => (
            <div
              key={goal.id}
              onClick={() => sheets.open({ kind: "goal", id: goal.id })}
              className="card-click"
              style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 12, borderLeft: `3px solid var(${GOAL_STATUSES[state.status].accent})` }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{goalLabel(goal, exerciseNameById)}</div>
                  <div style={{ ...metaStyle, marginTop: 2 }}>
                    {frequencyLabel(goal)} · {progressText(goal, state)}
                  </div>
                </div>
                <StatusPill status={state.status} />
              </div>
              <PeriodStrip rows={recentPeriods(goal, matches, today, 8)} period={goal.period} target={state.target} />
            </div>
          ))
        )}
      </PageBody>

      {adding && <GoalEditor onClose={() => setAdding(false)} />}
    </>
  );
}
