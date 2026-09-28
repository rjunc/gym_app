import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthCells } from "../lib/activity.js";
import { secondaryBtnStyle } from "./styles.js";

const WEEK_START = 0; // 0 = Sunday, 1 = Monday
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

const navBtnStyle = {
  background: "transparent",
  border: "1px solid var(--border-strong)",
  borderRadius: 10,
  color: "var(--text)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 34,
  height: 34,
  padding: 0,
};

// A logged day's background: its type's tint, or for a day with several
// types, equal hard-edged diagonal bands of each tint, so each colour stays
// pure and you can read exactly which types were logged (the dots under the
// number say the same thing in solid colour).
function fillFor(accents) {
  if (accents.length === 1) return `var(${accents[0]}-dim)`;
  const step = 100 / accents.length;
  const stops = accents.map((a, i) => `var(${a}-dim) ${i * step}% ${(i + 1) * step}%`);
  return `linear-gradient(135deg, ${stops.join(", ")})`;
}

// A month grid where each logged day is tinted and dotted by what was logged
// on it. Purely presentational: the parent owns which month is showing, which
// day is selected, and which entries count. `sources` is the list of types
// currently in play ({ key, label, accent }), in the order their colours are
// banded. `footer` goes under the grid (Home's month summary).
export default function ActivityCalendar({ year, month, byDate, sources, todayISO, selected, onSelect, onShift, onToday, footer }) {
  const cells = monthCells(year, month, WEEK_START);
  const label = new Date(year, month, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const isCurrentMonth = todayISO.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontWeight: 600, fontSize: 16, flex: 1, letterSpacing: "-0.01em" }}>{label}</span>
        {!isCurrentMonth && (
          <button onClick={onToday} style={{ ...secondaryBtnStyle, minHeight: 34, padding: "0 12px", background: "transparent" }}>
            Today
          </button>
        )}
        <button onClick={() => onShift(-1)} aria-label="Previous month" style={navBtnStyle}>
          <ChevronLeft size={17} />
        </button>
        <button onClick={() => onShift(1)} aria-label="Next month" style={navBtnStyle}>
          <ChevronRight size={17} />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "var(--text-faint)", paddingBottom: 4 }}>
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
              aria-label={`${cell.iso}${isToday ? " (today)" : ""}, ${logged.length ? logged.map((s) => s.label).join(" and ") : "nothing logged"}`}
              style={{
                aspectRatio: "1 / 1",
                minWidth: 0,
                padding: 0,
                borderRadius: 10,
                cursor: "pointer",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                background: logged.length ? fillFor(logged.map((s) => s.accent)) : "transparent",
                border: "none",
                boxShadow: isSelected ? "inset 0 0 0 2px var(--text)" : "none",
                color: isToday ? "var(--accent)" : logged.length ? "var(--text)" : "var(--text-dim)",
                fontSize: 14,
                fontWeight: logged.length || isToday ? 600 : 400,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <span style={{ lineHeight: 1 }}>{cell.day}</span>
              <span style={{ display: "flex", gap: 3, height: 5 }}>
                {logged.map((s) => (
                  <span key={s.key} style={{ width: 5, height: 5, borderRadius: 999, background: `var(${s.accent})` }} />
                ))}
                {isToday && logged.length === 0 && <span style={{ width: 12, height: 2, marginTop: 1, borderRadius: 2, background: "var(--accent)" }} />}
              </span>
            </button>
          );
        })}
      </div>
      {footer}
    </div>
  );
}
