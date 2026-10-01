import { useState, useMemo } from "react";
import { Plus, Target } from "lucide-react";
import { todayISO } from "../lib/id.js";
import { nameMap } from "../lib/search.js";
import { useSheets } from "../lib/SheetStack.js";
import { goalSummaries, goalLabel, frequencyLabel, recentWindows, progressText, isActive, GOAL_STATUSES } from "../lib/goals.js";
import { PageHeader, PageBody } from "../ui/Page.jsx";
import EmptyState from "../ui/EmptyState.jsx";
import GoalEditor from "./GoalEditor.jsx";
import { StatusPill, PeriodStrip, GOAL_ACCENT } from "./GoalParts.jsx";
import { cardStyle, primaryBtnStyle, metaStyle, eyebrowStyle } from "../ui/styles.js";

// The Plan: goals for how often to train something ("plyometrics twice a
// week", "strength + chest once a month"), each checked against your lifting
// sessions over a rolling window (the last 7 or 30 days). A card per goal
// with where it stands and the last eight windows at a glance; tapping one opens its
// summary and history (see GoalSheet). Home warns about the ones slipping.
// Inactive goals are listed last, greyed out, and left out of the counts.
export default function PlanTab({ goals, sessions, exercises }) {
  const sheets = useSheets();
  const [adding, setAdding] = useState(false);
  const today = todayISO();
  const exerciseById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const exerciseNameById = useMemo(() => nameMap(exercises), [exercises]);
  const summaries = useMemo(() => goalSummaries(goals, sessions, exerciseById, today), [goals, sessions, exerciseById, today]);

  const active = summaries.filter(({ goal }) => isActive(goal));
  const inactive = summaries.filter(({ goal }) => !isActive(goal));
  const counts = {};
  active.forEach(({ state }) => (counts[state.status] = (counts[state.status] || 0) + 1));
  const overview = ["behind", "overdue", "risk", "on"]
    .filter((s) => counts[s])
    .map((s) => `${counts[s]} ${GOAL_STATUSES[s].label.toLowerCase()}`)
    .join(" · ");
  const card = (summary) => <GoalCard key={summary.goal.id} summary={summary} today={today} exerciseNameById={exerciseNameById} onOpen={() => sheets.open({ kind: "goal", id: summary.goal.id })} />;

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
          <>
            {active.length > 0 ? active.map(card) : <div style={{ ...metaStyle, textAlign: "center", padding: "12px 0" }}>No active goals. Make one active to track it.</div>}
            {inactive.length > 0 && (
              <>
                <div style={{ ...eyebrowStyle, color: "var(--text-faint)", display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                  Inactive
                  <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
                </div>
                {inactive.map(card)}
              </>
            )}
          </>
        )}
      </PageBody>

      {adding && <GoalEditor onClose={() => setAdding(false)} />}
    </>
  );
}

// One goal on the Plan page: its name, how often, where it stands and the
// last eight windows. An inactive goal is greyed out, with an Inactive pill.
function GoalCard({ summary: { goal, matches, state }, today, exerciseNameById, onOpen }) {
  const active = isActive(goal);
  return (
    <div
      onClick={onOpen}
      className="card-click"
      style={{
        ...cardStyle,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        borderLeft: `3px solid ${active ? `var(${GOAL_STATUSES[state.status].accent})` : "var(--border-strong)"}`,
        ...(active ? {} : { opacity: 0.6 }),
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{goalLabel(goal, exerciseNameById)}</div>
          <div style={{ ...metaStyle, marginTop: 2 }}>
            {frequencyLabel(goal)} · {progressText(goal, state, today)}
          </div>
        </div>
        <StatusPill status={active ? state.status : "inactive"} />
      </div>
      <PeriodStrip rows={recentWindows(goal, matches, today, 8)} target={state.target} />
    </div>
  );
}
