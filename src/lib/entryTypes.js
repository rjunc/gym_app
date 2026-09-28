// Everything about each kind of dated entry, in one place, so Home and the
// Sessions/Journals/Rolls pages can't drift apart: what it's called, its
// colour, the entry form's wording, and which optional fields the form shows.
// Home reads sessions and rolls from here; each list page reads its own.
//
//   label / singular   "Sessions" (Home's filter chips) / "Session" (cards,
//                      summaries, the form's type switch)
//   accent             CSS colour variable for that kind
//   textLabel, textPlaceholder   the form's main text box
//   showRoutines       Routines picker (copies routines in, records routineIds)
//   showExercises      Library exercise links (exerciseIds)
//   showSets           per-set numbers for those exercises (needs showExercises)
//   showMat            a mat session's gi, drilled techniques and rounds
//                      (see lib/mat.js)
//   canRedo            a Redo action that starts a new entry from this one
//   page               the list page's own wording
export const ENTRY_TYPES = {
  sessions: {
    label: "Sessions",
    singular: "Session",
    accent: "--accent",
    // The sets record what was done, so the text is for everything they
    // can't: how it went, how it was done, what to change.
    textLabel: "Notes (optional)",
    textPlaceholder: "How it felt, supersets, rest, last set AMRAP, what to change next time...",
    showRoutines: true,
    showExercises: true,
    showSets: true,
    canRedo: true,
    page: {
      eyebrow: "Training journal",
      heading: "Session Log",
      searchPlaceholder: "Search text, tags, exercises, routines…",
      emptyLabel: 'No sessions logged yet. Tap "New entry" to write your first one.',
    },
  },
  journals: {
    label: "Journals",
    singular: "Journal entry",
    accent: "--accent3",
    textLabel: "What's on your mind?",
    textPlaceholder: "How training's feeling, energy levels, sleep, motivation, anything worth remembering...",
    showRoutines: true,
    showExercises: true,
    showSets: false,
    canRedo: false,
    page: {
      eyebrow: "Personal journal",
      heading: "Journal",
      searchPlaceholder: "Search text, tags, exercises, routines…",
      emptyLabel: 'No journal entries yet. Tap "New entry" to write your first one.',
    },
  },
  // Stored in the `rolls` log; shown as mat sessions (a class, open mat or
  // private), which can be a line of text or the full structure.
  rolls: {
    label: "Mat sessions",
    singular: "Mat session",
    accent: "--accent4",
    // Drills and rounds record what happened, so the text is for the rest.
    textLabel: "Notes (optional)",
    textPlaceholder: "What the class covered, how rolling felt, what to work on next time...",
    showRoutines: false,
    showExercises: false,
    showSets: false,
    showMat: true,
    canRedo: true,
    page: {
      eyebrow: "Training journal",
      heading: "Mat Sessions",
      searchPlaceholder: "Search text, tags, techniques, partners…",
      emptyLabel: 'No mat sessions logged yet. Tap "New entry" to log your first one.',
    },
  },
};
