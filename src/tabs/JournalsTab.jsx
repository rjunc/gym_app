import SimpleEntryTab from "./SimpleEntryTab.jsx";

export default function JournalsTab({ journals, setJournals, exercises, exerciseUsage, routines, routineUsage, folders }) {
  return (
    <SimpleEntryTab
      entries={journals}
      setEntries={setJournals}
      eyebrow="Personal journal"
      heading="Journal"
      entryLabel="Journal entry"
      searchPlaceholder="Search text, tags, exercises, routines…"
      emptyLabel='No journal entries yet. Tap "New entry" to write your first one.'
      textLabel="What's on your mind?"
      textPlaceholder="How training's feeling, energy levels, sleep, motivation, anything worth remembering..."
      accent="--accent3"
      showExercises
      exercises={exercises}
      exerciseUsage={exerciseUsage}
      showRoutines
      routines={routines}
      routineUsage={routineUsage}
      folders={folders}
    />
  );
}
