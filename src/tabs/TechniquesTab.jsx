import { useMemo } from "react";
import { entriesByLink, usageSummary, usageList } from "../lib/links.js";
import { useSheets } from "../lib/SheetStack.js";
import FolderLibraryTab from "./FolderLibraryTab.jsx";

// The technique form's wording and fields, shared by this page and the
// technique editor opened from a sheet (see FolderItemEditor, SheetStack).
export const TECHNIQUE_CONFIG = {
  itemNoun: "technique",
  namePlaceholder: "Scissor sweep, cross collar choke from mount…",
  textLabel: "Technique notes",
  textPlaceholder: "Setup, grips, step-by-step details, common mistakes, when it works best...",
  accent: "--accent4",
  showPositions: true,
  showStar: true,
  showGiOnly: true,
};

// Mat sessions that mention each technique (drilled or in a round), newest
// first.
export const rollsByTechnique = (rolls) => entriesByLink(rolls, "techniqueIds");

// What deleting a technique does to the mat sessions that use it, for the
// confirmation (empty when nothing uses it).
export function techniqueDeleteWarning(technique, rolls) {
  const list = usageList({ rolls: rollsByTechnique(rolls).get(technique.id) });
  return list ? `Used in ${list} — they'll keep their text, but lose the link.` : "";
}

// Techniques, plus backlinks to the mat sessions that drilled or rolled with
// each one (techniqueIds): a usage line on every card, a summary sheet on tap
// (the technique, how it's gone, then its history — see
// TechniqueHistorySheet), and a delete warning when it's been used. `pick`
// opens it for picking techniques into a mat session (see PagePicker and
// FolderLibraryTab's `pick`).
export default function TechniquesTab({ folders, setFolders, techniques, setTechniques, rolls = [], pick }) {
  const sheets = useSheets();
  const byTechnique = useMemo(() => rollsByTechnique(rolls), [rolls]);

  return (
    <FolderLibraryTab
      items={techniques}
      setItems={setTechniques}
      folders={folders}
      setFolders={setFolders}
      eyebrow="Library"
      heading="Techniques"
      searchPlaceholder="Search text, folders, positions…"
      emptyLabel='No techniques yet. Tap "New technique" or add a folder to start organizing your library.'
      {...TECHNIQUE_CONFIG}
      pick={pick}
      usageFor={(t) => usageSummary({ rolls: byTechnique.get(t.id) })}
      onOpenItem={sheets ? (t) => sheets.open({ kind: "technique", id: t.id, ...(pick ? { hideDelete: true } : {}) }) : undefined}
      deleteWarningFor={(t) => techniqueDeleteWarning(t, rolls)}
    />
  );
}
