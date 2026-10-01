import { GOAL_STATUSES } from "../lib/goals.js";
import { eyebrowStyle } from "../ui/styles.js";

// "Oct 1": the last day of a window, naming its bar.
const endLabel = ({ end }) => new Date(`${end}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });

// A goal's status as a small coloured pill: On track, At risk or Off track.
export function StatusPill({ status }) {
  const meta = GOAL_STATUSES[status];
  return (
    <span
      style={{
        ...eyebrowStyle,
        fontSize: 10,
        color: `var(${meta.accent})`,
        background: `var(${meta.accent}-dim)`,
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
