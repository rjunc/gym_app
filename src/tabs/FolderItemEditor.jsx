import { useState, useMemo } from "react";
import { todayISO } from "../lib/id.js";
import { newRecord, editById } from "../lib/records.js";
import { folderPath } from "../lib/folders.js";
import { cleanFields } from "../lib/text.js";
import { collectPositions } from "../lib/positions.js";
import { tagUsage, addTagsFromDraft } from "../lib/tags.js";
import EntryComposer from "../ui/EntryComposer.jsx";

// The new/edit form for a routine or technique, on its own so it opens the
// same from its library page and from anywhere a routine sheet was reached by
// a link (see SheetStack). Pass `item` to edit it, or leave it out to create
// one starting from `defaults` ({ name, folderId }). `onSaved(record)` gets
// the saved record after it's written; `onClose` runs after saving too.
// `config` is the page's wording and optional fields — see ROUTINE_CONFIG in
// RoutinesTab and the Techniques page:
//   { itemNoun, namePlaceholder, textLabel, textPlaceholder, accent,
//     showPositions, showStar, showGiOnly, showExercises }
// plus, for showExercises, `exercises` and `exerciseUsage` to pick from.
export default function FolderItemEditor({ item, defaults = {}, items, setItems, folders, config, exercises = [], exerciseUsage, onSaved, onClose }) {
  const { itemNoun, namePlaceholder, textLabel, textPlaceholder, accent = "--accent2", showPositions, showStar, showGiOnly, showExercises } = config;
  const [form, setForm] = useState(() => ({
    name: item ? item.name : defaults.name || "",
    tags: item ? [...(item.tags || [])] : [],
    text: item ? item.text || "" : "",
    folderId: item ? item.folderId || null : defaults.folderId || null,
    position: item ? item.position || "" : "",
    toPosition: item ? item.toPosition || "" : "",
    starred: item ? !!item.starred : false,
    giOnly: item ? !!item.giOnly : false,
    ...(showExercises ? { exerciseIds: item ? [...(item.exerciseIds || [])] : [] } : {}),
  }));
  const [tagDraft, setTagDraft] = useState("");
  const tagSuggestions = useMemo(() => tagUsage(items, todayISO()), [items]);
  const positionOptions = useMemo(() => (showPositions ? collectPositions(items) : []), [items, showPositions]);

  const folderOptions = useMemo(() => {
    const opts = [{ id: null, label: "No folder (top level)" }];
    folders
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((f) => {
        const path = folderPath(folders, f.id).map((p) => p.name).join(" / ");
        opts.push({ id: f.id, label: path });
      });
    return opts;
  }, [folders]);

  const save = () => {
    const fields = cleanFields(form);
    if (!fields.name) return;
    let saved;
    if (item) {
      saved = { ...item, ...fields };
      setItems((prev) => editById(prev, item.id, fields));
    } else {
      saved = newRecord(fields);
      setItems((prev) => [saved, ...prev]);
    }
    if (onSaved) onSaved(saved);
    onClose();
  };

  return (
    <EntryComposer
      title={item ? `Edit ${itemNoun}` : `New ${itemNoun}`}
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
      showName
      namePlaceholder={namePlaceholder}
      showFolder
      folderOptions={folderOptions}
      showPositions={showPositions}
      positionOptions={positionOptions}
      showStar={showStar}
      showGiOnly={showGiOnly}
      showExercises={showExercises}
      exerciseOptions={exercises}
      exerciseUsage={exerciseUsage}
      textLabel={textLabel}
      textPlaceholder={textPlaceholder}
      saveLabel={item ? "Save changes" : `Save ${itemNoun}`}
      tagSuggestions={tagSuggestions}
      accent={accent}
    />
  );
}
