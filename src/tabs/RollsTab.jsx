import SimpleEntryTab from "./SimpleEntryTab.jsx";

export default function RollsTab({ rolls, setRolls }) {
  return (
    <SimpleEntryTab
      entries={rolls}
      setEntries={setRolls}
      eyebrow="Training journal"
      heading="Rolls & Classes"
      searchPlaceholder="Search entries or tags…"
      emptyLabel='No rolls logged yet. Tap "New entry" to write your first one.'
      textLabel="What did you work on?"
      textPlaceholder="Gi class, drilled scissor sweep to knee-on-belly, rolled 5 rounds, caught a triangle from closed guard..."
      accent="--accent4"
    />
  );
}
