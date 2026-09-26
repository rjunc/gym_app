import { useState, useMemo } from "react";
import { entriesByRoutine } from "../lib/routines.js";
import { usageSummary, usageList } from "../lib/links.js";
import { folderPath } from "../lib/folders.js";
import { exerciseNameMap } from "../lib/search.js";
import FolderLibraryTab from "./FolderLibraryTab.jsx";
import RoutineHistorySheet from "./RoutineHistorySheet.jsx";

const ACCENT = "--accent2";

// Routines, plus backlinks to the sessions and journal entries built from
// each one (routineIds): a usage line on every card, a history sheet on tap,
// and a delete warning when a routine has been used.
export default function RoutinesTab({ folders, setFolders, routines, setRoutines, exercises, exerciseUsage, sessions = [], journals = [] }) {
  const [historyId, setHistoryId] = useState(null);
  const sessionsByRoutine = useMemo(() => entriesByRoutine(sessions), [sessions]);
  const journalsByRoutine = useMemo(() => entriesByRoutine(journals), [journals]);
  const exerciseNameById = useMemo(() => exerciseNameMap(exercises), [exercises]);
  const usesOf = (routine) => ({ sessions: sessionsByRoutine.get(routine.id), journals: journalsByRoutine.get(routine.id) });
  const historyRoutine = historyId ? routines.find((r) => r.id === historyId) : null;

  return (
    <>
      <FolderLibraryTab
        items={routines}
        setItems={setRoutines}
        folders={folders}
        setFolders={setFolders}
        eyebrow="Library"
        heading="Routines"
        itemNoun="routine"
        searchPlaceholder="Search text, folders, exercises…"
        emptyLabel='No routines yet. Tap "New routine" or add a folder to start organizing your library.'
        namePlaceholder="Push day A, 20-min plyo circuit…"
        textLabel="Routine details"
        textPlaceholder="Warm-up, then A1) Back squat 5x5, A2) Romanian deadlift 4x8, B1) Walking lunges..., finish with core circuit..."
        accent={ACCENT}
        showExercises
        exercises={exercises}
        exerciseUsage={exerciseUsage}
        usageFor={(routine) => usageSummary(usesOf(routine))}
        onOpenItem={(routine) => setHistoryId(routine.id)}
        deleteWarningFor={(routine) => {
          const list = usageList(usesOf(routine));
          return list ? `Used in ${list} — they'll keep their text, but lose the link.` : "";
        }}
      />

      {historyRoutine && (
        <RoutineHistorySheet
          routine={historyRoutine}
          pathLabel={folderPath(folders, historyRoutine.folderId).map((f) => f.name).join(" / ")}
          accent={ACCENT}
          sessions={sessionsByRoutine.get(historyRoutine.id) || []}
          journals={journalsByRoutine.get(historyRoutine.id) || []}
          exerciseNameById={exerciseNameById}
          onClose={() => setHistoryId(null)}
        />
      )}
    </>
  );
}
