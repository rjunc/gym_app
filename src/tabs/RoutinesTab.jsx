import { useMemo } from "react";
import { entriesByRoutine } from "../lib/routines.js";
import { usageSummary, usageList } from "../lib/links.js";
import { useSheets } from "../lib/SheetStack.js";
import FolderLibraryTab from "./FolderLibraryTab.jsx";

const ACCENT = "--accent2";

// The routine form's wording and fields, shared by this page and the routine
// editor opened from a sheet (see FolderItemEditor, SheetStack).
export const ROUTINE_CONFIG = {
  itemNoun: "routine",
  namePlaceholder: "Push day A, 20-min plyo circuit…",
  textLabel: "Routine details",
  textPlaceholder: "Warm-up, then A1) Back squat 5x5, A2) Romanian deadlift 4x8, B1) Walking lunges..., finish with core circuit...",
  accent: ACCENT,
  showExercises: true,
};

// What deleting a routine does to the entries built from it, for the
// confirmation (empty when nothing uses it).
export function routineDeleteWarning(routine, sessions, journals) {
  const list = usageList({ sessions: entriesByRoutine(sessions).get(routine.id), journals: entriesByRoutine(journals).get(routine.id) });
  return list ? `Used in ${list} — they'll keep their text, but lose the link.` : "";
}

// Routines, plus backlinks to the sessions and journal entries built from
// each one (routineIds): a usage line on every card, a summary sheet on tap
// (the routine's details, then its history — opened on the app's sheet
// stack, see SheetStack), and a delete warning when a routine has been used.
// `pick` opens it for picking routines into an entry (see PagePicker and
// FolderLibraryTab's `pick`); the summary sheet then hides Delete too.
export default function RoutinesTab({ folders, setFolders, routines, setRoutines, exercises, exerciseUsage, sessions = [], journals = [], pick }) {
  const sheets = useSheets();
  const sessionsByRoutine = useMemo(() => entriesByRoutine(sessions), [sessions]);
  const journalsByRoutine = useMemo(() => entriesByRoutine(journals), [journals]);
  const usesOf = (routine) => ({ sessions: sessionsByRoutine.get(routine.id), journals: journalsByRoutine.get(routine.id) });

  return (
    <FolderLibraryTab
      items={routines}
      setItems={setRoutines}
      folders={folders}
      setFolders={setFolders}
      eyebrow="Library"
      heading="Routines"
      searchPlaceholder="Search text, folders, exercises…"
      emptyLabel='No routines yet. Tap "New routine" or add a folder to start organizing your library.'
      {...ROUTINE_CONFIG}
      exercises={exercises}
      exerciseUsage={exerciseUsage}
      pick={pick}
      usageFor={(routine) => usageSummary(usesOf(routine))}
      onOpenItem={(routine) => sheets.open({ kind: "routine", id: routine.id, ...(pick ? { hideDelete: true } : {}) })}
      deleteWarningFor={(routine) => routineDeleteWarning(routine, sessions, journals)}
    />
  );
}
