import { useEffect, useMemo } from "react";
import { todayISO, uid } from "../lib/id.js";
import { newRecord, editById, editRecord } from "../lib/records.js";
import { folderPath } from "../lib/folders.js";
import { entriesByRoutine, routineOptions } from "../lib/routines.js";
import { entriesByExercise, exerciseDeleteWarning } from "../lib/exercises.js";
import { nameMap } from "../lib/search.js";
import { ENTRY_TYPES } from "../lib/entryTypes.js";
import { useLog } from "../lib/LogContext.js";
import RoutineHistorySheet from "../tabs/RoutineHistorySheet.jsx";
import ExerciseHistorySheet from "../tabs/ExerciseHistorySheet.jsx";
import FolderItemEditor from "../tabs/FolderItemEditor.jsx";
import ExerciseEditor from "../tabs/ExerciseEditor.jsx";
import { ROUTINE_CONFIG, routineDeleteWarning } from "../tabs/RoutinesTab.jsx";
import EntryDetailSheet from "./EntryDetailSheet.jsx";
import EntrySheet from "./EntrySheet.jsx";

const LIBRARY_ACCENT = "--accent2";

// Which logs an entry's form can switch between, the same as where it can be
// logged from: sessions and rolls together (like Home), journals alone.
const ENTRY_TYPE_GROUPS = {
  sessions: ["sessions", "rolls"],
  rolls: ["sessions", "rolls"],
  journals: ["journals"],
};

