import { useState } from "react";
import { Plus, X } from "lucide-react";
import {
  MEASURES,
  DISTANCE_UNITS,
  resolveMeasure,
  switchMeasure,
  measureOfSets,
  distanceUnitOfSets,
  timeUnitOfSets,
  defaultTimeUnit,
  setDistanceUnit,
  setTimeUnit,
  TIME_UNITS,
  blankRow,
  rowFields,
  lastSetsFor,
  formatSets,
  toDraftSets,
  WEIGHT_UNIT,
  DISTANCE_UNIT,
} from "../lib/sets.js";
import { labelStyle, inputStyle, ghostLinkStyle } from "./styles.js";

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

// The small "Reps ▾" switch in an exercise's header, and the "m ▾" one after
// a distance.
const measureSelectStyle = {
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

const shortDate = (iso) => {
  const d = new Date(iso + "T00:00:00");
  return isNaN(d) ? iso : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

// Per-set numbers for each exercise linked to the session, as an editable
// table under the Exercises picker. Works on the form's draft (`form.sets`,
// strings as typed — see toDraftSets/fromDraftSets); nothing is required, and
// an exercise with no rows is saved as linked-but-no-numbers.
// How each exercise is measured is picked here, not on the exercise: it
// starts as whatever it was logged as last time, can be switched for this
// session, and an exercise never logged before asks first ("Log as").
// The pick lives on the draft as `form.setMeasures` ({ exerciseId: measure })
// and isn't saved — the saved sets already say how they were logged.
// Distance and time units work the same way: tapping the unit after a
// distance (mi/km/m/yd) or time (min/sec) switches every row of that
// exercise, and new rows start in the unit it was last logged in.
// "+ Note" opens a one-line note for the exercise on this session
// (`form.exerciseNotes`, see cleanExerciseNotes); it's shown open whenever the
// exercise already has one.
// "Add set" copies the previous row, so 5×5 is one row typed plus four taps.
// "Last time" shows the most recent other session's sets for that exercise
// (from `history`, not after the date being logged) and can copy them in.
export default function SetsField({ form, setForm, exercises, history = [], entryId, accentVar }) {
  const [openNotes, setOpenNotes] = useState([]); // exercises whose "+ Note" was tapped
  const linked = (form.exerciseIds || []).map((id) => exercises.find((e) => e.id === id)).filter(Boolean);
  if (linked.length === 0) return null;

  // Typing keeps the box open even if it's cleared, so it doesn't vanish mid-edit.
  const setNote = (exerciseId, note) => {
    setOpenNotes((ids) => (ids.includes(exerciseId) ? ids : [...ids, exerciseId]));
    setForm((f) => ({ ...f, exerciseNotes: { ...(f.exerciseNotes || {}), [exerciseId]: note } }));
  };

  const setRows = (exerciseId, update) =>
    setForm((f) => {
      const sets = f.sets || {};
      return { ...f, sets: { ...sets, [exerciseId]: update(sets[exerciseId] || []) } };
    });

  const setMeasure = (exerciseId, measure, update) =>
    setForm((f) => {
      const sets = f.sets || {};
      return {
        ...f,
        setMeasures: { ...(f.setMeasures || {}), [exerciseId]: measure },
        sets: { ...sets, [exerciseId]: update(sets[exerciseId] || []) },
      };
    });

  return (
    <div>
      <label style={labelStyle}>Sets (optional)</label>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {linked.map((exercise) => {
          const rows = (form.sets || {})[exercise.id] || [];
          const note = (form.exerciseNotes || {})[exercise.id] || "";
          const noteOpen = note !== "" || openNotes.includes(exercise.id);
          const last = lastSetsFor(history, exercise.id, { excludeId: entryId, onOrBefore: form.date });
          const measure = resolveMeasure({ chosen: (form.setMeasures || {})[exercise.id], rows, lastSets: last && last.sets, exercise });
          const units = {
            distanceUnit: distanceUnitOfSets(rows) || distanceUnitOfSets(last && last.sets) || DISTANCE_UNIT,
            timeUnit: timeUnitOfSets(rows) || timeUnitOfSets(last && last.sets) || defaultTimeUnit(measure),
          };
          return (
            <div key={exercise.id} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: 10 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{exercise.name}</span>
                {measure && (
                  <select
                    value={measure}
                    onChange={(e) => setMeasure(exercise.id, e.target.value, (list) => switchMeasure(list, e.target.value, units))}
                    aria-label={`How ${exercise.name} is logged`}
                    style={measureSelectStyle}
                  >
                    {Object.entries(MEASURES).map(([key, m]) => (
                      <option key={key} value={key}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {last && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
                    Last ({shortDate(last.date)}): {last.sets.length > 0 ? formatSets(last.sets) : "no sets"}
                  </span>
                  {last.sets.length > 0 && (
                    <button
                      onClick={() => setMeasure(exercise.id, measureOfSets(last.sets), () => toDraftSets({ x: last.sets }).x)}
                      style={{ ...ghostLinkStyle, color: `var(${accentVar})` }}
                    >
                      Use
                    </button>
                  )}
                </div>
              )}
              {last && last.note && <div style={{ fontSize: 11, color: "var(--text-dim)", fontStyle: "italic", marginTop: 2 }}>“{last.note}”</div>}

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
                                setRows(exercise.id, (list) => list.map((r, k) => (k === i ? { ...r, [field]: value } : r)));
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
                                onChange={(e) => setRows(exercise.id, (list) => setTimeUnit(list, e.target.value))}
                                aria-label={`${exercise.name} time unit`}
                                style={{ ...measureSelectStyle, flexShrink: 0 }}
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
                                onChange={(e) => setRows(exercise.id, (list) => setDistanceUnit(list, e.target.value))}
                                aria-label={`${exercise.name} distance unit`}
                                style={{ ...measureSelectStyle, flexShrink: 0 }}
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
                      <button
                        onClick={() => setRows(exercise.id, (list) => list.filter((_, k) => k !== i))}
                        aria-label={`Remove set ${i + 1}`}
                        style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", display: "flex", flexShrink: 0 }}
                      >
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
                      onClick={() => setMeasure(exercise.id, key, (list) => (list.length > 0 ? switchMeasure(list, key, units) : [blankRow(key, { ...units, timeUnit: timeUnitOfSets(list) || defaultTimeUnit(key) })]))}
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
                  onChange={(e) => setNote(exercise.id, e.target.value)}
                  placeholder="Note for this exercise…"
                  aria-label={`${exercise.name} note`}
                  autoFocus={note === ""}
                  style={{ ...inputStyle, padding: "7px 8px", marginTop: 8, fontSize: 13 }}
                />
              )}

              {(measure || !noteOpen) && (
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8 }}>
                  {measure && (
                    <button
                      onClick={() => setRows(exercise.id, (list) => [...list, list.length > 0 ? { ...list[list.length - 1] } : blankRow(measure, units)])}
                      style={{ ...ghostLinkStyle, color: `var(${accentVar})` }}
                    >
                      <Plus size={13} /> Add set
                    </button>
                  )}
                  {!noteOpen && (
                    <button onClick={() => setOpenNotes((ids) => [...ids, exercise.id])} style={{ ...ghostLinkStyle, color: `var(${accentVar})` }}>
                      <Plus size={13} /> Note
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
