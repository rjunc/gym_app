import { formatDateTime, wasEdited } from "../lib/id.js";
import TagChip from "../ui/TagChip.jsx";
import HistorySheet from "../ui/HistorySheet.jsx";
import SetsSummary from "../ui/SetsSummary.jsx";
import BlocksDetail from "../ui/BlocksDetail.jsx";
import { labelStyle, noteTextStyle, metaStyle, chipRowStyle } from "../ui/styles.js";

// Read-only bottom sheet opened by tapping a routine: the routine itself (its
// folder, tags, its plan laid out like a session's blocks — numbered, with
// supersets/circuits bracketed and every planned set listed, see
// BlocksDetail — and full details text), then every session and
// journal entry built from it (see applyRoutine / routineIds), newest first,
// with each session's logged sets — so you can see what you actually did each
// time you ran it. Entries are what was saved then; editing the routine since
// doesn't change them. `pathLabel` is the routine's folder path. Its
// exercises are links to their own sheets (see SheetStack). A deleted
// Library exercise is only kept in the plan when it has sets or a note.
export default function RoutineHistorySheet({ routine, pathLabel, accent, sessions, journals, exerciseNameById, onEdit, onDelete, onBack, onClose }) {
  const blocks = (routine.blocks || []).filter((b) => exerciseNameById.has(b.exerciseId) || (b.sets || []).length > 0 || b.note);
  const created = formatDateTime(routine.createdAt);
  return (
    <HistorySheet
      sessions={sessions}
      journals={journals}
      onEdit={onEdit}
      onDelete={onDelete}
      onBack={onBack}
      onClose={onClose}
      emptyLabel="Not used in any sessions or journal entries yet. Add it to one with the Routines picker when logging."
      detail={(entry, entryAccent) => <SetsSummary entry={entry} exerciseNameById={exerciseNameById} accent={entryAccent} style={{ marginTop: 6 }} />}
      eyebrow="Routine"
      accent={accent}
      title={routine.name}
      meta={pathLabel}
      header={
        routine.tags &&
        routine.tags.length > 0 && (
          <div style={chipRowStyle}>
            {routine.tags.map((t) => (
              <TagChip key={t} label={t} small accent={accent} />
            ))}
          </div>
        )
      }
    >
      {blocks.length > 0 && (
        <div>
          <span style={labelStyle}>Plan</span>
          <BlocksDetail blocks={blocks} groups={routine.groups} exerciseNameById={exerciseNameById} accent={accent} />
        </div>
      )}

      {routine.text && (
        <div>
          <span style={labelStyle}>Details</span>
          <p style={noteTextStyle}>{routine.text}</p>
        </div>
      )}

      {created && (
        <div style={metaStyle}>
          Created {created}
          {wasEdited(routine) && ` · Edited ${formatDateTime(routine.updatedAt)}`}
        </div>
      )}
    </HistorySheet>
  );
}
