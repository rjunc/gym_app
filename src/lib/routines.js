import { folderPath } from "./folders.js";
import { addTagsFromDraft } from "./tags.js";
import { linkUsageCounts, entriesByLink } from "./links.js";
import { planDraftBlock } from "./sets.js";
import { withFreshIds } from "./groups.js";

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
// to the existing ones, and its text is appended after anything already
// written (or becomes the text if there's none). The routine's id is
// recorded in routineIds (deduped), so an entry remembers which routines it
// was built from.
// A session form (one with draft `blocks`, see lib/sets.js) gets the
// routine's whole plan appended at the end, as if done right after what's
// already there: every block in order (repeats and all, even exercises the
// session already has), its supersets/circuits, and its notes, all with
// fresh ids. Planned sets arrive as empty rows with the numbers as hints
// (see planDraftBlock), so nothing counts as done until it's typed or
// filled. A journal form just links the routine's exercises it doesn't have
// yet (by id).
export function applyRoutine(form, routine) {
  const existingText = form.text.trim();
  const routineIds = form.routineIds || [];
  const fromRoutine = () => {
    if (Array.isArray(form.blocks)) {
      const planned = withFreshIds(routine.blocks, routine.groups);
      return { blocks: [...form.blocks, ...planned.blocks.map(planDraftBlock)], groups: [...(form.groups || []), ...planned.groups] };
    }
    const existing = new Set(form.exerciseIds || []);
    const newIds = (routine.exerciseIds || []).filter((id, i, all) => !existing.has(id) && all.indexOf(id) === i);
    return { exerciseIds: [...(form.exerciseIds || []), ...newIds] };
  };
  return {
    ...form,
    title: form.title.trim() ? form.title : routine.name || "",
    tags: (routine.tags || []).reduce((tags, t) => addTagsFromDraft(tags, t), form.tags),
    ...fromRoutine(),
    routineIds: routineIds.includes(routine.id) ? routineIds : [...routineIds, routine.id],
    text: existingText ? `${form.text.trimEnd()}\n\n${routine.text || ""}` : routine.text || "",
  };
}

// A new routine's starting fields from a logged session ("Save as routine"):
// its name from the session's title, its tags, and its blocks and groups —
// sets, notes, supersets and all, with fresh ids — as the plan. The
// session's text (how it went) isn't copied.
export function routineFromSession(session) {
  const { blocks, groups } = withFreshIds(session.blocks, session.groups);
  return { name: session.title || "", tags: [...(session.tags || [])], text: "", blocks, groups };
}
