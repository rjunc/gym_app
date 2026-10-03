import { useState, useMemo } from "react";
import { Star, X, LayoutGrid } from "lucide-react";
import { labelStyle, inputStyle, pickedPillStyle, pillRemoveStyle, ghostLinkStyle, chipRowStyle } from "./styles.js";
import { applyRoutine } from "../lib/routines.js";
import { compareByUsage } from "../lib/links.js";
import { pickerMatches, exerciseSearchFields, folderItemSearchFields, nameMap } from "../lib/search.js";
import { useLog } from "../lib/LogContext.js";
import { newDraftBlock } from "../lib/sets.js";
import TagChip from "./TagChip.jsx";
import PagePicker from "./PagePicker.jsx";

// A field's label with a "Browse" link on the right that opens the real page
// to pick from (see PagePicker).
function LabelWithBrowse({ label, onBrowse, accentVar }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
      <label style={{ ...labelStyle, marginBottom: 0 }}>{label}</label>
      <button onClick={onBrowse} style={{ ...ghostLinkStyle, fontSize: 12, color: `var(${accentVar})` }}>
        <LayoutGrid size={13} /> Browse
      </button>
    </div>
  );
}

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

// A checkbox with its explanation, as one full-width tappable row.
const checkRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontSize: 14,
  cursor: "pointer",
  padding: "11px 12px",
  borderRadius: 10,
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
};
const checkboxStyle = (accentVar) => ({ width: 18, height: 18, margin: 0, accentColor: `var(${accentVar})`, flexShrink: 0 });

export function StarField({ form, setForm }) {
  return (
    <label style={checkRowStyle}>
      <input
        type="checkbox"
        checked={!!form.starred}
        onChange={(e) => setForm((f) => ({ ...f, starred: e.target.checked }))}
        style={checkboxStyle("--accent")}
      />
      <span style={{ flex: 1 }}>
        Go-to <span style={{ color: "var(--text-dim)" }}>— sorts to the top of its position/list</span>
      </span>
      <Star size={16} color="var(--accent)" fill={form.starred ? "var(--accent)" : "none"} />
    </label>
  );
}

