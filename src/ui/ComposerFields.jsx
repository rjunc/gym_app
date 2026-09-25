import { useState } from "react";
import { Star, X, Check } from "lucide-react";
import { labelStyle, inputStyle, tagPillStyle } from "./styles.js";
import { applyRoutine } from "../lib/routines.js";
import TagChip from "./TagChip.jsx";

export function NameField({ form, setForm, nameField, nameLabel, namePlaceholder }) {
  return (
    <div>
      <label style={labelStyle}>{nameLabel}</label>
      <input
        value={form[nameField] || ""}
        onChange={(e) => setForm((f) => ({ ...f, [nameField]: e.target.value }))}
        placeholder={namePlaceholder}
        style={inputStyle}
      />
    </div>
  );
}

export function DateField({ form, setForm }) {
  return (
    // minWidth: 0 overrides flexbox's default "don't shrink below content
    // size" on this column's items — without it, a native date-picker
    // input's intrinsic width can force this whole row wider than the
    // sheet, overflowing off-screen on mobile.
    <div style={{ minWidth: 0 }}>
      <label style={labelStyle}>Date</label>
      <input
        type="date"
        value={form.date}
        onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
        style={{
          ...inputStyle,
          maxWidth: "100%",
          display: "block",
          // iOS Safari renders type="date" with its own native chrome that
          // can ignore a CSS width entirely; stripping the native appearance
          // makes it size like our other custom inputs instead. The
          // tap-to-open-picker behavior is unaffected — this only removes
          // the default visual chrome.
          WebkitAppearance: "none",
          appearance: "none",
        }}
      />
    </div>
  );
}

