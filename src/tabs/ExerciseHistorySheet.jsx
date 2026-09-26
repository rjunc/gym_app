import { formatSets } from "../lib/sets.js";
import TagChip from "../ui/TagChip.jsx";
import HistorySheet from "../ui/HistorySheet.jsx";
import { labelStyle } from "../ui/styles.js";

// Read-only bottom sheet opened by tapping an exercise in the Library: the
// routines that include it, then every session and journal entry that links
// it as one newest-first timeline, with the sets logged for this exercise
// each time. `routines` arrive as { id, label } with the folder path already
// in the label (see routineOptions).
export default function ExerciseHistorySheet({ exercise, accent, sessions, journals, routines, exerciseNameById, routineNameById, onEdit, onDelete, onClose }) {
  return (
    <HistorySheet
      sessions={sessions}
      journals={journals}
      exerciseNameById={exerciseNameById}
      routineNameById={routineNameById}
      onEdit={onEdit}
      onDelete={onDelete}
      onClose={onClose}
      emptyLabel="Not used in any sessions or journal entries yet."
      detail={(entry, entryAccent) =>
        entry.sets &&
        (entry.sets[exercise.id] || []).length > 0 && (
          <div style={{ fontSize: 13, fontWeight: 700, color: `var(${entryAccent})`, marginTop: 4 }}>{formatSets(entry.sets[exercise.id])}</div>
        )
      }
      header={
        <>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{exercise.name}</div>
          {exercise.prescription && <div style={{ fontSize: 12, color: `var(${accent})`, fontWeight: 600 }}>{exercise.prescription}</div>}
          {exercise.tags && exercise.tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {exercise.tags.map((t) => (
                <TagChip key={t} label={t} small accent={accent} />
              ))}
            </div>
          )}
        </>
      }
    >
      {routines.length > 0 && (
        <div>
          <span style={labelStyle}>In {routines.length === 1 ? "1 routine" : `${routines.length} routines`}</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {routines.map((r) => (
              <div key={r.id} style={{ fontSize: 13 }}>
                {r.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </HistorySheet>
  );
}
