import { useState, useMemo } from "react";
import { entriesByRoutine } from "../lib/routines.js";
import { usageSummary, usageList } from "../lib/links.js";
import { folderPath } from "../lib/folders.js";
import { exerciseNameMap, nameMap } from "../lib/search.js";
import FolderLibraryTab from "./FolderLibraryTab.jsx";
import RoutineHistorySheet from "./RoutineHistorySheet.jsx";

const ACCENT = "--accent2";

// Routines, plus backlinks to the sessions and journal entries built from
// each one (routineIds): a usage line on every card, a summary sheet on tap
// (the routine's details, then its history), and a delete warning when a
// routine has been used.
// `pick` opens it for picking routines into an entry (see PagePicker and
// FolderLibraryTab's `pick`); the summary sheet then hides Delete too.
export default function RoutinesTab({ folders, setFolders, routines, setRoutines, exercises, exerciseUsage, sessions = [], journals = [], pick }) {
  // The routine whose summary is open, with the page's edit/remove actions
  // for it (see FolderLibraryTab's onOpenItem).
  const [history, setHistory] = useState(null);
  const sessionsByRoutine = useMemo(() => entriesByRoutine(sessions), [sessions]);
  const journalsByRoutine = useMemo(() => entriesByRoutine(journals), [journals]);
  const exerciseNameById = useMemo(() => exerciseNameMap(exercises), [exercises]);
  const routineNameById = useMemo(() => nameMap(routines), [routines]);
  const usesOf = (routine) => ({ sessions: sessionsByRoutine.get(routine.id), journals: journalsByRoutine.get(routine.id) });
  const historyRoutine = history ? routines.find((r) => r.id === history.id) : null;

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
        pick={pick}
        usageFor={(routine) => usageSummary(usesOf(routine))}
        onOpenItem={(routine, actions) => setHistory({ id: routine.id, ...actions })}
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
          routineNameById={routineNameById}
          onEdit={() => {
            setHistory(null);
            history.edit();
          }}
          onDelete={
            pick
              ? undefined
              : () => {
                  if (history.remove()) setHistory(null);
                }
          }
          onClose={() => setHistory(null)}
        />
      )}
    </>
  );
}
