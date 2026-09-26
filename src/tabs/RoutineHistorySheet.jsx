import { formatDateTime, wasEdited } from "../lib/id.js";
import TagChip from "../ui/TagChip.jsx";
import HistorySheet from "../ui/HistorySheet.jsx";
import SetsSummary from "../ui/SetsSummary.jsx";
import { SheetLink } from "../ui/SheetNav.jsx";
import { labelStyle } from "../ui/styles.js";

// Read-only bottom sheet opened by tapping a routine: the routine itself (its
// folder, tags, exercises and full details text), then every session and
// journal entry built from it (see applyRoutine / routineIds), newest first,
// with each session's logged sets — so you can see what you actually did each
// time you ran it. Entries are what was saved then; editing the routine since
// doesn't change them. `pathLabel` is the routine's folder path. Its
// exercises are links to their own sheets (see SheetStack).
export default function RoutineHistorySheet({ routine, pathLabel, accent, sessions, journals, exerciseNameById, onEdit, onDelete, onBack, onClose }) {
  const exerciseIds = (routine.exerciseIds || []).filter((id) => exerciseNameById.has(id));
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
      header={
        <>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{routine.name}</div>
          {pathLabel && <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{pathLabel}</div>}
          {routine.tags && routine.tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {routine.tags.map((t) => (
                <TagChip key={t} label={t} small accent={accent} />
              ))}
            </div>
          )}
        </>
      }
    >
      {exerciseIds.length > 0 && (
        <div>
          <span style={labelStyle}>Exercises</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {exerciseIds.map((id) => (
              <div key={id} style={{ fontSize: 13, fontWeight: 600, color: `var(${accent})` }}>
                <SheetLink sheet={{ kind: "exercise", id }}>{exerciseNameById.get(id)}</SheetLink>
              </div>
            ))}
          </div>
        </div>
      )}

      {routine.text && (
        <div>
          <span style={labelStyle}>Details</span>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, lineHeight: 1.55, color: "var(--text)", margin: 0, whiteSpace: "pre-wrap" }}>
            {routine.text}
          </p>
        </div>
      )}

      {created && (
        <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
          Created {created}
          {wasEdited(routine) && ` · Edited ${formatDateTime(routine.updatedAt)}`}
        </div>
      )}
    </HistorySheet>
  );
}