export function GiOnlyField({ form, setForm, accentVar }) {
  return (
    <label style={checkRowStyle}>
      <input
        type="checkbox"
        checked={!!form.giOnly}
        onChange={(e) => setForm((f) => ({ ...f, giOnly: e.target.checked }))}
        style={checkboxStyle(accentVar)}
      />
      <span>
        Gi only <span style={{ color: "var(--text-dim)" }}>— won't work without the gi</span>
      </span>
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
// name-matching drift problem positions.js already has. Typing matches what
// the Library's search box would (see pickerMatches) — name, text, tags,
// prescription or folder — so "legs" suggests everything tagged legs.
// Suggestions only appear once something is typed — to look through
// everything, use Browse. `usage` (exerciseUsageCounts output, see
// lib/exercises.js) is optional: when given, matches rank by session use —
// last 30 days first, then all-time, then alphabetical — so what you've
// actually been training comes first. Without it, they're plain alphabetical.
// Exercises whose name starts with the query move ahead of the rest.
// "Browse" opens the Library page itself over the form (PagePicker) — to look
// through it, or to create an exercise that doesn't exist yet — starting from
// whatever was typed here.
// `asBlocks` (sessions): each exercise picked appends a block to the form's
// draft `blocks` instead — even one that's already there, since an exercise
// can be done more than once — and the blocks themselves (BlocksField) take
// the place of the pills.
export function ExercisesField({ form, setForm, exercises, accentVar, usage, asBlocks = false }) {
  const [query, setQuery] = useState("");
  const [browsing, setBrowsing] = useState(false);
  const selectedIds = asBlocks ? [] : form.exerciseIds || [];
  const selected = selectedIds.map((id) => exercises.find((e) => e.id === id)).filter(Boolean);

  const log = useLog();
  const exerciseFolders = log?.exerciseFolders || [];
  const suggestions = pickerMatches(
    exercises.filter((e) => !selectedIds.includes(e.id)),
    query,
    (e) => exerciseSearchFields(e, exerciseFolders),
    { compare: compareByUsage(usage || new Map()) }
  );

  const addExercise = (id) => {
    if (asBlocks) setForm((f) => ({ ...f, blocks: [...(f.blocks || []), newDraftBlock(id)] }));
    else setForm((f) => ((f.exerciseIds || []).includes(id) ? f : { ...f, exerciseIds: [...(f.exerciseIds || []), id] }));
    setQuery("");
  };

  // Blocks are removed from the blocks themselves, so there's nothing to
  // take back from here except what Browse is still holding.
  const removeExercise = (id) => {
    if (!asBlocks) setForm((f) => ({ ...f, exerciseIds: (f.exerciseIds || []).filter((x) => x !== id) }));
  };

  return (
    <div>
      <LabelWithBrowse label="Exercises" onBrowse={() => setBrowsing(true)} accentVar={accentVar} />
      {selected.length > 0 && (
        <div style={{ ...chipRowStyle, marginBottom: 8 }}>
          {selected.map((e) => (
            <span key={e.id} style={pickedPillStyle(accentVar)}>
              {e.name}
              <button
                onClick={() => removeExercise(e.id)}
                aria-label={`Remove ${e.name}`}
                style={pillRemoveStyle}
              >
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={exercises.length === 0 ? "No exercises yet — Browse to add one" : "Search exercises to add…"}
        disabled={exercises.length === 0}
        style={inputStyle}
      />
      {suggestions.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <span style={{ ...labelStyle, fontWeight: 500, marginBottom: 6 }}>Tap to add</span>
          <div style={chipRowStyle}>
            {suggestions.map((e) => (
              <TagChip key={e.id} small accent={accentVar} label={e.name} onClick={() => addExercise(e.id)} />
            ))}
          </div>
        </div>
      )}
      {browsing && (
        <PagePicker
          kind="exercises"
          addedIds={selectedIds}
          onAdd={(exercise) => addExercise(exercise.id)}
          onRemove={removeExercise}
          onDone={() => setBrowsing(false)}
          initialQuery={query.trim()}
        />
      )}
    </div>
  );
}

// Adds routines to a session the way ExercisesField adds exercises: tapping
// one copies its tags, exercises and text into the form (see applyRoutine) and
// records its id in the entry's routineIds. Several can be added, each
// appending after the last. The pills show the routines the entry is linked
// to (including ones saved earlier, when editing). Removing one only drops the
// link — what the routine brought in has already merged with everything else
// in the form, so it stays. A deleted routine's leftover id just isn't shown.
// `options` is routineOptions() output. Suggestions only appear once
// something is typed, like the Exercises picker. `usage` (routineUsageCounts,
// see lib/routines.js) is optional: when given, matches rank by session use —
// last 30 days first, then all-time, then A–Z by folder path. Without it
// they're plain A–Z. Routines whose name or folder path starts with the query
// move ahead of the rest. Typing matches what the Routines page's search box
// would (see pickerMatches). "Browse" opens
// the Routines page itself over the form (PagePicker) — folders, search,
// previews, and creating a routine that doesn't exist yet — starting from
// whatever was typed here.
export function RoutinesField({ form, setForm, routines, options, accentVar, usage }) {
  const [query, setQuery] = useState("");
  const [browsing, setBrowsing] = useState(false);
  const addedIds = form.routineIds || [];
  const added = addedIds.map((id) => options.find((o) => o.id === id)).filter(Boolean);

  const log = useLog();
  const folders = log?.folders || [];
  const exercises = log?.exercises || [];
  const exerciseNameById = useMemo(() => nameMap(exercises), [exercises]);
  const routineById = new Map(routines.map((r) => [r.id, r]));
  const suggestions = pickerMatches(
    options.filter((o) => !addedIds.includes(o.id) && routineById.has(o.id)),
    query,
    (o) => folderItemSearchFields(routineById.get(o.id), folders, exerciseNameById),
    { compare: compareByUsage(usage || new Map(), (o) => o.label), namesOf: (o) => [routineById.get(o.id).name, o.label] }
  );

  // Takes the routine itself, not its id: one just created from Browse
  // isn't in `routines` yet.
  const addRoutine = (routine) => {
    if (!routine) return;
    setForm((f) => applyRoutine(f, routine));
    setQuery("");
  };

  const unlinkRoutine = (id) => setForm((f) => ({ ...f, routineIds: (f.routineIds || []).filter((x) => x !== id) }));

  return (
    <div>
      <LabelWithBrowse label="Routines" onBrowse={() => setBrowsing(true)} accentVar={accentVar} />
      {added.length > 0 && (
        <div style={{ ...chipRowStyle, marginBottom: 8 }}>
          {added.map((o) => (
            <span key={o.id} style={pickedPillStyle(accentVar)}>
              {o.label}
              <button
                onClick={() => unlinkRoutine(o.id)}
                aria-label={`Remove ${o.label}`}
                style={pillRemoveStyle}
              >
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={options.length === 0 ? "No routines yet — Browse to add one" : "Search routines to add…"}
        disabled={options.length === 0}
        style={inputStyle}
      />
      {suggestions.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <span style={{ ...labelStyle, fontWeight: 500, marginBottom: 6 }}>Tap to add</span>
          <div style={chipRowStyle}>
            {suggestions.map((o) => (
              <TagChip key={o.id} small accent={accentVar} label={o.label} onClick={() => addRoutine(routines.find((r) => r.id === o.id))} />
            ))}
          </div>
        </div>
      )}
      {browsing && (
        <PagePicker kind="routines" addedIds={addedIds} onAdd={addRoutine} onRemove={unlinkRoutine} onDone={() => setBrowsing(false)} initialQuery={query.trim()} />
      )}
    </div>
  );
}

export function ActiveField({ form, setForm, accentVar, activeLabel }) {
  return (
    <label style={checkRowStyle}>
      <input
        type="checkbox"
        checked={form.active !== false}
        onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
        style={checkboxStyle(accentVar)}
      />
      {activeLabel}
    </label>
  );
}
