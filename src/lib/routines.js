import { folderPath } from "./folders.js";
import { addTagsFromDraft } from "./tags.js";

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
export function applyRoutine(form, routine) {
  const existingText = form.text.trim();
  const existingExerciseIds = new Set(form.exerciseIds || []);
  const routineIds = form.routineIds || [];
  return {
    ...form,
    title: form.title.trim() ? form.title : routine.name || "",
    tags: (routine.tags || []).reduce((tags, t) => addTagsFromDraft(tags, t), form.tags),
    exerciseIds: [...(form.exerciseIds || []), ...(routine.exerciseIds || []).filter((id) => !existingExerciseIds.has(id))],
    routineIds: routineIds.includes(routine.id) ? routineIds : [...routineIds, routine.id],
    text: existingText ? `${form.text.trimEnd()}\n\n${routine.text || ""}` : routine.text || "",
  };
}
