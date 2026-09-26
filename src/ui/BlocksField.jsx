import { useState } from "react";
import { Plus, X, ChevronUp, ChevronDown } from "lucide-react";
import {
  MEASURES,
  DISTANCE_UNITS,
  TIME_UNITS,
  resolveMeasure,
  switchMeasure,
  measureOfSets,
  distanceUnitOfSets,
  timeUnitOfSets,
  defaultTimeUnit,
  setDistanceUnit,
  setTimeUnit,
  blankRow,
  rowFields,
  lastBlocksFor,
  matchingBlock,
  moveBlock,
  formatSets,
  toDraftRows,
  WEIGHT_UNIT,
  DISTANCE_UNIT,
} from "../lib/sets.js";
import { inputStyle, ghostLinkStyle } from "./styles.js";

// How each set field's text box looks: keyboard, placeholder, and the word
// shown before it or the unit after it (distance's and time's are switches
// instead, see the row below).
const FIELD_INPUT = {
  weight: { inputMode: "decimal", placeholder: "0", suffix: WEIGHT_UNIT },
  distance: { inputMode: "decimal", placeholder: "0", suffix: "" },
  reps: { inputMode: "numeric", placeholder: "0", suffix: "reps" },
  seconds: { inputMode: "decimal", placeholder: "0", suffix: "" },
  level: { inputMode: "decimal", placeholder: "0", prefix: "level", suffix: "" },
};

// The small "Reps ▾" switch in a block's header, and the "m ▾" / "min ▾" ones
// after a distance or time.
const selectStyle = {
  background: "transparent",
  border: "none",
  color: "var(--text-dim)",
  fontSize: 11,
  fontFamily: "inherit",
  cursor: "pointer",
  padding: 0,
};

// One choice in the "Log as" row for an exercise never logged before.
const measureChipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 999,
  padding: "4px 10px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const iconBtnStyle = { background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", display: "flex", padding: 2 };

