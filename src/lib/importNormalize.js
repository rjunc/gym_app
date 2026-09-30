import { uid, todayISO } from "./id.js";
import { normalizeTags } from "./combinedCsv.js";
import { importedTimestamps } from "./records.js";
import { normalizeBlocks, blockExerciseIds, MEASURES } from "./sets.js";
import { normalizeGroups, tidyGroups } from "./groups.js";
import { normalizeMat } from "./mat.js";

// Sessions/journals/rolls all share the same shape (id/date/tags/text, no
// folder), so one helper normalizes any of them out of an imported JSON payload.
// Sessions and journals carry exerciseIds and routineIds (rolls don't); they
// round-trip for any of the three if present, same as everything else here.
// Sessions also carry what was done in order (blocks: exercise, sets, note)
// and the supersets/circuits those form (groups), validated by
// normalizeBlocks / normalizeGroups and made to agree by tidyGroups. Mat
// sessions (rolls) carry gi, drilled techniques and rounds (normalizeMat).
// Every normalizer below keeps createdAt/updatedAt when the record has them.
// An imported entry's blocks and groups, checked and consistent with each
// other; neither field when it has no blocks.
function blocksAndGroups(s) {
  const blocks = normalizeBlocks(s.blocks);
  if (!blocks) return {};
  const tidy = tidyGroups(blocks, normalizeGroups(s.groups) || []);
  return { blocks: tidy.blocks, ...(tidy.groups.length > 0 ? { groups: tidy.groups } : {}) };
}

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
        ...blocksAndGroups(s),
        ...normalizeMat(s),
        ...importedTimestamps(s),
      }))
    : [];
}

// Routines/techniques share the same shape (id/name/folderId/tags/text), so
// one helper normalizes either out of an imported JSON payload. Techniques
// additionally carry an optional position -> toPosition pair for the Flow tab,
// a giOnly flag for the Gi/No-Gi mode filter, and a starred flag marking a
// go-to that sorts to the top. Routines carry their plan the same way a
// session carries what was done (blocks and groups, checked the same way),
// and exerciseIds, which for a routine with blocks is derived from them so
// the two always agree.
export function normalizeFolderItems(arr, defaultName, { techniqueExtras = false } = {}) {
  return Array.isArray(arr)
    ? arr.map((r) => {
        const plan = techniqueExtras ? {} : blocksAndGroups(r);
        return {
          id: r.id || uid(),
          name: r.name || defaultName,
          folderId: r.folderId || null,
          tags: normalizeTags(r.tags),
          text: r.text || "",
          ...(plan.blocks
            ? { exerciseIds: blockExerciseIds(plan.blocks) }
            : Array.isArray(r.exerciseIds)
              ? { exerciseIds: r.exerciseIds.filter((id) => typeof id === "string") }
              : {}),
          ...plan,
          ...(techniqueExtras
            ? { position: r.position || "", toPosition: r.toPosition || "", giOnly: !!r.giOnly, starred: !!r.starred }
            : {}),
          ...importedTimestamps(r),
        };
      })
    : [];
}

// Library exercises: id/name/folderId/tags/text like a routine, plus an optional
// prescription string, the measure older exercises carry (kept only if it's
// one of the known kinds; see measureOf) and an active flag (defaulting true, since most
// imported/older data predates the flag and should count as usable).
export function normalizeExercises(arr) {
  return Array.isArray(arr)
    ? arr.map((e) => ({
        id: e.id || uid(),
        name: e.name || "Untitled exercise",
        folderId: e.folderId || null,
        tags: normalizeTags(e.tags),
        text: e.text || "",
        prescription: e.prescription || "",
        ...(MEASURES[e.measure] ? { measure: e.measure } : {}),
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
