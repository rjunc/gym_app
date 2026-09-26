import { X } from "lucide-react";
import { labelStyle, inputStyle, primaryBtnStyle } from "./styles.js";
import {
  NameField,
  DateField,
  FolderField,
  PositionsField,
  StarField,
  GiOnlyField,
  PrescriptionField,
  MeasureField,
  ActiveField,
  ExercisesField,
  RoutinesField,
} from "./ComposerFields.jsx";
import TagsField from "./TagsField.jsx";
import SetsField from "./SetsField.jsx";

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
  // How a Library exercise is measured when logging sets (weight × reps,
  // reps, time, distance).
  showMeasure,
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
  // Per-set numbers for each linked exercise (sessions only; see SetsField).
  // `setsHistory` is the sessions the "Last time" hint looks through, and
  // `entryId` the entry being edited, so it never suggests itself.
  showSets,
  setsHistory = [],
  entryId,
  // A picker that copies routines (tags, exercises, text) into the form, any
  // number of them (Sessions and Journals). `routineOptions` is routineOptions()
  // output; `routines` are the records it points at.
  showRoutines,
  routines = [],
  routineOptions = [],
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
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", zIndex: 10 }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          borderTop: "1px solid var(--border)",
          borderRadius: "16px 16px 0 0",
          width: "100%",
          maxHeight: "88%",
          display: "flex",
          flexDirection: "column",
          padding: 18,
          gap: 12,
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        {topContent}

        {showName && <NameField form={form} setForm={setForm} nameField={nameField} nameLabel={nameLabel} namePlaceholder={namePlaceholder} />}
        {showName && nameError && <div style={{ color: "var(--danger)", fontSize: 12, marginTop: -6 }}>{nameError}</div>}

        {showDate && <DateField form={form} setForm={setForm} />}

        {showFolder && <FolderField form={form} setForm={setForm} folderOptions={folderOptions} />}

        {showPositions && <PositionsField form={form} setForm={setForm} positionOptions={positionOptions} />}

        {showStar && <StarField form={form} setForm={setForm} />}

        {showGiOnly && <GiOnlyField form={form} setForm={setForm} accentVar={accentVar} />}

        {showPrescription && <PrescriptionField form={form} setForm={setForm} />}

        {showMeasure && <MeasureField form={form} setForm={setForm} accentVar={accentVar} />}

        {showActive && <ActiveField form={form} setForm={setForm} accentVar={accentVar} activeLabel={activeLabel} />}

        {showRoutines && <RoutinesField form={form} setForm={setForm} routines={routines} options={routineOptions} accentVar={accentVar} />}

        {showExercises && (
          <ExercisesField form={form} setForm={setForm} exercises={exerciseOptions} accentVar={accentVar} usage={exerciseUsage} />
        )}

        {showExercises && showSets && (
          <SetsField form={form} setForm={setForm} exercises={exerciseOptions} history={setsHistory} entryId={entryId} accentVar={accentVar} />
        )}

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

        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <label style={labelStyle}>{textLabel}</label>
          <textarea
            value={form.text}
            onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
            placeholder={textPlaceholder}
            style={{ ...inputStyle, fontFamily: "'IBM Plex Mono', monospace", minHeight: 150, resize: "vertical", lineHeight: 1.5 }}
          />
        </div>

        <button
          onClick={onSave}
          disabled={saveDisabled}
          style={{
            ...primaryBtnStyle,
            background: `var(${accentVar})`,
            justifyContent: "center",
            padding: "12px 0",
            opacity: saveDisabled ? 0.45 : 1,
            cursor: saveDisabled ? "not-allowed" : "pointer",
          }}
        >
          {saveLabel}
        </button>
      </div>
    </div>
  );
}
