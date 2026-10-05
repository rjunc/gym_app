import { useMemo } from "react";
import { CheckCircle2, ChevronRight, Target } from "lucide-react";
import { todayISO } from "../lib/id.js";
import { nameMap } from "../lib/search.js";
import { useLog } from "../lib/LogContext.js";
import { goalSummaries, isActive } from "../lib/goals.js";
import { dueGoals, nextUp, suggestSession } from "../lib/nextUp.js";
import { NextSessionCard, UpNextList } from "./PlanNext.jsx";
import { GOAL_ACCENT } from "./GoalParts.jsx";
import { cardStyle, ghostLinkStyle, eyebrowStyle } from "../ui/styles.js";

// How many Up next rows Home shows; the rest are on the Plan page.
const HOME_ROWS = 3;

// Home's word on the Plan: what to do next — the suggested session (see
// suggestSession) and the first few things Up next (see nextUp), each
// opening its goal — or a single line saying everything's on track. Only
// active goals count; nothing at all until there's one. `onOpenPlan` goes
// to the page.
export default function PlanAlerts({ goals, sessions, exercises, onOpenPlan }) {
  const today = todayISO();
  const exerciseById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const { routines, routineUsage } = useLog();
  // Names for goals' exercises and routines (see goalLabel).
  const nameById = useMemo(() => nameMap([...exercises, ...routines]), [exercises, routines]);
  const summaries = useMemo(() => goalSummaries(goals.filter(isActive), sessions, exerciseById, today), [goals, sessions, exerciseById, today]);
  const due = useMemo(() => dueGoals(summaries, today), [summaries, today]);
  const upNext = useMemo(() => nextUp(due, nameById, today), [due, nameById, today]);
  const suggestion = useMemo(() => suggestSession(due, routines, exerciseById, today, routineUsage), [due, routines, exerciseById, today, routineUsage]);
  if (summaries.length === 0) return null;

  const viewPlan = (
    <button onClick={onOpenPlan} style={{ ...ghostLinkStyle, color: "var(--text-dim)" }}>
      View plan <ChevronRight size={14} />
    </button>
  );

  if (due.length === 0) {
    return (
      <div style={{ ...cardStyle, padding: 14, display: "flex", alignItems: "center", gap: 10 }}>
        <CheckCircle2 size={18} color={`var(${GOAL_ACCENT})`} />
        <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600 }}>{summaries.length === 1 ? "Your goal is on track" : `All ${summaries.length} goals on track`}</div>
        {viewPlan}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {suggestion && <NextSessionCard suggestion={suggestion} dueCount={due.length} nameById={nameById} />}
      <div style={{ ...cardStyle, padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Target size={14} color={`var(${GOAL_ACCENT})`} />
          <span style={{ ...eyebrowStyle, color: "var(--text-dim)", flex: 1 }}>Up next</span>
          {viewPlan}
        </div>
        <UpNextList rows={upNext} nameById={nameById} limit={HOME_ROWS} />
      </div>
    </div>
  );
}
