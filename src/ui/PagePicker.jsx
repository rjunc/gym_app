import { useLog } from "../lib/LogContext.js";
import RoutinesTab from "../tabs/RoutinesTab.jsx";
import ExerciseLibraryTab from "../tabs/ExerciseLibraryTab.jsx";

// The real Routines or Library page, opened over the entry form to pick from:
// every folder, search, filter, preview and "New …" button works exactly as
// on the page, plus an Add button on each card (see the pages' `pick` prop).
// The form underneath stays open, so the draft is never lost. Covers the
// whole screen like a page; the page's own sheets (new/edit forms, summaries)
// stack on top of it.
//   kind          "routines" or "exercises"
//   addedIds      what's already in the entry, shown as "Added"
//   onAdd(record) adds one to the entry — also called for anything created
//                 from here, since that's why it was created
//   initialQuery  what was typed in the form's field, to start the search from
export default function PagePicker({ kind, addedIds, onAdd, onDone, initialQuery = "" }) {
  const log = useLog();
  const pick = { addedIds, onAdd, onDone, initialQuery };
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 10, background: "var(--bg)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {kind === "routines" ? (
        <RoutinesTab
          folders={log.folders}
          setFolders={log.setFolders}
          routines={log.routines}
          setRoutines={log.setRoutines}
          exercises={log.exercises}
          exerciseUsage={log.exerciseUsage}
          sessions={log.sessions}
          journals={log.journals}
          pick={pick}
        />
      ) : (
        <ExerciseLibraryTab
          exercises={log.exercises}
          setExercises={log.setExercises}
          sessions={log.sessions}
          journals={log.journals}
          routines={log.routines}
          folders={log.folders}
          pick={pick}
        />
      )}
    </div>
  );
}