// Draws the app's sheet stack (see lib/SheetStack.js): every open summary
// sheet, and the edit forms opened from them, one level each. Every level
// stays mounted so nothing underneath loses its state (a half-written form,
// a scroll position), but only the top one is shown. A sheet whose record
// is deleted drops out of the stack by itself.
//
// Levels, besides the summary sheets SheetStack.open takes:
//   { kind: "editRoutine" | "editExercise", id }
//   { kind: "editEntry" | "redoEntry", source, id }
// Every edit form returns to the sheet it was opened from, on save or cancel.
export default function SheetStack({ stack, setStack }) {
  const log = useLog();
  const { sessions, journals, rolls, routines, setRoutines, folders, exercises, setExercises, exerciseUsage, routineUsage } = log;
  const entryLogs = { sessions, journals, rolls };
  const entrySetters = { sessions: log.setSessions, journals: log.setJournals, rolls: log.setRolls };

  const exerciseNameById = useMemo(() => nameMap(exercises), [exercises]);
  const routineNameById = useMemo(() => nameMap(routines), [routines]);

  const push = (level) => setStack((s) => [...s, { ...level, key: uid() }]);
  const back = () => setStack((s) => s.slice(0, -1));
  const closeAll = () => setStack([]);

  const recordOf = (level) => {
    if (level.kind === "routine" || level.kind === "editRoutine") return routines.find((r) => r.id === level.id);
    if (level.kind === "exercise" || level.kind === "editExercise") return exercises.find((e) => e.id === level.id);
    return (entryLogs[level.source] || []).find((e) => e.id === level.id);
  };

  // Drop levels whose record is gone (deleted here, on another level, or on
  // another device).
  const missing = stack.some((level) => !recordOf(level));
  useEffect(() => {
    if (missing) setStack((s) => s.filter((level) => recordOf(level)));
  });

  const deleteRoutine = (routine) => {
    const warning = routineDeleteWarning(routine, sessions, journals);
    if (!window.confirm(`Delete this routine?${warning ? ` ${warning}` : ""} This can't be undone.`)) return;
    setRoutines((prev) => prev.filter((r) => r.id !== routine.id));
  };

  const deleteExercise = (exercise) => {
    const warning = exerciseDeleteWarning(exercise.id, sessions, journals, routines);
    if (!window.confirm(`Delete this exercise?${warning} This can't be undone.`)) return;
    setExercises((prev) => prev.filter((e) => e.id !== exercise.id));
  };

  const deleteEntry = (source, entry) => {
    if (!window.confirm("Delete this entry? This can't be undone.")) return;
    entrySetters[source]((prev) => prev.filter((e) => e.id !== entry.id));
  };

  // Saves an entry form opened from a sheet: a redo is added to whichever log
  // it was switched to; an edit updates in place, or moves across logs if its
  // type was switched (keeping only its id and createdAt, as on Home), and
  // the sheets for it follow it there.
  const saveEntry = (level, entry) => (type, fields) => {
    if (level.kind === "redoEntry") {
      entrySetters[type]((prev) => [newRecord(fields), ...prev]);
    } else if (type === level.source) {
      entrySetters[type]((prev) => editById(prev, entry.id, fields));
    } else {
      entrySetters[level.source]((prev) => prev.filter((e) => e.id !== entry.id));
      entrySetters[type]((prev) => [editRecord({ id: entry.id, ...(entry.createdAt ? { createdAt: entry.createdAt } : {}) }, fields), ...prev]);
      setStack((s) => s.map((l) => (l.id === entry.id && l.source === level.source ? { ...l, source: type } : l)));
    }
    back();
  };

  const renderLevel = (level, i) => {
    const record = recordOf(level);
    if (!record) return null;
    const onBack = i > 0 ? back : undefined;
    // Opened while picking for an entry (see PagePicker): nothing on top of it
    // can be deleted either.
    const canDelete = !stack.slice(0, i + 1).some((l) => l.hideDelete);

    switch (level.kind) {
      case "routine":
        return (
          <RoutineHistorySheet
            routine={record}
            pathLabel={folderPath(folders, record.folderId).map((f) => f.name).join(" / ")}
            accent={LIBRARY_ACCENT}
            sessions={entriesByRoutine(sessions).get(record.id) || []}
            journals={entriesByRoutine(journals).get(record.id) || []}
            exerciseNameById={exerciseNameById}
            onEdit={() => push({ kind: "editRoutine", id: record.id })}
            onDelete={canDelete ? () => deleteRoutine(record) : undefined}
            onBack={onBack}
            onClose={closeAll}
          />
        );
      case "exercise": {
        const inRoutines = entriesByExercise(routines).get(record.id) || [];
        return (
          <ExerciseHistorySheet
            exercise={record}
            accent={LIBRARY_ACCENT}
            sessions={entriesByExercise(sessions).get(record.id) || []}
            journals={entriesByExercise(journals).get(record.id) || []}
            routines={routineOptions(routines, folders).filter((o) => inRoutines.some((r) => r.id === o.id))}
            onEdit={() => push({ kind: "editExercise", id: record.id })}
            onDelete={canDelete ? () => deleteExercise(record) : undefined}
            onBack={onBack}
            onClose={closeAll}
          />
        );
      }
      case "entry": {
        const meta = ENTRY_TYPES[level.source];
        return (
          <EntryDetailSheet
            entry={record}
            kindLabel={meta.singular}
            accent={meta.accent}
            exerciseNameById={exerciseNameById}
            routineNameById={routineNameById}
            onEdit={() => push({ kind: "editEntry", source: level.source, id: record.id })}
            onRedo={meta.canRedo ? () => push({ kind: "redoEntry", source: level.source, id: record.id }) : undefined}
            onDelete={() => deleteEntry(level.source, record)}
            onBack={onBack}
            onClose={closeAll}
          />
        );
      }
      case "editRoutine":
        return (
          <FolderItemEditor
            item={record}
            items={routines}
            setItems={setRoutines}
            folders={folders}
            config={ROUTINE_CONFIG}
            exercises={exercises}
            exerciseUsage={exerciseUsage}
            onClose={back}
          />
        );
      case "editExercise":
        return <ExerciseEditor exercise={record} exercises={exercises} setExercises={setExercises} onClose={back} />;
      case "editEntry":
      case "redoEntry": {
        const group = ENTRY_TYPE_GROUPS[level.source];
        const withSource = { ...record, source: level.source };
        return (
          <EntrySheet
            types={Object.fromEntries(group.map((k) => [k, ENTRY_TYPES[k]]))}
            entriesByType={Object.fromEntries(group.map((k) => [k, entryLogs[k]]))}
            routines={routines}
            folders={folders}
            exercises={exercises}
            exerciseUsage={exerciseUsage}
            routineUsage={routineUsage}
            entry={level.kind === "editEntry" ? withSource : undefined}
            redo={level.kind === "redoEntry" ? withSource : undefined}
            initialType={level.source}
            initialDate={todayISO()}
            onSave={saveEntry(level, record)}
            onClose={back}
          />
        );
      }
      default:
        return null;
    }
  };

  return stack.map((level, i) => (
    <div
      // Each level has its own key (given when it was opened), so it keeps its
      // state while others come and go around it.
      key={level.key}
      style={{ position: "absolute", inset: 0, zIndex: 15, display: i === stack.length - 1 ? "block" : "none" }}
    >
      {renderLevel(level, i)}
    </div>
  ));
}
