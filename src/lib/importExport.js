import { combinedFromCSV } from "./combinedCsv.js";
import { normalizeSimpleEntries, normalizeFolderItems, normalizeExercises, mergeFolders } from "./importNormalize.js";

export { combinedToCSV, combinedFromCSV } from "./combinedCsv.js";

// Parses an imported .json or .csv file's text into normalized
// { sessions, journals, routines, folders, rolls, techniques, jitsFolders, exercises },
// merging any folders discovered in the file into `existingFolders`/
// `existingJitsFolders`. Throws if a JSON file has none of the known record types.
export function parseImportFile(filename, text, existingFolders, existingJitsFolders = []) {
  if (filename.toLowerCase().endsWith(".json")) {
    const parsed = JSON.parse(text);
    const hasKnownData = ["sessions", "routines", "journals", "rolls", "techniques", "exercises"].some((k) => Array.isArray(parsed[k]));
    if (!hasKnownData) {
      throw new Error("No sessions, journals, routines, rolls, techniques, or exercises found in JSON");
    }
    return {
      sessions: normalizeSimpleEntries(parsed.sessions),
      journals: normalizeSimpleEntries(parsed.journals),
      routines: normalizeFolderItems(parsed.routines, "Untitled routine"),
      folders: mergeFolders(existingFolders, parsed.folders),
      rolls: normalizeSimpleEntries(parsed.rolls),
      techniques: normalizeFolderItems(parsed.techniques, "Untitled technique", { techniqueExtras: true }),
      jitsFolders: mergeFolders(existingJitsFolders, parsed.jitsFolders),
      exercises: normalizeExercises(parsed.exercises),
    };
  }
  return combinedFromCSV(text, existingFolders, existingJitsFolders);
}
