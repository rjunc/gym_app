import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthCells } from "../lib/activity.js";

const WEEK_START = 0; // 0 = Sunday, 1 = Monday
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

const navBtnStyle = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text)",
  cursor: "pointer",
  display: "flex",
  padding: 6,
};

// One solid colour per type. A day with several types is split into equal
// hard-edged diagonal bands, one per type, so each colour stays pure and you
// can read exactly which types were logged.
function fillFor(accents) {
  if (accents.length === 1) return `var(${accents[0]})`;
  const step = 100 / accents.length;
  const stops = accents.map((a, i) => `var(${a}) ${i * step}% ${(i + 1) * step}%`);
  return `linear-gradient(135deg, ${stops.join(", ")})`;
}

function Swatch({ background }) {
  return <span style={{ width: 10, height: 10, borderRadius: 3, background, display: "inline-block" }} />;
}

// A month grid where each logged day is coloured by what was logged on it.
// Purely presentational: the parent owns which month is showing, which day is
// selected, and which entries count. `sources` is the list of types currently
// in play ({ key, label, accent }), in the order their colours are banded.
export default function ActivityCalendar({ year, month, byDate, sources, todayISO, selected, onSelect, onShift, onToday }) {
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
          const logged = sources.filter((s) => entries.some((e) => e.source === s.key));
          const isSelected = selected === cell.iso;
          const isToday = todayISO === cell.iso;
          return (
            <button
              key={cell.iso}
              onClick={() => onSelect(cell.iso)}
              aria-pressed={isSelected}
              aria-label={`${cell.iso}, ${logged.length ? logged.map((s) => s.label).join(" and ") : "nothing logged"}`}
              style={{
                aspectRatio: "1 / 1",
                minWidth: 0,
                padding: 0,
                borderRadius: 8,
                cursor: "pointer",
                background: logged.length ? fillFor(logged.map((s) => s.accent)) : "var(--surface-2)",
                border: isSelected ? "2px solid var(--text)" : "1px solid var(--border)",
                color: logged.length ? "#15160F" : "var(--text)",
                fontSize: 13,
                fontWeight: logged.length || isToday ? 700 : 500,
                // Today is underlined rather than outlined so the mark reads on
                // both a plain day and a coloured one.
                textDecoration: isToday ? "underline" : "none",
                textUnderlineOffset: 3,
              }}
            >
              {cell.day}
            </button>
          );
        })}
      </div>

      {sources.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "4px 14px", marginTop: 12, fontSize: 11, color: "var(--text-dim)" }}>
          {sources.map((s) => (
            <span key={s.key} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Swatch background={`var(${s.accent})`} /> {s.label}
            </span>
          ))}
          {sources.length === 2 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Swatch background={fillFor(sources.map((s) => s.accent))} /> Both
            </span>
          )}
        </div>
      )}
    </div>
  );
}
