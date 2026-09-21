import { useState } from "react";
import { addTagsFromDraft } from "../lib/tags.js";
import EntryComposer from "./EntryComposer.jsx";
import SegmentedToggle from "./SegmentedToggle.jsx";
import { labelStyle } from "./styles.js";

// Bottom sheet for logging a new entry from Home. Owns its own draft state and
// hands back { type, entry } on save; the caller decides where that goes.
// `types` maps a type key to its { singular, accent, textLabel, textPlaceholder }.
export default function AddEntrySheet({ types, initialType, initialDate, onSave, onClose }) {
  const [type, setType] = useState(initialType);
  const [form, setForm] = useState({ date: initialDate, title: "", tags: [], text: "" });
  const [tagDraft, setTagDraft] = useState("");

  const meta = types[type];
  const canSave = form.text.trim() !== "" && form.date !== "";

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
      title="Log an entry"
      form={form}
      setForm={setForm}
      tagDraft={tagDraft}
      setTagDraft={setTagDraft}
      onAddTag={addTag}
      onRemoveTag={(t) => setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }))}
      onSave={save}
      onClose={onClose}
      saveDisabled={!canSave}
      typeToggle={
        <div>
          <span style={labelStyle}>Type</span>
          <SegmentedToggle
            options={Object.entries(types).map(([key, t]) => ({ key, label: t.singular, accent: t.accent }))}
            value={type}
            setValue={setType}
          />
        </div>
      }
      showDate
      showName
      nameField="title"
      nameLabel="Title"
      namePlaceholder="Optional title…"
      textLabel={meta.textLabel}
      textPlaceholder={meta.textPlaceholder}
      saveLabel="Save entry"
      accent={meta.accent}
    />
  );
}
