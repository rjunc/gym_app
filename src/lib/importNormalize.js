import { uid, todayISO } from "./id.js";
import { normalizeTags } from "./combinedCsv.js";
import { importedTimestamps } from "./records.js";
import { normalizeSets, MEASURES, DEFAULT_MEASURE } from "./sets.js";

// Sessions/journals/rolls all share the same shape (id/date/tags/text, no
// folder), so one helper normalizes any of them out of an imported JSON payload.
// Sessions and journals carry exerciseIds and routineIds (rolls don't); they
// round-trip for any of the three if present, same as everything else here.
// Sessions also carry per-set numbers (sets), validated by normalizeSets.
// Every normalizer below keeps createdAt/updatedAt when the record has them.
export function normalizeSimpleEntries(arr) {
  return Array.isArray(arr)
    ? arr.map((s) => ({
        id: s.id || uid(),
        date: s.date || todayISO(),
        title: s.title || "",
        tags: normalizeTags(s.tags),
        text: s.text || "",
        ...(Array.isArray(s.exerciseIds) ? { exerciseIds: s.exerciseIds.filter((id) => typeof id === "string") } : {}),
        ...(Array.isArray(s.routineIds) ? { routineIds: s.routineIds.filter((id) => typeof id === "string") } : {}),
        ...(normalizeSets(s.sets) ? { sets: normalizeSets(s.sets) } : {}),
        ...importedTimestamps(s),
      }))
    : [];
}

// Routines/techniques share the same shape (id/name/folderId/tags/text), so
// one helper normalizes either out of an imported JSON payload. Techniques
// additionally carry an optional position -> toPosition pair for the Flow tab,
// a giOnly flag for the Gi/No-Gi mode filter, and a starred flag marking a
// go-to that sorts to the top. Routines carry an optional exerciseIds link
// into the exercise Library, which round-trips here the same way.
export function normalizeFolderItems(arr, defaultName, { techniqueExtras = false } = {}) {
  return Array.isArray(arr)
    ? arr.map((r) => ({
        id: r.id || uid(),
        name: r.name || defaultName,
        folderId: r.folderId || null,
        tags: normalizeTags(r.tags),
        text: r.text || "",
        ...(Array.isArray(r.exerciseIds) ? { exerciseIds: r.exerciseIds.filter((id) => typeof id === "string") } : {}),
        ...(techniqueExtras
          ? { position: r.position || "", toPosition: r.toPosition || "", giOnly: !!r.giOnly, starred: !!r.starred }
          : {}),
        ...importedTimestamps(r),
      }))
    : [];
}

// Library exercises: id/name/tags/text like a routine, plus an optional
// prescription string, how sets are logged (measure, weight × reps unless
// it's one of the known kinds) and an active flag (defaulting true, since most
// imported/older data predates the flag and should count as usable).
export function normalizeExercises(arr) {
  return Array.isArray(arr)
    ? arr.map((e) => ({
        id: e.id || uid(),
        name: e.name || "Untitled exercise",
        tags: normalizeTags(e.tags),
        text: e.text || "",
        prescription: e.prescription || "",
        measure: MEASURES[e.measure] ? e.measure : DEFAULT_MEASURE,
        active: e.active !== false,
        ...importedTimestamps(e),
      }))
    : [];
}

export function mergeFolders(existingFolders, incomingFolders) {
  if (!Array.isArray(incomingFolders)) return existingFolders;
  const byId = new Map(existingFolders.map((f) => [f.id, f]));
  incomingFolders.forEach((f) => byId.set(f.id, f));
  return Array.from(byId.values());
}
