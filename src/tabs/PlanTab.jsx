import { useState, useMemo } from "react";
import { Plus, Target, ChevronUp, ChevronDown, ChevronRight } from "lucide-react";
import { todayISO } from "../lib/id.js";
import { nameMap } from "../lib/search.js";
import { useSheets } from "../lib/SheetStack.js";
import { useLog } from "../lib/LogContext.js";
import useStoredState from "../lib/useStoredState.js";
import { goalSummaries, goalLabel, frequencyLabel, recentWindows, progressText, isActive, sortSummaries, moveGoal, GOAL_STATUSES, GOAL_SORTS } from "../lib/goals.js";
import { PageHeader, PageBody } from "../ui/Page.jsx";
import EmptyState from "../ui/EmptyState.jsx";
import SegmentedToggle from "../ui/SegmentedToggle.jsx";
import IconBtn from "../ui/IconBtn.jsx";
import GoalEditor from "./GoalEditor.jsx";
import { StatusPill, PeriodStrip, GOAL_ACCENT } from "./GoalParts.jsx";
import { cardStyle, primaryBtnStyle, metaStyle, eyebrowStyle } from "../ui/styles.js";

// The Plan: goals for how often to train something ("plyometrics twice a
// week", "strength + chest once a month"), each checked against your lifting
// sessions over a rolling window (the last `days` days). A card per goal
// with where it stands and the last eight windows at a glance; tapping one opens its
// summary and history (see GoalSheet). Home warns about the ones slipping.
// Sorted by status (grouped under a heading per status, worst first, each
// heading folding away), by name, or in your own order (↑/↓ on each card);
// the sort and the folded headings are remembered on this device. Inactive
// goals are listed last, greyed out, and left out of the counts.
export default function PlanTab({ goals, sessions, exercises }) {
  const sheets = useSheets();
  const { setGoals } = useLog();
  const [adding, setAdding] = useState(false);
  const [sort, setSort] = useStoredState("plan.sort", "status", (v) => v in GOAL_SORTS);
  const [folded, setFolded] = useStoredState("plan.folded", [], Array.isArray);
  const toggleFold = (key) => setFolded((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  const today = todayISO();
  const exerciseById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const exerciseNameById = useMemo(() => nameMap(exercises), [exercises]);
  const summaries = useMemo(() => goalSummaries(goals, sessions, exerciseById, today), [goals, sessions, exerciseById, today]);

  const sorted = useMemo(() => sortSummaries(summaries, sort, (goal) => goalLabel(goal, exerciseNameById)), [summaries, sort, exerciseNameById]);
  const active = sorted.filter(({ goal }) => isActive(goal));
  const inactive = sorted.filter(({ goal }) => !isActive(goal));
  const counts = {};
  active.forEach(({ state }) => (counts[state.status] = (counts[state.status] || 0) + 1));
  const overview = ["behind", "overdue", "risk", "on"]
    .filter((s) => counts[s])
    .map((s) => `${counts[s]} ${GOAL_STATUSES[s].label.toLowerCase()}`)
    .join(" · ");
  // In your own order, each card gets ↑/↓ to move it within its section.
  const card = (summary, i, list) => (
    <GoalCard
      key={summary.goal.id}
      summary={summary}
      today={today}
      exerciseNameById={exerciseNameById}
      onOpen={() => sheets.open({ kind: "goal", id: summary.goal.id })}
      move={sort === "custom" ? { up: i > 0, down: i < list.length - 1, onMove: (dir) => setGoals((prev) => moveGoal(prev, summary.goal.id, dir)) } : null}
    />
  );
  // A heading that folds its goals away, with how many there are.
  const section = (key, label, list, color) => (
    <div key={key} style={{ display: "contents" }}>
      <SectionHeading label={label} count={list.length} color={color} open={!folded.includes(key)} onToggle={() => toggleFold(key)} />
      {!folded.includes(key) && list.map(card)}
    </div>
  );
  const statusSections = ["behind", "overdue", "risk", "on"]
    .map((status) => [status, active.filter(({ state }) => state.status === status)])
    .filter(([, list]) => list.length > 0)
    .map(([status, list]) => section(status, GOAL_STATUSES[status].label, list, `var(${GOAL_STATUSES[status].accent})`));

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
            {summaries.length > 1 && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={metaStyle}>Sort</span>
                <SegmentedToggle options={Object.entries(GOAL_SORTS).map(([key, o]) => ({ key, label: o.label }))} value={sort} setValue={setSort} accent={GOAL_ACCENT} />
              </div>
            )}
            {active.length === 0 ? (
              <div style={{ ...metaStyle, textAlign: "center", padding: "12px 0" }}>No active goals. Make one active to track it.</div>
            ) : sort === "status" ? (
              statusSections
            ) : (
              active.map(card)
            )}
            {inactive.length > 0 && section("inactive", "Inactive", inactive, "var(--text-faint)")}
          </>
        )}
      </PageBody>

      {adding && <GoalEditor onClose={() => setAdding(false)} />}
    </>
  );
}

// A section's heading on the Plan page, "BEHIND · 2" with a rule after it;
// tapping it folds the section away or opens it again.
function SectionHeading({ label, count, color, open, onToggle }) {
  return (
    <button
      onClick={onToggle}
      aria-expanded={open}
      style={{ ...eyebrowStyle, color, display: "flex", alignItems: "center", gap: 8, marginTop: 12, background: "none", border: "none", padding: 0, cursor: "pointer", width: "100%", textAlign: "left" }}
    >
      {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      {label} · {count}
      <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
    </button>
  );
}

// One goal on the Plan page: its name, how often, where it stands and the
// last eight windows. An inactive goal is greyed out, with an Inactive pill.
// `move` ({ up, down, onMove }) adds ↑/↓ buttons, in your own order.
function GoalCard({ summary: { goal, matches, state }, today, exerciseNameById, onOpen, move }) {
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
        {move && (
          <div style={{ display: "flex", margin: "-6px -6px -6px 0" }} onClick={(e) => e.stopPropagation()}>
            <IconBtn label="Move up" disabled={!move.up} onClick={() => move.onMove(-1)}>
              <ChevronUp size={16} />
            </IconBtn>
            <IconBtn label="Move down" disabled={!move.down} onClick={() => move.onMove(1)}>
              <ChevronDown size={16} />
            </IconBtn>
          </div>
        )}
      </div>
      <PeriodStrip rows={recentWindows(goal, matches, today, 8)} target={state.target} />
    </div>
  );
}
