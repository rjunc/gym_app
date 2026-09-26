import { folderPath } from "./folders.js";
import { addTagsFromDraft } from "./tags.js";
import { linkUsageCounts, entriesByLink } from "./links.js";
import { newDraftBlock } from "./sets.js";

// How often each routine was used to build a session, keyed by routine id
// (see linkUsageCounts). Sessions only, like exerciseUsageCounts, so the
// Routines picker ranks by actual training.
export const routineUsageCounts = (sessions, todayISO, days = 30) => linkUsageCounts(sessions, "routineIds", todayISO, days);

// Backlinks from routines to the sessions/journal entries built from them,
// newest first (see entriesByLink).
export const entriesByRoutine = (entries) => entriesByLink(entries, "routineIds");

// Routines as picker options: "Folder / Subfolder / Name" (just "Name" at the
// top level), sorted so a routine sits next to its folder-mates.
export function routineOptions(routines, folders) {
  return routines
    .map((r) => ({ id: r.id, label: [...folderPath(folders, r.folderId).map((f) => f.name), r.name].join(" / ") }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

// Prefills a session form from a routine without clobbering what's already
// been typed: the title is only filled if blank, the routine's tags are added
// to the existing ones, its exercises are added to the existing ones (deduped
// by id), and its text is appended after anything already written (or becomes
// the text if there's none). The routine's id is recorded in routineIds (also
// deduped), so an entry remembers which routines it was built from.
// A session form (one with draft `blocks`, see lib/sets.js) gets a block
// appended for each of the routine's exercises it doesn't have a block for
// yet, in the routine's order, instead.
export function applyRoutine(form, routine) {
  const existingText = form.text.trim();
  const existingExerciseIds = new Set(Array.isArray(form.blocks) ? form.blocks.map((b) => b.exerciseId) : form.exerciseIds || []);
  const newIds = (routine.exerciseIds || []).filter((id, i, all) => !existingExerciseIds.has(id) && all.indexOf(id) === i);
  const routineIds = form.routineIds || [];
  return {
    ...form,
    title: form.title.trim() ? form.title : routine.name || "",
    tags: (routine.tags || []).reduce((tags, t) => addTagsFromDraft(tags, t), form.tags),
    ...(Array.isArray(form.blocks)
      ? { blocks: [...form.blocks, ...newIds.map(newDraftBlock)] }
      : { exerciseIds: [...(form.exerciseIds || []), ...newIds] }),
    routineIds: routineIds.includes(routine.id) ? routineIds : [...routineIds, routine.id],
    text: existingText ? `${form.text.trimEnd()}\n\n${routine.text || ""}` : routine.text || "",
  };
}
