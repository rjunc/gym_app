import { useState, useMemo } from "react";
import { addTagsFromDraft, tagCounts } from "../lib/tags.js";
import { routineOptions, applyRoutine } from "../lib/routines.js";
import { redoFields } from "../lib/activity.js";
import EntryComposer from "./EntryComposer.jsx";
import SegmentedToggle from "./SegmentedToggle.jsx";
import { labelStyle, inputStyle } from "./styles.js";

// Bottom sheet for logging a new entry or editing one from Home. Owns its own
// draft state and hands back (type, fields) on save; the caller decides where
// that goes. `types` maps a type key to its { singular, accent, textLabel,
// textPlaceholder }; `entriesByType` maps the same keys to the existing entries,
// which feed the tag suggestions for whichever type is selected. Types flagged
// `canStartFromRoutine` offer a "Start from a routine" picker (when adding) fed
// by `routines` and `folders`. Pass `entry` to edit, or `redo` (an existing
// entry) to add a new one copied from it and dated `initialDate`; with neither,
// it starts blank on `initialType` and `initialDate`.
export default function EntrySheet({ types, entriesByType, routines, folders, entry, redo, initialType, initialDate, onSave, onClose }) {
  const isEdit = !!entry;
  const [type, setType] = useState(isEdit ? entry.source : redo ? redo.source : initialType);
  const [form, setForm] = useState(
    isEdit
      ? { date: entry.date, title: entry.title || "", tags: [...(entry.tags || [])], text: entry.text || "" }
      : redo
        ? redoFields(redo, initialDate)
        : { date: initialDate, title: "", tags: [], text: "" }
  );
  const [tagDraft, setTagDraft] = useState("");

  const meta = types[type];
  const canSave = form.text.trim() !== "" && form.date !== "";
  // Sessions and rolls have different vocabularies (legs vs. guard), so suggest
  // from the type being logged.
  const tagSuggestions = useMemo(() => tagCounts(entriesByType[type]), [entriesByType, type]);

  const routineChoices = useMemo(() => routineOptions(routines, folders), [routines, folders]);
  const showRoutines = !isEdit && !redo && meta.canStartFromRoutine && routineChoices.length > 0;

  const startFromRoutine = (id) => {
    const routine = routines.find((r) => r.id === id);
    if (routine) setForm((f) => applyRoutine(f, routine));
  };

  const addTag = () => {
    setForm((f) => ({ ...f, tags: addTagsFromDraft(f.tags, tagDraft) }));
    setTagDraft("");
  };

  const save = () => {
    if (!canSave) return;
    // A tag typed but never confirmed with Enter/Add would otherwise be lost.
    const tags = addTagsFromDraft(form.tags, tagDraft);
    onSave(type, { date: form.date, title: form.title.trim(), tags, text: form.text });
  };

  return (
    <EntryComposer
      title={isEdit ? "Edit entry" : redo ? "Redo entry" : "Log an entry"}
      form={form}
      setForm={setForm}
      tagDraft={tagDraft}
      setTagDraft={setTagDraft}
      onAddTag={addTag}
      onRemoveTag={(t) => setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }))}
      onSave={save}
      onClose={onClose}
      saveDisabled={!canSave}
      topContent={
        <>
          <div>
            <span style={labelStyle}>Type</span>
            <SegmentedToggle
              options={Object.entries(types).map(([key, t]) => ({ key, label: t.singular, accent: t.accent }))}
              value={type}
              setValue={setType}
            />
          </div>
          {showRoutines && (
            <div>
              <label style={labelStyle}>Start from a routine</label>
              {/* Always reset to the placeholder: picking is an action that fills the form, not a stored value. */}
              <select value="" onChange={(e) => startFromRoutine(e.target.value)} style={{ ...inputStyle, appearance: "auto" }}>
                <option value="">Choose a routine…</option>
                {routineChoices.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      }
      showDate
      showName
      nameField="title"
      nameLabel="Title"
      namePlaceholder="Optional title…"
      textLabel={meta.textLabel}
      textPlaceholder={meta.textPlaceholder}
      saveLabel={isEdit ? "Save changes" : "Save entry"}
      tagSuggestions={tagSuggestions}
      accent={meta.accent}
    />
  );
}
