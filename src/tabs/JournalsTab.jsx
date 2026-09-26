import { ENTRY_TYPES } from "../lib/entryTypes.js";
import SimpleEntryTab from "./SimpleEntryTab.jsx";

export default function JournalsTab({ journals, setJournals, exercises, exerciseUsage, routines, routineUsage, folders }) {
  return (
    <SimpleEntryTab
      entries={journals}
      source="journals"
      setEntries={setJournals}
      type={ENTRY_TYPES.journals}
      exercises={exercises}
      exerciseUsage={exerciseUsage}
      routines={routines}
      routineUsage={routineUsage}
      folders={folders}
    />
  );
}
