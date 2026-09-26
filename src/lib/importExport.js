import { combinedFromCSV } from "./combinedCsv.js";
import { normalizeSimpleEntries, normalizeFolderItems, normalizeExercises, mergeFolders } from "./importNormalize.js";
import { cleanFields, cleanLine } from "./text.js";

export { combinedToCSV, combinedFromCSV } from "./combinedCsv.js";

// Parses an imported .json or .csv file's text into normalized
// { sessions, journals, routines, folders, rolls, techniques, jitsFolders, exercises },
// merging any folders discovered in the file into `existingFolders`/
// `existingJitsFolders`. Throws if a JSON file has none of the known record types.
// Imported text gets the same cleanup a composer applies on save (see
// cleanImport below).
export function parseImportFile(filename, text, existingFolders, existingJitsFolders = []) {
  return cleanImport(parseRaw(filename, text, existingFolders, existingJitsFolders));
}

// Fallback names for a record whose name is missing, or is only whitespace
// and so cleans down to nothing.
const DEFAULT_NAMES = { routines: "Untitled routine", techniques: "Untitled technique", exercises: "Untitled exercise" };

// Runs every imported record through cleanFields, exactly like a composer
// save, so an import can't bring back the stray spaces and runs of blank
// lines the composers now strip. Only the incoming records are touched —
// what's already in the log is left as is.
function cleanImport(data) {
  const out = { ...data };
  ["sessions", "journals", "rolls", "routines", "techniques", "exercises"].forEach((key) => {
    out[key] = data[key].map((item) => {
      const cleaned = cleanFields(item);
      if (key in DEFAULT_NAMES && !cleaned.name) cleaned.name = DEFAULT_NAMES[key];
      return cleaned;
    });
  });
  return out;
}

// Incoming folders from a JSON file get their names cleaned before merging;
// existing folders are left alone.
const cleanFolders = (folders) =>
  Array.isArray(folders) ? folders.map((f) => ({ ...f, name: cleanLine(f.name) || "Untitled folder" })) : folders;

function parseRaw(filename, text, existingFolders, existingJitsFolders) {
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
      folders: mergeFolders(existingFolders, cleanFolders(parsed.folders)),
      rolls: normalizeSimpleEntries(parsed.rolls),
      techniques: normalizeFolderItems(parsed.techniques, "Untitled technique", { techniqueExtras: true }),
      jitsFolders: mergeFolders(existingJitsFolders, cleanFolders(parsed.jitsFolders)),
      exercises: normalizeExercises(parsed.exercises),
    };
  }
  return combinedFromCSV(text, existingFolders, existingJitsFolders);
}