export function FolderField({ form, setForm, folderOptions }) {
  return (
    <div>
      <label style={labelStyle}>Folder</label>
      <select
        value={form.folderId || ""}
        onChange={(e) => setForm((f) => ({ ...f, folderId: e.target.value || null }))}
        style={{ ...inputStyle, appearance: "auto" }}
      >
        {folderOptions.map((o) => (
          <option key={o.id || "root"} value={o.id || ""}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function PositionsField({ form, setForm, positionOptions }) {
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <label style={labelStyle}>From position</label>
        <input
          list="position-options"
          value={form.position || ""}
          onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
          placeholder="Bottom closed guard…"
          style={inputStyle}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <label style={labelStyle}>Leads to</label>
        <input
          list="position-options"
          value={form.toPosition || ""}
          onChange={(e) => setForm((f) => ({ ...f, toPosition: e.target.value }))}
          placeholder="Top side control…"
          style={inputStyle}
        />
      </div>
      <datalist id="position-options">
        {positionOptions.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
    </div>
  );
}

export function StarField({ form, setForm }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
      <input
        type="checkbox"
        checked={!!form.starred}
        onChange={(e) => setForm((f) => ({ ...f, starred: e.target.checked }))}
        style={{ width: 16, height: 16, accentColor: "var(--accent)" }}
      />
      <Star size={14} color="var(--accent)" fill={form.starred ? "var(--accent)" : "none"} />
      Go-to — sorts to the top of its position/list
    </label>
  );
}

export function GiOnlyField({ form, setForm, accentVar }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
      <input
        type="checkbox"
        checked={!!form.giOnly}
        onChange={(e) => setForm((f) => ({ ...f, giOnly: e.target.checked }))}
        style={{ width: 16, height: 16, accentColor: `var(${accentVar})` }}
      />
      Gi only — won't work without the gi
    </label>
  );
}

export function PrescriptionField({ form, setForm }) {
  return (
    <div>
      <label style={labelStyle}>Prescription (optional)</label>
      <input
        value={form.prescription || ""}
        onChange={(e) => setForm((f) => ({ ...f, prescription: e.target.value }))}
        placeholder="3x8, 30s hold, 5 rounds…"
        style={inputStyle}
      />
    </div>
  );
}

// A multi-select of real Library exercise records, referenced by id — not a
// free-typed list like tags. Unlike TagsField, you can't invent a new entry
// inline; it only picks from what's already in the Library. That keeps the
// link real (survives renaming the exercise later), instead of repeating the
// name-matching drift problem positions.js already has.
// `recentCounts` (a Map of exercise id -> count in the last 30 days, see
// lib/exercises.js) is optional: when given, suggestions rank by that count
// first so the picker leads with what you've actually been training lately,
// falling back to alphabetical among ties (including the untouched-lately
// exercises, which all tie at zero). Without it, suggestions are plain
// alphabetical.
export function ExercisesField({ form, setForm, exercises, accentVar, recentCounts }) {
  const [query, setQuery] = useState("");
  const selectedIds = form.exerciseIds || [];
  const selected = selectedIds.map((id) => exercises.find((e) => e.id === id)).filter(Boolean);

  const q = query.trim().toLowerCase();
  const countOf = (id) => (recentCounts ? recentCounts.get(id) || 0 : 0);
  const suggestions = exercises
    .filter((e) => !selectedIds.includes(e.id))
    .filter((e) => q === "" || e.name.toLowerCase().includes(q))
    .sort((a, b) => (recentCounts ? countOf(b.id) - countOf(a.id) : 0) || a.name.localeCompare(b.name))
    .slice(0, 8);

  const addExercise = (id) => {
    setForm((f) => ({ ...f, exerciseIds: [...(f.exerciseIds || []), id] }));
    setQuery("");
  };

  const removeExercise = (id) => setForm((f) => ({ ...f, exerciseIds: (f.exerciseIds || []).filter((x) => x !== id) }));

  return (
    <div>
      <label style={labelStyle}>Exercises</label>
      {selected.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {selected.map((e) => (
            <span key={e.id} style={{ ...tagPillStyle, background: `var(${accentVar}-dim)`, borderColor: `var(${accentVar})`, color: `var(${accentVar})` }}>
              {e.name}
              <button
                onClick={() => removeExercise(e.id)}
                style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", display: "flex" }}
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={exercises.length === 0 ? "No exercises in the Library yet" : "Search exercises…"}
        disabled={exercises.length === 0}
        style={inputStyle}
      />
      {suggestions.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {recentCounts && (
            <span style={{ ...labelStyle, marginBottom: 4 }}>{q ? "Matching exercises" : "Most frequent (last 30 days)"}</span>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {suggestions.map((e) => (
              <TagChip key={e.id} small accent={accentVar} label={e.name} onClick={() => addExercise(e.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Adds routines to a session the way ExercisesField adds exercises, except a
// routine isn't linked: tapping one copies its tags, exercises and text into
// the form (see applyRoutine) and from then on it's just ordinary form content.
// Several can be added, each appending after the last. The "Added" pills are
// only a reminder for this draft — they have no remove button because what a
// routine brought in has already merged with everything else in the form.
// `options` is routineOptions() output, already sorted alphabetically by
// folder path.
export function RoutinesField({ setForm, routines, options, accentVar }) {
  const [query, setQuery] = useState("");
  const [addedIds, setAddedIds] = useState([]);
  const added = addedIds.map((id) => options.find((o) => o.id === id)).filter(Boolean);

  const q = query.trim().toLowerCase();
  const suggestions = options
    .filter((o) => !addedIds.includes(o.id))
    .filter((o) => q === "" || o.label.toLowerCase().includes(q))
    .slice(0, 8);

  const addRoutine = (id) => {
    const routine = routines.find((r) => r.id === id);
    if (!routine) return;
    setForm((f) => applyRoutine(f, routine));
    setAddedIds((ids) => [...ids, id]);
    setQuery("");
  };

  return (
    <div>
      <label style={labelStyle}>Routines</label>
      {added.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {added.map((o) => (
            <span key={o.id} style={{ ...tagPillStyle, background: `var(${accentVar}-dim)`, borderColor: `var(${accentVar})`, color: `var(${accentVar})` }}>
              <Check size={11} />
              {o.label}
            </span>
          ))}
        </div>
      )}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={options.length === 0 ? "No routines yet" : "Search routines to add…"}
        disabled={options.length === 0}
        style={inputStyle}
      />
      {suggestions.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {suggestions.map((o) => (
            <TagChip key={o.id} small accent={accentVar} label={o.label} onClick={() => addRoutine(o.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ActiveField({ form, setForm, accentVar, activeLabel }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
      <input
        type="checkbox"
        checked={form.active !== false}
        onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
        style={{ width: 16, height: 16, accentColor: `var(${accentVar})` }}
      />
      {activeLabel}
    </label>
  );
}
