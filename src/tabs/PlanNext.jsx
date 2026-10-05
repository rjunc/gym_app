import { BookOpen, Dumbbell, Tag, Target, ChevronRight, Plus } from "lucide-react";
import { useSheets } from "../lib/SheetStack.js";
import { goalLabel, frequencyLabel } from "../lib/goals.js";
import { PLAN_SECTIONS } from "../lib/nextUp.js";
import { GOAL_ACCENT } from "./GoalParts.jsx";
import { cardStyle, eyebrowStyle, metaStyle } from "../ui/styles.js";

// "Upper push day, strength +2": the goals something is for, by name.
function goalsLine(goals, nameById, max = 2) {
  const names = goals.slice(0, max).map((g) => goalLabel(g, nameById));
  return names.join(", ") + (goals.length > max ? ` +${goals.length - max}` : "");
}

// The suggested next session (see suggestSession): the routine to do, how
// many of the due goals it covers and which, and a second routine to add
// that covers more. Tapping a routine opens it. `dueCount` is how many goals
// are due (now or soon).
export function NextSessionCard({ suggestion, dueCount, nameById }) {
  const sheets = useSheets();
  const { routine, goals, addOn } = suggestion;
  const openRoutine = (id) => sheets?.open({ kind: "routine", id });
  return (
    <div style={{ ...cardStyle, padding: 14, display: "flex", flexDirection: "column", gap: 10, borderColor: `color-mix(in srgb, var(${GOAL_ACCENT}) 45%, var(--border))`, background: `color-mix(in srgb, var(${GOAL_ACCENT}) 7%, var(--surface))` }}>
      <div style={{ ...eyebrowStyle, color: `var(${GOAL_ACCENT})` }}>Next session</div>
      <button
        onClick={() => openRoutine(routine.id)}
        style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", padding: 0, color: "var(--text)", cursor: "pointer", textAlign: "left" }}
      >
        <BookOpen size={20} style={{ color: `var(${GOAL_ACCENT})`, flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0, fontSize: 18, fontWeight: 700 }}>{routine.name}</span>
        <ChevronRight size={16} style={{ color: "var(--text-faint)", flexShrink: 0 }} />
      </button>
      <div style={{ fontSize: 13, lineHeight: 1.45 }}>
        Covers <b>{goals.length}</b> of your {dueCount} due {dueCount === 1 ? "goal" : "goals"}: <span style={{ color: "var(--text-dim)" }}>{goalsLine(goals, nameById, 3)}</span>
      </div>
      {addOn && (
        <button
          onClick={() => openRoutine(addOn.routine.id)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", padding: 0, color: "var(--text-dim)", cursor: "pointer", textAlign: "left", fontSize: 13 }}
        >
          <Plus size={14} style={{ flexShrink: 0 }} />
          <span>
            Add <b style={{ color: "var(--text)" }}>{addOn.routine.name}</b> for {addOn.goals.length} more: {goalsLine(addOn.goals, nameById)}
          </span>
        </button>
      )}
    </div>
  );
}

const CHIP_ICON = { tag: Tag, exercise: Dumbbell, routine: BookOpen };
const iconOf = (chip) => (!chip ? Target : chip.tag ? CHIP_ICON.tag : chip.routineId ? CHIP_ICON.routine : CHIP_ICON.exercise);

// The Up next list (see nextUp): a row per thing to train — a tag, an
// exercise, a routine, or a goal that takes more than one thing — with when
// it's due (red when due now) and the goals it's for. Tapping one opens its
// most urgent goal. `limit` shows only the first few, with how many more.
export function UpNextList({ rows, nameById, limit }) {
  const sheets = useSheets();
  const shown = limit ? rows.slice(0, limit) : rows;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {shown.map((row) => {
        const Icon = iconOf(row.chip);
        const accent = PLAN_SECTIONS[row.section].accent;
        return (
          <button
            key={row.key}
            onClick={() => sheets?.open({ kind: "goal", id: row.goals[0].id })}
            className="nav-item"
            style={{ display: "flex", alignItems: "center", gap: 10, width: "calc(100% + 16px)", padding: 8, margin: "0 -8px", boxSizing: "border-box", background: "none", border: "none", borderRadius: 10, color: "var(--text)", cursor: "pointer", textAlign: "left" }}
          >
            <Icon size={16} style={{ color: "var(--text-dim)", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.label}</div>
              <div style={{ ...metaStyle, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {row.chip && !(row.goals.length === 1 && goalLabel(row.goals[0], nameById) === row.label) ? `For ${goalsLine(row.goals, nameById)}` : frequencyLabel(row.goals[0])}
              </div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: `var(${accent})`, whiteSpace: "nowrap" }}>{row.when}</span>
          </button>
        );
      })}
      {limit && rows.length > limit && <div style={{ ...metaStyle, marginTop: 4 }}>{rows.length - limit} more on the Plan.</div>}
    </div>
  );
}
