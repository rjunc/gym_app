import SimpleEntryTab from "./SimpleEntryTab.jsx";

export default function SessionsTab({ sessions, setSessions }) {
  return (
    <SimpleEntryTab
      entries={sessions}
      setEntries={setSessions}
      eyebrow="Training journal"
      heading="Session Log"
      searchPlaceholder="Search entries or tags…"
      emptyLabel='No sessions logged yet. Tap "New entry" to write your first one.'
      textLabel="What did you do?"
      textPlaceholder="Warmed up with 10 min bike, then did 5x5 back squat working up to 225, superset with..."
    />
  );
}
