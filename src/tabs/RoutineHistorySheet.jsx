import TagChip from "../ui/TagChip.jsx";
import HistorySheet from "../ui/HistorySheet.jsx";
import SetsSummary from "../ui/SetsSummary.jsx";

// Read-only bottom sheet opened by tapping a routine: every session and
// journal entry built from it (see applyRoutine / routineIds), newest first,
// with each session's logged sets — so you can see what you actually did
// each time you ran it. Entries are what was saved then; editing the routine
// since doesn't change them. `pathLabel` is the routine's folder path.
export default function RoutineHistorySheet({ routine, pathLabel, accent, sessions, journals, exerciseNameById, onClose }) {
  return (
    <HistorySheet
      sessions={sessions}
      journals={journals}
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
    />
  );
}
