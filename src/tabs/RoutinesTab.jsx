import FolderLibraryTab from "./FolderLibraryTab.jsx";

export default function RoutinesTab({ folders, setFolders, routines, setRoutines }) {
  return (
    <FolderLibraryTab
      items={routines}
      setItems={setRoutines}
      folders={folders}
      setFolders={setFolders}
      eyebrow="Library"
      heading="Routines"
      itemNoun="routine"
      searchPlaceholder="Search routines or tags…"
      emptyLabel='No routines yet. Tap "New routine" or add a folder to start organizing your library.'
      namePlaceholder="Push day A, 20-min plyo circuit…"
      textLabel="Routine details"
      textPlaceholder="Warm-up, then A1) Back squat 5x5, A2) Romanian deadlift 4x8, B1) Walking lunges..., finish with core circuit..."
      accent="--accent2"
    />
  );
}
