import { labelStyle, inputStyle, primaryBtnStyle } from "./styles.js";
import {
  NameField,
  DateField,
  FolderField,
  PositionsField,
  StarField,
  GiOnlyField,
  PrescriptionField,
  ActiveField,
  ExercisesField,
  RoutinesField,
} from "./ComposerFields.jsx";
import TagsField from "./TagsField.jsx";
import BottomSheet, { SheetHeader } from "./BottomSheet.jsx";
import BlocksField from "./BlocksField.jsx";
import MatFields from "./MatFields.jsx";

export default function EntryComposer({
  title,
  form,
  setForm,
  tagDraft,
  setTagDraft,
  onAddTag,
  onRemoveTag,
  onSave,
  onClose,
  showDate,
  showName,
  // Which key in `form` the optional name/title field reads and writes, and
  // how it's labeled/placeheld — lets Routines (name) and Sessions/Journals
  // (title) share this one field instead of each needing their own.
  nameField = "name",
  nameLabel = "Name",
  namePlaceholder = "",
  // Validation message shown under the name field (e.g. a duplicate-name
  // check) — purely display, callers own the actual validation logic.
  nameError,
  showFolder,
  folderOptions,
  showPositions,
  positionOptions = [],
  showStar,
  showGiOnly,
  // A free-text "how much" field (sets/reps/duration) for library exercises.
  showPrescription,
  // A checkbox for whether this item should be picked when something
  // generates for you at random (e.g. a future routine builder).
  showActive,
  activeLabel = "Active — include when randomly building routines",
  // A multi-select linking this routine/session to Library exercises, so the
  // Library can show you back which sessions/routines use a given exercise.
  showExercises,
  exerciseOptions = [],
  // Optional exerciseUsageCounts output (see lib/exercises.js), used to rank
  // the picker's suggestions by how much each exercise is used in sessions
  // instead of alphabetically.
  exerciseUsage,
  // What was done, in order: a block per exercise done, with its sets
  // (sessions only; see BlocksField).
  // `setsHistory` is the sessions the "Last time" hint looks through, and
  // `entryId` the entry being edited, so it never suggests itself.
  showSets,
  // A mat session's gi, drilled techniques and rounds (see MatFields);
  // `setsHistory` then holds the mat sessions, for partner suggestions.
  showMat,
  setsHistory = [],
  entryId,
  // A picker that copies routines (tags, exercises, text) into the form, any
  // number of them (Sessions and Journals). `routineOptions` is routineOptions()
  // output; `routines` are the records it points at.
  showRoutines,
  routines = [],
  routineOptions = [],
  // Optional routineUsageCounts output, ranking the Routines picker by use.
  routineUsage,
  textLabel,
  textPlaceholder,
  saveLabel,
  // Dims and disables the save button until the form is complete.
  saveDisabled,
  // Optional content rendered under the title, above the fields, for composers
  // with extra top-level controls (e.g. Home's Session / Roll switch).
  topContent,
  // Existing tags as [{ tag, recent, total }] (most-used first, see tagUsage) to offer
  // as one-tap suggestions, so tags get reused instead of retyped in slightly
  // different spellings.
  tagSuggestions = [],
  accent,
}) {
  const accentVar = accent || "--accent";

  return (
    <BottomSheet
      onClose={onClose}
      gap={18}
      header={<SheetHeader title={title} onClose={onClose} />}
      footer={
        <button
          onClick={onSave}
          disabled={saveDisabled}
          style={{
            ...primaryBtnStyle,
            background: `var(${accentVar})`,
            width: "100%",
            minHeight: 46,
            fontSize: 15,
            opacity: saveDisabled ? 0.4 : 1,
          }}
        >
          {saveLabel}
        </button>
      }
    >
      {topContent}

      {showName && <NameField form={form} setForm={setForm} nameField={nameField} nameLabel={nameLabel} namePlaceholder={namePlaceholder} />}
      {showName && nameError && <div role="alert" style={{ color: "var(--danger)", fontSize: 12, marginTop: -12 }}>{nameError}</div>}

      {showDate && <DateField form={form} setForm={setForm} />}

      {showFolder && <FolderField form={form} setForm={setForm} folderOptions={folderOptions} />}

      {showPositions && <PositionsField form={form} setForm={setForm} positionOptions={positionOptions} />}

      {showStar && <StarField form={form} setForm={setForm} />}

      {showGiOnly && <GiOnlyField form={form} setForm={setForm} accentVar={accentVar} />}

      {showPrescription && <PrescriptionField form={form} setForm={setForm} />}

      {showActive && <ActiveField form={form} setForm={setForm} accentVar={accentVar} activeLabel={activeLabel} />}

      {showRoutines && (
        <RoutinesField
          form={form}
          setForm={setForm}
          routines={routines}
          options={routineOptions}
          accentVar={accentVar}
          usage={routineUsage}
        />
      )}

      {showExercises && (
        <ExercisesField
          form={form}
          setForm={setForm}
          exercises={exerciseOptions}
          accentVar={accentVar}
          usage={exerciseUsage}
          asBlocks={showSets}
        />
      )}

      {showExercises && showSets && (
        <BlocksField form={form} setForm={setForm} exercises={exerciseOptions} history={setsHistory} entryId={entryId} accentVar={accentVar} />
      )}

      {showMat && <MatFields form={form} setForm={setForm} history={setsHistory} accentVar={accentVar} />}

      <TagsField
        form={form}
        setForm={setForm}
        tagDraft={tagDraft}
        setTagDraft={setTagDraft}
        onAddTag={onAddTag}
        onRemoveTag={onRemoveTag}
        tagSuggestions={tagSuggestions}
        accentVar={accentVar}
      />

      <div style={{ display: "flex", flexDirection: "column" }}>
        <label style={labelStyle}>{textLabel}</label>
        <textarea
          value={form.text}
          onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
          placeholder={textPlaceholder}
          style={{ ...inputStyle, minHeight: 120, resize: "vertical", lineHeight: 1.55 }}
        />
      </div>
    </BottomSheet>
  );
}
