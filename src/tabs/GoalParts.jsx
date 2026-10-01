import { GOAL_STATUSES, periodShortLabel } from "../lib/goals.js";
import { eyebrowStyle } from "../ui/styles.js";

// A goal's status as a small coloured pill: On track, At risk, Off track, Done.
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

// The last few weeks or months as a row of bars, oldest first: each fills
// up to the target and turns green once met. The current period is outlined
// (it's still going). `rows` is recentPeriods output; `labels` adds each
// period's short name under its bar.
export function PeriodStrip({ rows, period, target, labels = false }) {
  return (
    <div style={{ display: "flex", gap: 4 }} role="img" aria-label={rows.map((r) => `${periodShortLabel(r.period, period)}: ${r.count} of ${target}`).join(", ")}>
      {rows.map((r, i) => {
        const current = i === rows.length - 1;
        const fill = Math.min(1, r.count / target);
        return (
          <div key={r.period.start} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
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
                  background: r.met ? "var(--accent2)" : current ? "var(--accent)" : "var(--danger)",
                  opacity: r.met ? 1 : 0.7,
                }}
              />
            </div>
            {labels && (
              <span style={{ fontSize: 10, color: current ? "var(--text)" : "var(--text-faint)", fontWeight: current ? 700 : 500, whiteSpace: "nowrap" }}>
                {periodShortLabel(r.period, period)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
