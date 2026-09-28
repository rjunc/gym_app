import { useState, useMemo } from "react";
import { addTagsFromDraft, tagUsage } from "../lib/tags.js";
import { routineOptions } from "../lib/routines.js";
import { redoFields } from "../lib/activity.js";
import { todayISO } from "../lib/id.js";
import { cleanFields } from "../lib/text.js";
import { toDraftBlocks, fromDraftBlocks, hasLoggedBlocks, blockExerciseIds } from "../lib/sets.js";
import { tidyGroups } from "../lib/groups.js";
import { toDraftRounds, matFields, hasMatContent } from "../lib/mat.js";
import EntryComposer from "./EntryComposer.jsx";
import SegmentedToggle from "./SegmentedToggle.jsx";
import { labelStyle } from "./styles.js";

// Bottom sheet for logging a new dated entry or editing one — the one add/edit
// form behind Home and the Sessions/Journals/Rolls pages. Owns its own draft
// state and hands back (type, fields) on save; the caller decides where that
// goes. `types` maps a type key to its { singular, accent, textLabel,
// textPlaceholder }; with more than one (Home's Session/Roll) a Type switch is
// shown, with just one it's hidden. `entriesByType` maps the same keys to the
// existing entries, which feed the tag suggestions for whichever type is
// selected. Types flagged
// `showRoutines` offer a picker for adding routines into the form (any number,
// in add, edit or redo alike) fed by `routines` and `folders`. Types flagged
// `showExercises` (sessions only) offer the Library exercise picker, fed by
// `exercises` and ranked by `exerciseUsage`. Types flagged `showSets` (sessions)
// also get per-set numbers for each linked exercise; the "Last time" hint
// draws on that type's own entries. Pass `entry` to edit, or `redo`
// (an existing entry) to add a new one copied from it and dated `initialDate`;
// with neither, it starts blank on `initialType` and `initialDate`. An entry's
// Types flagged `showMat` (mat sessions) get Gi/No-Gi, taught/drilled
// techniques and rounds (see MatFields); a mat session can still be saved with
// just its notes. An entry's
// type comes from its `source` (Home's merged entries carry one), falling back
// to `initialType`. `newTitle` is the sheet's heading when adding.
export default function EntrySheet({
  types,
  entriesByType,
  routines = [],
  folders = [],
  exercises = [],
  exerciseUsage,
  routineUsage,
  entry,
  redo,
  initialType,
  initialDate,
  newTitle = "Log an entry",
  onSave,
  onClose,
}) {
  const isEdit = !!entry;
  const [type, setType] = useState((isEdit ? entry.source : redo ? redo.source : null) || initialType);
  // Forms that can log sessions keep what was done as draft blocks (see
  // lib/sets.js); the others (journals) link exercises by id.
  const withBlocks = Object.values(types).some((t) => t.showSets);
  const withMat = Object.values(types).some((t) => t.showMat);
  const [form, setForm] = useState(() => {
    const base = isEdit
      ? {
          date: entry.date,
          title: entry.title || "",
          tags: [...(entry.tags || [])],
          text: entry.text || "",
          exerciseIds: [...(entry.exerciseIds || [])],
          routineIds: [...(entry.routineIds || [])],
        }
      : redo
        ? redoFields(redo, initialDate)
        : { date: initialDate, title: "", tags: [], text: "", exerciseIds: [], routineIds: [] };
    const from = isEdit ? entry : redo;
    const mat = withMat
      ? {
          gi: (from && from.gi) || "",
          drilledIds: from ? [...(from.drilledIds || [])] : [],
          // A redo starts with no rounds (see redoFields).
          rounds: isEdit ? toDraftRounds(entry.rounds) : [],
        }
      : {};
    if (!withBlocks) return { ...base, ...mat };
    const { blocks: _stored, groups: _storedGroups, ...rest } = base;
    return {
      ...rest,
      ...mat,
      blocks: from ? toDraftBlocks(from.blocks, { fresh: !isEdit }) : [],
      groups: from ? (from.groups || []).map((g) => ({ ...g })) : [],
    };
  });
  const [tagDraft, setTagDraft] = useState("");

  const meta = types[type];
  // Text, or a set or note in a block (a session can be just the numbers), or
  // a drilled technique or round (a mat session can be just those).
  const hasContent = form.text.trim() !== "" || (meta.showSets && hasLoggedBlocks(form.blocks)) || (meta.showMat && hasMatContent(form));
  const canSave = hasContent && form.date !== "";
  // Sessions and rolls have different vocabularies (legs vs. guard), so suggest
  // from the type being logged.
  const tagSuggestions = useMemo(() => tagUsage(entriesByType[type], todayISO()), [entriesByType, type]);

  const routineChoices = useMemo(() => routineOptions(routines, folders), [routines, folders]);

  const addTag = () => {
    setForm((f) => ({ ...f, tags: addTagsFromDraft(f.tags, tagDraft) }));
    setTagDraft("");
  };

  const save = () => {
    if (!canSave) return;
    // A tag typed but never confirmed with Enter/Add would otherwise be lost.
    const tags = addTagsFromDraft(form.tags, tagDraft);
    const fields = cleanFields({ date: form.date, title: form.title, tags, text: form.text });
    if (meta.showSets) {
      const { blocks, groups } = tidyGroups(fromDraftBlocks(form.blocks), form.groups);
      fields.blocks = blocks;
      fields.groups = groups;
      fields.exerciseIds = blockExerciseIds(blocks);
    } else if (meta.showExercises) {
      fields.exerciseIds = form.exerciseIds || [];
    }
    if (meta.showRoutines) fields.routineIds = form.routineIds || [];
    if (meta.showMat) Object.assign(fields, matFields(form));
    onSave(type, fields);
  };

  return (
    <EntryComposer
      title={isEdit ? "Edit entry" : redo ? "Redo entry" : newTitle}
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
        Object.keys(types).length > 1 && (
          <div>
            <span style={labelStyle}>Type</span>
            <SegmentedToggle
              options={Object.entries(types).map(([key, t]) => ({ key, label: t.singular, accent: t.accent }))}
              value={type}
              setValue={setType}
            />
          </div>
        )
      }
      showDate
      showName
      nameField="title"
      nameLabel="Title"
      namePlaceholder="Optional title…"
      showRoutines={meta.showRoutines}
      routines={routines}
      routineOptions={routineChoices}
      routineUsage={routineUsage}
      showExercises={meta.showExercises}
      exerciseOptions={exercises}
      exerciseUsage={exerciseUsage}
      showSets={meta.showSets}
      showMat={meta.showMat}
      setsHistory={entriesByType[type]}
      entryId={isEdit ? entry.id : undefined}
      textLabel={meta.textLabel}
      textPlaceholder={meta.textPlaceholder}
      saveLabel={isEdit ? "Save changes" : "Save entry"}
      tagSuggestions={tagSuggestions}
      accent={meta.accent}
    />
  );
}
