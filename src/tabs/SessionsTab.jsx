import { ENTRY_TYPES } from "../lib/entryTypes.js";
import SimpleEntryTab from "./SimpleEntryTab.jsx";

export default function SessionsTab({ sessions, setSessions, exercises, exerciseUsage, routines, routineUsage, folders }) {
  return (
    <SimpleEntryTab
      entries={sessions}
      source="sessions"
      setEntries={setSessions}
      type={ENTRY_TYPES.sessions}
      exercises={exercises}
      exerciseUsage={exerciseUsage}
      routines={routines}
      routineUsage={routineUsage}
      folders={folders}
    />
  );
}
