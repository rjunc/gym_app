import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";
import { todayISO } from "../lib/id.js";
import { nameMap } from "../lib/search.js";
import { useSheets } from "../lib/SheetStack.js";
import { goalSummaries, goalLabel, progressText, isActive, GOAL_STATUSES } from "../lib/goals.js";
import { StatusPill } from "./GoalParts.jsx";
import { cardStyle, ghostLinkStyle, eyebrowStyle, metaStyle } from "../ui/styles.js";

// Home's word on the Plan: the goals that are behind, overdue or at risk
// (worst first), each opening its summary, or a single line saying everything's on
// track. Only active goals count; nothing at all until there's one. `onOpenPlan` goes to the page.
export default function PlanAlerts({ goals, sessions, exercises, onOpenPlan }) {
  const sheets = useSheets();
  const today = todayISO();
  const exerciseById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const exerciseNameById = useMemo(() => nameMap(exercises), [exercises]);
  const summaries = useMemo(() => goalSummaries(goals.filter(isActive), sessions, exerciseById, today), [goals, sessions, exerciseById, today]);
  if (summaries.length === 0) return null;

  const slipping = summaries
    .filter(({ state }) => state.status !== "on")
    .sort((a, b) => GOAL_STATUSES[a.state.status].rank - GOAL_STATUSES[b.state.status].rank);
  const worst = slipping[0]?.state.status;
  const accent = worst ? GOAL_STATUSES[worst].accent : "--accent2";
  const onTrack = summaries.length - slipping.length;

  return (
    <div style={{ ...cardStyle, padding: 14, borderColor: `color-mix(in srgb, var(${accent}) 40%, var(--border))`, background: `color-mix(in srgb, var(${accent}) 6%, var(--surface))` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {worst ? <AlertTriangle size={18} color={`var(${accent})`} /> : <CheckCircle2 size={18} color={`var(${accent})`} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...eyebrowStyle, color: `var(${accent})` }}>Plan</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {worst
              ? `${slipping.length} of ${summaries.length} ${summaries.length === 1 ? "goal needs" : "goals need"} attention`
              : summaries.length === 1
                ? "Your goal is on track"
                : `All ${summaries.length} goals on track`}
          </div>
        </div>
        <button onClick={onOpenPlan} style={{ ...ghostLinkStyle, color: "var(--text-dim)" }}>
          View plan <ChevronRight size={14} />
        </button>
      </div>
      {slipping.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 10 }}>
          {slipping.map(({ goal, state }) => (
            <button
              key={goal.id}
              onClick={() => sheets.open({ kind: "goal", id: goal.id })}
              className="nav-item"
              style={{ display: "flex", alignItems: "center", gap: 10, width: "calc(100% + 16px)", padding: 8, margin: "0 -8px", boxSizing: "border-box", background: "none", border: "none", borderRadius: 10, color: "var(--text)", cursor: "pointer", textAlign: "left" }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{goalLabel(goal, exerciseNameById)}</div>
                <div style={metaStyle}>{progressText(goal, state, today)}</div>
              </div>
              <StatusPill status={state.status} />
            </button>
          ))}
          {onTrack > 0 && <div style={{ ...metaStyle, marginTop: 4 }}>{onTrack} more on track.</div>}
        </div>
      )}
    </div>
  );
}
