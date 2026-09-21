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
// to the existing ones, and its text is appended after anything already written
// (or becomes the text if there's none).
export function applyRoutine(form, routine) {
  const existingText = form.text.trim();
  return {
    ...form,
    title: form.title.trim() ? form.title : routine.name || "",
    tags: (routine.tags || []).reduce((tags, t) => addTagsFromDraft(tags, t), form.tags),
    text: existingText ? `${form.text.trimEnd()}\n\n${routine.text || ""}` : routine.text || "",
  };
}
