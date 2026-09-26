import { useState } from "react";
import { useLog } from "../lib/LogContext.js";
import RoutinesTab from "../tabs/RoutinesTab.jsx";
import ExerciseLibraryTab from "../tabs/ExerciseLibraryTab.jsx";

// The real Routines or Library page, opened over the entry form to pick from:
// every folder, search, filter, preview and "New …" button works exactly as
// on the page, plus an Add button on each card (see the pages' `pick` prop).
// The form underneath stays open, so the draft is never lost. Covers the
// whole screen like a page; the page's own sheets (new/edit forms, summaries)
// stack on top of it.
// Nothing reaches the form until Done: adds are held here and applied then,
// in order. So taking back something added on this visit leaves no trace —
// which matters for routines, whose tags, exercises and text merge into the
// form for good once applied.
//   kind          "routines" or "exercises"
//   addedIds      what's already in the entry, shown as "Added"
//   onAdd(record) adds one to the entry — also called for anything created
//                 from here, since that's why it was created
//   onRemove(id)  takes out one that was already in the entry, the same as
//                 its pill's X in the form
//   initialQuery  what was typed in the form's field, to start the search from
export default function PagePicker({ kind, addedIds, onAdd, onRemove, onDone, initialQuery = "" }) {
  const log = useLog();
  const [held, setHeld] = useState([]);
  const current = kind === "routines" ? log.routines : log.exercises;
  const latest = (r) => current.find((c) => c.id === r.id) || r;
  // For the bar's chips: what the entry will have after Done, in order.
  const chosen = [
    ...addedIds.map((id) => current.find((c) => c.id === id)).filter(Boolean).map((r) => ({ id: r.id, name: r.name, isNew: false })),
    ...held.map(latest).map((r) => ({ id: r.id, name: r.name, isNew: true })),
  ];
  const pick = {
    addedIds: [...addedIds, ...held.map((r) => r.id)],
    chosen,
    onAdd: (record) => setHeld((h) => (h.some((r) => r.id === record.id) ? h : [...h, record])),
    onRemove: (id) => (held.some((r) => r.id === id) ? setHeld((h) => h.filter((r) => r.id !== id)) : onRemove(id)),
    // The latest version of each, in case it was edited after being added.
    onDone: () => {
      held.map(latest).forEach(onAdd);
      onDone();
    },
    initialQuery,
  };
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
          pick={pick}
        />
      )}
    </div>
  );
}
