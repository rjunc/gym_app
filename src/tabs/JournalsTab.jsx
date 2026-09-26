import SimpleEntryTab from "./SimpleEntryTab.jsx";

export default function JournalsTab({ journals, setJournals, exercises, exerciseUsage, routines, folders }) {
  return (
    <SimpleEntryTab
      entries={journals}
      setEntries={setJournals}
      eyebrow="Personal journal"
      heading="Journal"
      searchPlaceholder="Search text, tags, exercises…"
      emptyLabel='No journal entries yet. Tap "New entry" to write your first one.'
      textLabel="What's on your mind?"
      textPlaceholder="How training's feeling, energy levels, sleep, motivation, anything worth remembering..."
      accent="--accent3"
      showExercises
      exercises={exercises}
      exerciseUsage={exerciseUsage}
      showRoutines
      routines={routines}
      folders={folders}
    />
  );
}
