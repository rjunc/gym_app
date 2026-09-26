import SimpleEntryTab from "./SimpleEntryTab.jsx";

export default function SessionsTab({ sessions, setSessions, exercises, exerciseUsage, routines, folders }) {
  return (
    <SimpleEntryTab
      entries={sessions}
      setEntries={setSessions}
      eyebrow="Training journal"
      heading="Session Log"
      searchPlaceholder="Search text, tags, exercises…"
      emptyLabel='No sessions logged yet. Tap "New entry" to write your first one.'
      textLabel="What did you do?"
      canRedo
      textPlaceholder="Warmed up with 10 min bike, then did 5x5 back squat working up to 225, superset with..."
      showExercises
      exercises={exercises}
      exerciseUsage={exerciseUsage}
      showRoutines
      routines={routines}
      folders={folders}
    />
  );
}
