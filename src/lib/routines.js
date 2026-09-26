import { folderPath } from "./folders.js";
import { addTagsFromDraft } from "./tags.js";
import { linkUsageCounts, entriesByLink, compareByUsage } from "./links.js";
import { matchesSearch, folderItemSearchFields } from "./search.js";
import { matchesTags } from "./activity.js";

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

// What the routine picker shows. Without a search or tag filter it's the
// folder you're in, like the Routines page: its subfolders (A–Z) and its
// routines. With either, it's every matching routine across all folders, so
// you don't have to know where one lives (search matches the same fields as
// the Routines page: name, text, tags, folders, exercise names). Routines are
// ordered by `usage` (routineUsageCounts) — most used first — then A–Z.
export function routinePickerView({
  routines,
  folders,
  folderId = null,
  query = "",
  tags = [],
  tagMode = "all",
  usage = new Map(),
  exerciseNameById = new Map(),
}) {
  const byUse = compareByUsage(usage);
  const filtering = query.trim() !== "" || tags.length > 0;
  if (filtering) {
    const matches = (r) => matchesSearch(folderItemSearchFields(r, folders, exerciseNameById), query) && matchesTags(r.tags, tags, tagMode);
    return { filtering, subfolders: [], items: routines.filter(matches).sort(byUse) };
  }
  return {
    filtering,
    subfolders: folders.filter((f) => (f.parentId || null) === folderId).sort((a, b) => a.name.localeCompare(b.name)),
    items: routines.filter((r) => (r.folderId || null) === folderId).sort(byUse),
  };
}