const shortDate = (iso) => {
  const d = new Date(iso + "T00:00:00");
  return isNaN(d) ? iso : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

// What was done in the session, in order: one card per block of the form's
// draft `blocks` (see lib/sets.js), numbered, under the Exercises picker that
// adds them. The same exercise can have several blocks (squats first, back-off
// squats at the end); ↑/↓ reorder them and × removes one. Nothing inside is
// required — a block with no sets is saved as "did it, no numbers".
// How a block is measured is picked here, not on the exercise: it starts as
// whatever that exercise was logged as last time, can be switched per block,
// and an exercise never logged before asks first ("Log as"). The pick lives
// on the draft block as `measure` and isn't saved — the saved sets already
// say how they were logged. Distance and time units work the same way:
// tapping the unit after a distance (mi/km/m/yd) or time (min/sec) switches
// every row of that block, and new rows start in the unit last logged.
// "+ Note" opens a one-line note for the block; it's shown open whenever the
// block already has one.
// "Add set" copies the previous row, so 5×5 is one row typed plus four taps.
// "Last" shows the matching block from the most recent other session that
// logged the exercise (from `history`, not after the date being logged) — the
// same round of it if it was done more than once — and can copy its sets in.
export default function BlocksField({ form, setForm, exercises, history = [], entryId, accentVar }) {
  const [openNotes, setOpenNotes] = useState([]); // blocks whose "+ Note" was tapped, by key
  const blocks = form.blocks || [];
  if (blocks.length === 0) return null;

  const updateBlock = (key, update) => setForm((f) => ({ ...f, blocks: (f.blocks || []).map((b) => (b.key === key ? update(b) : b)) }));
  const setRows = (key, update) => updateBlock(key, (b) => ({ ...b, rows: update(b.rows || []) }));
  const setMeasure = (key, measure, update) => updateBlock(key, (b) => ({ ...b, measure, rows: update(b.rows || []) }));
  // Typing keeps the box open even if it's cleared, so it doesn't vanish mid-edit.
  const setNote = (key, note) => {
    setOpenNotes((keys) => (keys.includes(key) ? keys : [...keys, key]));
    updateBlock(key, (b) => ({ ...b, note }));
  };
  const move = (index, delta) => setForm((f) => ({ ...f, blocks: moveBlock(f.blocks || [], index, delta) }));
  const remove = (key) => setForm((f) => ({ ...f, blocks: (f.blocks || []).filter((b) => b.key !== key) }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {blocks.map((block, index) => {
        const exercise = exercises.find((e) => e.id === block.exerciseId);
        const name = exercise ? exercise.name : "Deleted exercise";
        const rows = block.rows || [];
        const note = block.note || "";
        const noteOpen = note !== "" || openNotes.includes(block.key);
        // Which round of this exercise this block is (0 for its first).
        const occurrence = blocks.slice(0, index).filter((b) => b.exerciseId === block.exerciseId).length;
        const last = lastBlocksFor(history, block.exerciseId, { excludeId: entryId, onOrBefore: form.date });
        const lastBlock = last && matchingBlock(last.blocks, occurrence);
        const lastSets = lastBlock ? lastBlock.sets || [] : [];
        const measure = resolveMeasure({ chosen: block.measure, rows, lastSets, exercise });
        const units = {
          distanceUnit: distanceUnitOfSets(rows) || distanceUnitOfSets(lastSets) || DISTANCE_UNIT,
          timeUnit: timeUnitOfSets(rows) || timeUnitOfSets(lastSets) || defaultTimeUnit(measure),
        };
        return (
          <div key={block.key} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 700, width: 14, flexShrink: 0 }}>{index + 1}</span>
              <span style={{ fontWeight: 700, fontSize: 13, flex: 1, minWidth: 0 }}>{name}</span>
              {measure && (
                <select
                  value={measure}
                  onChange={(e) => setMeasure(block.key, e.target.value, (list) => switchMeasure(list, e.target.value, units))}
                  aria-label={`How ${name} is logged`}
                  style={{ ...selectStyle, flexShrink: 0 }}
                >
                  {Object.entries(MEASURES).map(([key, m]) => (
                    <option key={key} value={key}>
                      {m.label}
                    </option>
                  ))}
                </select>
              )}
              <button onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${name} up`} style={{ ...iconBtnStyle, opacity: index === 0 ? 0.3 : 1 }}>
                <ChevronUp size={15} />
              </button>
              <button
                onClick={() => move(index, 1)}
                disabled={index === blocks.length - 1}
                aria-label={`Move ${name} down`}
                style={{ ...iconBtnStyle, opacity: index === blocks.length - 1 ? 0.3 : 1 }}
              >
                <ChevronDown size={15} />
              </button>
              <button onClick={() => remove(block.key)} aria-label={`Remove ${name}`} style={iconBtnStyle}>
                <X size={15} />
              </button>
            </div>

            {lastBlock && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
                  Last ({shortDate(last.date)}
                  {last.blocks.length > 1 ? `, ${Math.min(occurrence, last.blocks.length - 1) + 1} of ${last.blocks.length}` : ""}):{" "}
                  {lastSets.length > 0 ? formatSets(lastSets) : "no sets"}
                </span>
                {lastSets.length > 0 && (
                  <button onClick={() => setMeasure(block.key, measureOfSets(lastSets), () => toDraftRows(lastSets))} style={{ ...ghostLinkStyle, color: `var(${accentVar})` }}>
                    Use
                  </button>
                )}
              </div>
            )}
            {lastBlock && lastBlock.note && <div style={{ fontSize: 11, color: "var(--text-dim)", fontStyle: "italic", marginTop: 2 }}>“{lastBlock.note}”</div>}

            {rows.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                {rows.map((row, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11, color: "var(--text-dim)", width: 14, textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
                    {rowFields(row, measure).map((field, j) => {
                      const meta = FIELD_INPUT[field];
                      return (
                        <div key={field} style={{ display: "flex", alignItems: "center", gap: 4, flex: 1, minWidth: 0 }}>
                          {j > 0 && (field === "reps" || field === "distance") && <span style={{ fontSize: 12, color: "var(--text-dim)" }}>×</span>}
                          {meta.prefix && <span style={{ fontSize: 11, color: "var(--text-dim)", flexShrink: 0 }}>{meta.prefix}</span>}
                          <input
                            value={row[field] ?? ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              setRows(block.key, (list) => list.map((r, k) => (k === i ? { ...r, [field]: value } : r)));
                            }}
                            inputMode={meta.inputMode}
                            placeholder={meta.placeholder}
                            aria-label={`Set ${i + 1} ${field}`}
                            style={{ ...inputStyle, padding: "7px 8px", minWidth: 0, flex: 1 }}
                          />
                          {meta.suffix && <span style={{ fontSize: 11, color: "var(--text-dim)", flexShrink: 0 }}>{meta.suffix}</span>}
                          {field === "seconds" && (
                            <select
                              value={row.timeUnit || "sec"}
                              onChange={(e) => setRows(block.key, (list) => setTimeUnit(list, e.target.value))}
                              aria-label={`${name} time unit`}
                              style={{ ...selectStyle, flexShrink: 0 }}
                            >
                              {TIME_UNITS.map((u) => (
                                <option key={u} value={u}>
                                  {u}
                                </option>
                              ))}
                            </select>
                          )}
                          {field === "distance" && (
                            <select
                              value={row.distanceUnit || DISTANCE_UNIT}
                              onChange={(e) => setRows(block.key, (list) => setDistanceUnit(list, e.target.value))}
                              aria-label={`${name} distance unit`}
                              style={{ ...selectStyle, flexShrink: 0 }}
                            >
                              {DISTANCE_UNITS.map((u) => (
                                <option key={u} value={u}>
                                  {u}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      );
                    })}
                    <button onClick={() => setRows(block.key, (list) => list.filter((_, k) => k !== i))} aria-label={`Remove set ${i + 1}`} style={{ ...iconBtnStyle, flexShrink: 0 }}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!measure && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Log as</span>
                {Object.entries(MEASURES).map(([key, m]) => (
                  <button
                    key={key}
                    onClick={() =>
                      setMeasure(block.key, key, (list) => (list.length > 0 ? switchMeasure(list, key, units) : [blankRow(key, { ...units, timeUnit: timeUnitOfSets(list) || defaultTimeUnit(key) })]))
                    }
                    style={{ ...measureChipStyle, color: `var(${accentVar})` }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}

            {noteOpen && (
              <input
                value={note}
                onChange={(e) => setNote(block.key, e.target.value)}
                placeholder="Note for this exercise…"
                aria-label={`${name} note`}
                autoFocus={note === ""}
                style={{ ...inputStyle, padding: "7px 8px", marginTop: 8, fontSize: 13 }}
              />
            )}

            {(measure || !noteOpen) && (
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8 }}>
                {measure && (
                  <button
                    onClick={() => setRows(block.key, (list) => [...list, list.length > 0 ? { ...list[list.length - 1] } : blankRow(measure, units)])}
                    style={{ ...ghostLinkStyle, color: `var(${accentVar})` }}
                  >
                    <Plus size={13} /> Add set
                  </button>
                )}
                {!noteOpen && (
                  <button onClick={() => setOpenNotes((keys) => [...keys, block.key])} style={{ ...ghostLinkStyle, color: `var(${accentVar})` }}>
                    <Plus size={13} /> Note
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
