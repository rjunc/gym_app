import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthCells, intensityLevel } from "../lib/activity.js";

const WEEK_START = 0; // 0 = Sunday, 1 = Monday
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
// How strongly the accent fills a day, by intensityLevel (index 0 = no fill).
const FILL_OPACITY = [0, 0.3, 0.6, 0.9];

const navBtnStyle = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text)",
  cursor: "pointer",
  display: "flex",
  padding: 6,
};

// A month grid where each day is shaded by how many entries it has and marked
// with a dot per entry type. Purely presentational: the parent owns which
// month is showing, which day is selected, and which entries count.
export default function ActivityCalendar({ year, month, byDate, sourceAccent, todayISO, selected, onSelect, onShift, onToday }) {
  const cells = monthCells(year, month, WEEK_START);
  const label = new Date(year, month, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const isCurrentMonth = todayISO.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <button onClick={() => onShift(-1)} aria-label="Previous month" style={navBtnStyle}>
          <ChevronLeft size={16} />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{label}</span>
          {!isCurrentMonth && (
            <button
              onClick={onToday}
              style={{ ...navBtnStyle, padding: "3px 8px", fontSize: 11, fontWeight: 600, color: "var(--accent)" }}
            >
              Today
            </button>
          )}
        </div>
        <button onClick={() => onShift(1)} aria-label="Next month" style={navBtnStyle}>
          <ChevronRight size={16} />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 10, fontWeight: 600, color: "var(--text-dim)", paddingBottom: 2 }}>
            {WEEKDAYS[(i + WEEK_START) % 7]}
          </div>
        ))}

        {cells.map((cell, i) => {
          if (!cell) return <div key={`pad-${i}`} />;
          const entries = byDate.get(cell.iso) || [];
          const level = intensityLevel(entries.length);
          const isSelected = selected === cell.iso;
          const isToday = todayISO === cell.iso;
          const sources = [...new Set(entries.map((e) => e.source))];
          return (
            <button
              key={cell.iso}
              onClick={() => onSelect(cell.iso)}
              aria-pressed={isSelected}
              aria-label={`${cell.iso}, ${entries.length} ${entries.length === 1 ? "entry" : "entries"}`}
              style={{
                position: "relative",
                aspectRatio: "1 / 1",
                minWidth: 0,
                padding: 0,
                borderRadius: 8,
                cursor: "pointer",
                background: "var(--surface-2)",
                border: isSelected ? "2px solid var(--text)" : `1px solid ${isToday ? "var(--text-dim)" : "var(--border)"}`,
                color: level >= 2 ? "#15160F" : "var(--text)",
                overflow: "hidden",
              }}
            >
              {level > 0 && (
                <span style={{ position: "absolute", inset: 0, background: "var(--accent)", opacity: FILL_OPACITY[level] }} />
              )}
              <span
                style={{
                  position: "absolute",
                  top: 4,
                  left: 0,
                  right: 0,
                  textAlign: "center",
                  fontSize: 12,
                  fontWeight: isToday || level > 0 ? 700 : 500,
                }}
              >
                {cell.day}
              </span>
              {sources.length > 0 && (
                <span
                  style={{ position: "absolute", bottom: 4, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 3 }}
                >
                  {sources.map((s) => (
                    <span
                      key={s}
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: `var(${sourceAccent[s]})`,
                        // Keeps a dot visible when it sits on a fill of its own colour.
                        boxShadow: "0 0 0 1px rgba(21,22,15,0.7)",
                      }}
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
