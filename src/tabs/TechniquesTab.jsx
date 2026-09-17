import FolderLibraryTab from "./FolderLibraryTab.jsx";

export default function TechniquesTab({ folders, setFolders, techniques, setTechniques }) {
  return (
    <FolderLibraryTab
      items={techniques}
      setItems={setTechniques}
      folders={folders}
      setFolders={setFolders}
      eyebrow="Library"
      heading="Techniques"
      itemNoun="technique"
      searchPlaceholder="Search techniques or tags…"
      emptyLabel='No techniques yet. Tap "New technique" or add a folder to start organizing your library.'
      namePlaceholder="Scissor sweep, cross collar choke from mount…"
      textLabel="Technique notes"
      textPlaceholder="Setup, grips, step-by-step details, common mistakes, when it works best..."
      accent="--accent4"
      showPositions
    />
  );
}
