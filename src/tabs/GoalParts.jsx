import { Dumbbell } from "lucide-react";
import { formatDate } from "../lib/id.js";
import { ENTRY_TYPES } from "../lib/entryTypes.js";
import { GOAL_STATUSES, GOAL_SCOPES } from "../lib/goals.js";
import SetsSummary from "../ui/SetsSummary.jsx";
import { SheetLink } from "../ui/SheetNav.jsx";
import { eyebrowStyle, cardStyle, metaStyle, chipRowStyle } from "../ui/styles.js";

export const GOAL_ACCENT = "--accent2";

// "Oct 1": the last day of a window, naming its bar.
const endLabel = ({ end }) => new Date(`${end}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });

// A goal's status as a small coloured pill: On track, At risk or Off track,
// or a grey Inactive for a goal that isn't being tracked.
export function StatusPill({ status }) {
  const meta = status === "inactive" ? { label: "Inactive" } : GOAL_STATUSES[status];
  return (
    <span
      style={{
        ...eyebrowStyle,
        fontSize: 10,
        color: meta.accent ? `var(${meta.accent})` : "var(--text-dim)",
        background: meta.accent ? `var(${meta.accent}-dim)` : "var(--surface-3)",
        borderRadius: 999,
        padding: "3px 8px",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {meta.label}
    </span>
  );
}

// The last few windows (7 or 30 days each, back to back, ending today) as a
// row of bars, oldest first: each fills up to the target and turns green
// once met. The current window, ending today, is outlined. `rows` is
// recentWindows output; `labels` adds each window's last day under its bar.
export function PeriodStrip({ rows, target, labels = false }) {
  return (
    <div style={{ display: "flex", gap: 4 }} role="img" aria-label={rows.map((r) => `To ${endLabel(r.window)}: ${r.count} of ${target}`).join(", ")}>
      {rows.map((r, i) => {
        const current = i === rows.length - 1;
        const fill = Math.min(1, r.count / target);
        return (
          <div key={r.window.end} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div
              style={{
                width: "100%",
                height: labels ? 28 : 8,
                borderRadius: labels ? 6 : 3,
                background: "var(--surface-3)",
                position: "relative",
                overflow: "hidden",
                outline: current ? "1px solid var(--border-strong)" : "none",
                outlineOffset: 1,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: `${fill * 100}%`,
                  background: r.met ? "var(--accent2)" : "var(--danger)",
                  opacity: r.met ? 1 : 0.7,
                }}
              />
            </div>
            {labels && (
              <span style={{ fontSize: 10, color: current ? "var(--text)" : "var(--text-faint)", fontWeight: current ? 700 : 500, whiteSpace: "nowrap" }}>
                {endLabel(r.window)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// One matching session: its date and title, then only the exercises that
// made it count (or a note that its tags did).
export function MatchCard({ match, current, exerciseNameById, onOpen }) {
  const { entry, blocks } = match;
  return (
    <div
      onClick={onOpen}
      className={onOpen ? "card-click" : undefined}
      style={{ ...cardStyle, padding: 12, ...(current ? { borderColor: `color-mix(in srgb, var(${GOAL_ACCENT}) 45%, var(--border))` } : { background: "var(--surface-2)" }) }}
    >
      <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{formatDate(entry.date)}</div>
      {entry.title && <div style={{ fontWeight: 600, fontSize: 14, marginTop: 4 }}>{entry.title}</div>}
      {blocks.length > 0 ? (
        <SetsSummary entry={{ blocks, groups: [] }} exerciseNameById={exerciseNameById} accent={ENTRY_TYPES.sessions.accent} includeEmpty style={{ marginTop: 6 }} />
      ) : (
        <div style={{ ...metaStyle, marginTop: 6 }}>Counted by its tags: {(entry.tags || []).join(", ")}</div>
      )}
    </div>
  );
}

// A goal's rules, read-only: a line per rule ("Any of" / "None of", its
// chips — exercises link to their sheets — and where it has to hold).
export function RulesSummary({ goal, exerciseNameById }) {
  const rules = (goal.rules || []).filter((r) => (r.tags || []).length + (r.exerciseIds || []).length > 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {rules.map((r, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ ...metaStyle, minWidth: 76, whiteSpace: "nowrap", color: r.kind === "none" ? "var(--danger)" : "var(--text-dim)", fontWeight: 600 }}>
              {i === 0 ? (r.kind === "none" ? "None of" : "Any of") : r.kind === "none" ? "And none of" : "And any of"}
            </span>
            <div style={chipRowStyle}>
              {r.tags.map((t) => (
                <RuleChip key={t} label={t} kind={r.kind} />
              ))}
              {r.exerciseIds.map((id) => (
                <RuleChip key={id} kind={r.kind} exercise label={<SheetLink sheet={exerciseNameById.has(id) ? { kind: "exercise", id } : null}>{exerciseNameById.get(id) || "Deleted exercise"}</SheetLink>} />
              ))}
            </div>
          </div>
          <span style={{ ...metaStyle, paddingLeft: 84, fontSize: 11 }}>{r.scope === "session" ? "anywhere in the session" : "on one exercise"}</span>
        </div>
      ))}
      {rules.filter((r) => r.scope !== "session").length > 1 && <div style={metaStyle}>The rules on one exercise have to be met by the same exercise.</div>}
    </div>
  );
}

// One chip in a rule: a tag, or a Library exercise (with a dumbbell), tinted
// red in a "None of" rule. `children` is its remove button, in the editor.
export function RuleChip({ label, kind, exercise = false, children }) {
  const accent = kind === "none" ? "--danger" : GOAL_ACCENT;
  return (
    <span
      style={{
        borderRadius: 999,
        padding: children ? "3px 7px 3px 10px" : "3px 10px",
        fontSize: 12,
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: `var(${accent}-dim)`,
        color: `var(${accent})`,
      }}
    >
      {exercise && <Dumbbell size={12} />}
      {label}
      {children}
    </span>
  );
}
