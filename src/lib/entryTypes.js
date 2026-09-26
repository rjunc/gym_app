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
//   canRedo            a Redo action that starts a new entry from this one
//   page               the list page's own wording
export const ENTRY_TYPES = {
  sessions: {
    label: "Sessions",
    singular: "Session",
    accent: "--accent",
    textLabel: "What did you do?",
    textPlaceholder: "Warmed up with 10 min bike, then did 5x5 back squat working up to 225, superset with...",
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
  rolls: {
    label: "Rolls",
    singular: "Roll",
    accent: "--accent4",
    textLabel: "What did you work on?",
    textPlaceholder: "Gi class, drilled scissor sweep to knee-on-belly, rolled 5 rounds, caught a triangle from closed guard...",
    showRoutines: false,
    showExercises: false,
    showSets: false,
    canRedo: true,
    page: {
      eyebrow: "Training journal",
      heading: "Rolls & Classes",
      searchPlaceholder: "Search text, tags…",
      emptyLabel: 'No rolls logged yet. Tap "New entry" to write your first one.',
    },
  },
};
