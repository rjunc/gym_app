import { formatSets, exerciseNoteOf } from "../lib/sets.js";
import TagChip from "../ui/TagChip.jsx";
import HistorySheet from "../ui/HistorySheet.jsx";
import { SheetLink } from "../ui/SheetNav.jsx";
import { labelStyle } from "../ui/styles.js";

// Read-only bottom sheet opened by tapping an exercise in the Library: the
// routines that include it, then every session and journal entry that links
// it as one newest-first timeline, with the sets logged for this exercise
// each time. `routines` arrive as { id, label } with the folder path already
// in the label (see routineOptions).
// Its routines are links to their own sheets (see SheetStack).
export default function ExerciseHistorySheet({ exercise, accent, sessions, journals, routines, onEdit, onDelete, onBack, onClose }) {
  return (
    <HistorySheet
      sessions={sessions}
      journals={journals}
      onEdit={onEdit}
      onDelete={onDelete}
      onBack={onBack}
      onClose={onClose}
      emptyLabel="Not used in any sessions or journal entries yet."
      detail={(entry, entryAccent) => {
        const list = (entry.sets && entry.sets[exercise.id]) || [];
        const note = exerciseNoteOf(entry, exercise.id);
        return (
          <>
            {list.length > 0 && <div style={{ fontSize: 13, fontWeight: 700, color: `var(${entryAccent})`, marginTop: 4 }}>{formatSets(list)}</div>}
            {note && <div style={{ fontSize: 12, color: "var(--text-dim)", fontStyle: "italic", marginTop: 2 }}>{note}</div>}
          </>
        );
      }}
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
                <SheetLink sheet={{ kind: "routine", id: r.id }}>{r.label}</SheetLink>
              </div>
            ))}
          </div>
        </div>
      )}
    </HistorySheet>
  );
}
