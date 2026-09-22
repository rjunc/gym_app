import { uid, todayISO } from "./id.js";
import { normalizeTags } from "./combinedCsv.js";

// Sessions/journals/rolls all share the same shape (id/date/tags/text, no
// folder), so one helper normalizes any of them out of an imported JSON payload.
export function normalizeSimpleEntries(arr) {
  return Array.isArray(arr)
    ? arr.map((s) => ({
        id: s.id || uid(),
        date: s.date || todayISO(),
        title: s.title || "",
        tags: normalizeTags(s.tags),
        text: s.text || "",
      }))
    : [];
}

// Routines/techniques share the same shape (id/name/folderId/tags/text), so
// one helper normalizes either out of an imported JSON payload. Techniques
// additionally carry an optional position -> toPosition pair for the Flow tab,
// a giOnly flag for the Gi/No-Gi mode filter, and a starred flag marking a
// go-to that sorts to the top.
export function normalizeFolderItems(arr, defaultName, { techniqueExtras = false } = {}) {
  return Array.isArray(arr)
    ? arr.map((r) => ({
        id: r.id || uid(),
        name: r.name || defaultName,
        folderId: r.folderId || null,
        tags: normalizeTags(r.tags),
        text: r.text || "",
        ...(techniqueExtras
          ? { position: r.position || "", toPosition: r.toPosition || "", giOnly: !!r.giOnly, starred: !!r.starred }
          : {}),
      }))
    : [];
}

// Library exercises: id/name/tags/text like a routine, plus an optional
// prescription string and an active flag (defaulting true, since most
// imported/older data predates the flag and should count as usable).
export function normalizeExercises(arr) {
  return Array.isArray(arr)
    ? arr.map((e) => ({
        id: e.id || uid(),
        name: e.name || "Untitled exercise",
        tags: normalizeTags(e.tags),
        text: e.text || "",
        prescription: e.prescription || "",
        active: e.active !== false,
      }))
    : [];
}

export function mergeFolders(existingFolders, incomingFolders) {
  if (!Array.isArray(incomingFolders)) return existingFolders;
  const byId = new Map(existingFolders.map((f) => [f.id, f]));
  incomingFolders.forEach((f) => byId.set(f.id, f));
  return Array.from(byId.values());
}
