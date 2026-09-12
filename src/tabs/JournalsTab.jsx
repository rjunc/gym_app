import SimpleEntryTab from "./SimpleEntryTab.jsx";

export default function JournalsTab({ journals, setJournals }) {
  return (
    <SimpleEntryTab
      entries={journals}
      setEntries={setJournals}
      eyebrow="Personal journal"
      heading="Journal"
      searchPlaceholder="Search journal entries or tags…"
      emptyLabel='No journal entries yet. Tap "New entry" to write your first one.'
      textLabel="What's on your mind?"
      textPlaceholder="How training's feeling, energy levels, sleep, motivation, anything worth remembering..."
      accent="--accent3"
    />
  );
}
