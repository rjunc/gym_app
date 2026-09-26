import { Plus, X } from "lucide-react";
import { MEASURES, measureOf, blankRow, rowFields, lastSetsFor, formatSets, toDraftSets, WEIGHT_UNIT, DISTANCE_UNIT } from "../lib/sets.js";
import { labelStyle, inputStyle, ghostLinkStyle } from "./styles.js";

// How each set field's text box looks: keyboard, placeholder, and the unit
// shown after it.
const FIELD_INPUT = {
  weight: { inputMode: "decimal", placeholder: "0", suffix: WEIGHT_UNIT },
  distance: { inputMode: "decimal", placeholder: "0", suffix: DISTANCE_UNIT },
  reps: { inputMode: "numeric", placeholder: "0", suffix: "reps" },
  seconds: { inputMode: "numeric", placeholder: "m:ss", suffix: "" },
};

const shortDate = (iso) => {
  const d = new Date(iso + "T00:00:00");
  return isNaN(d) ? iso : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

// Per-set numbers for each exercise linked to the session, as an editable
// table under the Exercises picker. Works on the form's draft (`form.sets`,
// strings as typed — see toDraftSets/fromDraftSets); nothing is required, and
// an exercise with no rows is saved as linked-but-no-numbers.
// "Add set" copies the previous row, so 5×5 is one row typed plus four taps.
// "Last time" shows the most recent other session's sets for that exercise
// (from `history`, not after the date being logged) and can copy them in.
export default function SetsField({ form, setForm, exercises, history = [], entryId, accentVar }) {
  const linked = (form.exerciseIds || []).map((id) => exercises.find((e) => e.id === id)).filter(Boolean);
  if (linked.length === 0) return null;

  const setRows = (exerciseId, update) =>
    setForm((f) => {
      const sets = f.sets || {};
      return { ...f, sets: { ...sets, [exerciseId]: update(sets[exerciseId] || []) } };
    });

  return (
    <div>
      <label style={labelStyle}>Sets (optional)</label>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {linked.map((exercise) => {
          const measure = measureOf(exercise);
          const rows = (form.sets || {})[exercise.id] || [];
          const last = lastSetsFor(history, exercise.id, { excludeId: entryId, onOrBefore: form.date });
          return (
            <div key={exercise.id} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: 10 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{exercise.name}</span>
                <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{MEASURES[measure].label}</span>
              </div>

              {last && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
                    Last ({shortDate(last.date)}): {formatSets(last.sets)}
                  </span>
                  <button onClick={() => setRows(exercise.id, () => toDraftSets({ x: last.sets }).x)} style={{ ...ghostLinkStyle, color: `var(${accentVar})` }}>
                    Use
                  </button>
                </div>
              )}

              {rows.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                  {rows.map((row, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 11, color: "var(--text-dim)", width: 14, textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
                      {rowFields(row, measure).map((field, j) => {
                        const meta = FIELD_INPUT[field];
                        return (
                          <div key={field} style={{ display: "flex", alignItems: "center", gap: 4, flex: 1, minWidth: 0 }}>
                            {j > 0 && field === "reps" && <span style={{ fontSize: 12, color: "var(--text-dim)" }}>×</span>}
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

              <button
                onClick={() => setRows(exercise.id, (list) => [...list, list.length > 0 ? { ...list[list.length - 1] } : blankRow(measure)])}
                style={{ ...ghostLinkStyle, color: `var(${accentVar})`, marginTop: 8 }}
              >
                <Plus size={13} /> Add set
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
