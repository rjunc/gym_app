import { useState, useMemo } from "react";
import { todayISO } from "../lib/id.js";
import { newRecord, editById } from "../lib/records.js";
import { tagUsage, addTagsFromDraft } from "../lib/tags.js";
import { cleanFields, cleanLine } from "../lib/text.js";
import EntryComposer from "../ui/EntryComposer.jsx";

const ACCENT = "--accent2"; // matches the Library page

// The new/edit form for a Library exercise, on its own so it opens the same
// from the Library page and from anywhere an exercise sheet was reached by a
// link (see SheetStack). Pass `exercise` to edit it, or leave it out to
// create one starting from `initialName`. `onSaved(record)` gets the saved
// record (new or edited) after it's written; `onClose` runs after saving too.
// Names are compared case-insensitively so "Bench" and "bench" count as the
// same exercise — otherwise the Library (and the Exercises picker it feeds)
// quietly grows near-duplicates.
export default function ExerciseEditor({ exercise, initialName = "", exercises, setExercises, onSaved, onClose }) {
  const [form, setForm] = useState(() =>
    exercise
      ? {
          name: exercise.name || "",
          tags: [...(exercise.tags || [])],
          text: exercise.text || "",
          prescription: exercise.prescription || "",
          active: exercise.active !== false,
        }
      : { name: initialName, tags: [], text: "", prescription: "", active: true }
  );
  const [tagDraft, setTagDraft] = useState("");
  const tagSuggestions = useMemo(() => tagUsage(exercises, todayISO()), [exercises]);

  const trimmedName = cleanLine(form.name);
  const isDuplicateName =
    trimmedName !== "" && exercises.some((e) => e.id !== exercise?.id && cleanLine(e.name).toLowerCase() === trimmedName.toLowerCase());

  const save = () => {
    const fields = cleanFields(form);
    if (!fields.name || isDuplicateName) return;
    let saved;
    if (exercise) {
      saved = { ...exercise, ...fields };
      setExercises((prev) => editById(prev, exercise.id, fields));
    } else {
      saved = newRecord(fields);
      setExercises((prev) => [saved, ...prev]);
    }
    if (onSaved) onSaved(saved);
    onClose();
  };

  return (
    <EntryComposer
      title={exercise ? "Edit exercise" : "New exercise"}
      form={form}
      setForm={setForm}
      tagDraft={tagDraft}
      setTagDraft={setTagDraft}
      onAddTag={() => {
        setForm((f) => ({ ...f, tags: addTagsFromDraft(f.tags, tagDraft) }));
        setTagDraft("");
      }}
      onRemoveTag={(t) => setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }))}
      onSave={save}
      onClose={onClose}
      saveDisabled={!form.name.trim() || isDuplicateName}
      showName
      nameField="name"
      nameLabel="Name"
      namePlaceholder="Goblet squat, cat-cow, jump rope…"
      nameError={isDuplicateName ? "An exercise with this name already exists." : undefined}
      showPrescription
      showActive
      textLabel="Notes (optional)"
      textPlaceholder="Cues, setup, how to scale…"
      saveLabel={exercise ? "Save changes" : "Save exercise"}
      tagSuggestions={tagSuggestions}
      accent={ACCENT}
    />
  );
}
