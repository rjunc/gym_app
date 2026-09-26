# Plan: structured routines

Status: **planned, not started** (written 2026-09-26). Four decisions are
still open — see [Decisions](#decisions-to-confirm-before-building). Ask the
owner before building if they haven't been answered below.

## Goal

A routine should describe a workout the same way a session records one:
**exercises in the right order, repeats allowed, the right supersets and
circuits, and optionally numbers (weights, reps, times…) per set.** Adding a
routine to a session should be like adding that whole workout: its blocks
and groups are appended to the **end** of the session. Adding a second
routine appends after the first, exactly as if one was done right after the
other.

## Where things stand today

Read these first; the plan reuses almost all of it.

**Sessions already have structure** (see `src/lib/sets.js` header and
`src/lib/groups.js` header, and README → Data model):

```
session: {
  id, date, title, tags, text,
  blocks: [{ id, exerciseId, sets: [...], note?, groupId? }],  // in order done, repeats allowed
  groups: [{ id, kind: "superset" | "circuit" }],              // consecutive blocks sharing a groupId
  exerciseIds,   // distinct exercises of the blocks, derived (blockExerciseIds) — links/usage/search use this
  routineIds,    // routines it was built from
}
```

- A set holds only the fields that apply (`weight`/`weightUnit`, `reps`,
  `seconds`/`timeUnit`, `distance`/`distanceUnit`, `level`), plus
  `drop: true` for a dropset step. Formats are picked per block (`MEASURES`).
- `lib/groups.js` keeps blocks and groups consistent (`tidyGroups`), lays
  them out for display (`layoutBlocks`: 1, 2a, 2b, 3…), links/ungroups/moves.
- The session form's exercise list is `src/ui/BlocksField.jsx` (draft
  blocks: `{ key, exerciseId, rows, note, groupId?, measure? }`; convert
  with `toDraftBlocks` / `fromDraftBlocks`). `ExercisesField` in
  `src/ui/ComposerFields.jsx` appends blocks when `asBlocks` is set.
- Each block shows "Last (date): …" from the most recent other session
  (`lastBlocksFor` + `matchingBlock`, which lines up the Nth round of an
  exercise with last time's Nth round).

**Routines are flat:**

```
routine: { id, name, folderId, tags, text, exerciseIds }   // exerciseIds: each once, order added
```

- Edited with `src/tabs/FolderItemEditor.jsx` (shared with techniques) using
  `ROUTINE_CONFIG` from `src/tabs/RoutinesTab.jsx`; the exercise picker is
  the plain pill list (`ExercisesField` without `asBlocks`).
- `applyRoutine` (`src/lib/routines.js`) fills the title if blank, adds
  tags, appends the text, records `routineIds`, and on a session form
  appends a block for each routine exercise **not already in the session**
  (dedupe). No numbers are copied.
- Shown in `src/tabs/RoutineHistorySheet.jsx` (opened on the app-wide sheet
  stack, `src/ui/SheetStack.jsx`) and as cards via `FolderLibraryTab` →
  `LibraryItemCard`.
- Things that read `routine.exerciseIds` and must keep working: routine
  search (`folderItemSearchFields`), "In N routines" on an exercise
  (`entriesByExercise(routines)`), the exercise delete warning
  (`exerciseDeleteWarning`), links in `RoutineHistorySheet`.
- The only per-exercise target today is the Library exercise's
  `prescription` string (e.g. "3x8"), which is global to the exercise, not
  per routine.

## The plan

### 1. Data: a routine has blocks and groups

```
routine: {
  id, name, folderId, tags, text,
  blocks: [{ id, exerciseId, sets: [...], note?, groupId? }],  // the plan, in order
  groups: [{ id, kind }],
  exerciseIds,   // kept, derived from blocks with blockExerciseIds — exactly like sessions
}
```

- **Planned numbers are ordinary sets.** A planned `{ weight: 225,
  weightUnit: "lb", reps: 5 }` has the same shape as a logged one, so every
  format (time, distance, level, drops) works in plans with no new code. A
  block with no sets means "just do it".
- Rep ranges / RPE go in the block `note` for now ("8–12, RPE 8") — see
  decision 2.
- `text` stays for everything else (warm-up, rest, cues).
- Save path: `tidyGroups(fromDraftBlocks(...))`, then derive `exerciseIds`,
  the same as `EntrySheet`'s save for sessions.
- Import/export: `normalizeFolderItems` (`src/lib/importNormalize.js`)
  keeps routine `blocks`/`groups` via `normalizeBlocks` / `normalizeGroups`
  / `tidyGroups` (see `blocksAndGroups` there for sessions). CSV: the
  routine row's `sets` column shows the plan (reuse `setsText`).
- Fallback (decision 4): a routine without `blocks` reads as one block per
  `exerciseIds` entry, no sets.

### 2. Editing a routine uses the session's exercise list

- The routine form uses `BlocksField` + `ExercisesField` with `asBlocks`,
  so it can add (repeats allowed), reorder, link supersets/circuits, pick
  formats, enter planned sets, notes — identical to logging.
- `FolderItemEditor` is shared with techniques: add the blocks mode behind
  a config flag (e.g. `ROUTINE_CONFIG.showBlocks`), keeping techniques as
  they are. Its form state needs `blocks`/`groups` drafts like `EntrySheet`.
- Wording: label the list as the plan (e.g. "Plan") rather than logged sets.
- Keep the "Last" line in the routine editor (seeing what was actually
  lifted helps set targets). `BlocksField` needs `history` (sessions) and a
  `date` to look back from — use today.

### 3. Adding a routine to a session appends the whole plan

- Replace the session-form branch of `applyRoutine`: append **all** the
  routine's blocks, in order, with fresh keys (`uid()`), and its groups with
  fresh ids, remapping each block's `groupId`. **No dedupe** (decision 3) —
  two routines that both have Plank give two Plank blocks.
- Title / tags / text / `routineIds` behave as today. Journals (no blocks)
  keep the old behaviour (add `exerciseIds`, deduped).
- Carry the plan onto each draft block (e.g. `plan: [...sets]`, draft-only,
  never saved on the session) and show it in `BlocksField` next to Last:
  ```
  Back squat                                   Weight × reps ▾
  Plan: 5×5 @ 225 lb · Last (Sep 20): 5×5 @ 215 lb   As planned · Use last
  ```
  How the plan's numbers get into the rows depends on decision 1.
- The block's format (`measure`) should start from the plan's sets
  (`measureOfSets(plan)`) ahead of last time's.
- Routines added via Browse (`PagePicker` → `RoutinesTab` pick mode) go
  through the same `applyRoutine`, so they get this for free.
- `hasLoggedBlocks` must not count plan-only numbers as logged (relevant if
  plan numbers are shown as hints).

### 4. Showing a routine

- `RoutineHistorySheet`: show the plan laid out like `EntryDetailSheet`
  does for a session (numbered, groups bracketed, every set listed, drops
  marked ↳), with exercise names as `SheetLink`s; then its history as now.
  Consider extracting the session sheet's block/group rendering into a
  shared component rather than copying it.
- Routine cards: a compact plan summary like session cards (`SetsSummary`
  works on anything with `blocks`/`groups`).

### 5. Test data (`src/lib/demoData.js`)

- Generate routines with real plans: `ROUTINES` already lists exercises in
  order and their `groups` (supersets/circuits). Give each block planned
  sets (reuse `setsFor(ex, 0)`-style starting numbers), and store `blocks`,
  `groups`, derived `exerciseIds` on the routine.
- Build sessions from those plans (copying blocks/groups the way
  `applyRoutine` will), with numbers progressing over time, so logged sets
  can be compared with the plan.
- The "Add test data" sidebar button is temporary (README → Open
  considerations); users re-add test data to get the new shape.

### 6. Optional, later: "Save as routine"

Once sessions and routines share a shape, a "Save as routine" action on a
session sheet is cheap: copy blocks, groups and sets into a new routine
(name from the session title). Not part of the first pass unless asked.

## Decisions to confirm before building

1. **Planned numbers: hints or real values?**
   - *Hints (recommended):* plan numbers show greyed as placeholders in
     empty boxes; an **As planned** button fills a block in one tap. A
     session only records what was confirmed or typed.
   - *Real values:* blocks arrive filled with the plan. Faster, but saving
     without editing records the plan as if it was done exactly.
2. **Targets:** exact numbers only for now, with ranges/RPE in the block
   note (recommended), or structured rep ranges now (would later allow
   "hit the top of the range → go up")?
3. **No dedupe when adding routines:** confirm that two routines sharing an
   exercise should produce two blocks (matches "one after the other").
4. **Existing routines:** there's no real data, so no migration. Recommended
   safety net: a routine without `blocks` is read as its `exerciseIds`, one
   block each (a one-line fallback), in case pilot users made some.

Answers: _(fill in)_

## Order of work

1. Data shape + helpers (routine blocks/groups, derived `exerciseIds`,
   fallback), import/export, tests in `tests/lib/`.
2. Routine editor on `BlocksField`; routine sheet and card show the plan.
3. `applyRoutine` appends whole plans; plan line + As planned / Use last in
   `BlocksField`.
4. Test data.
5. (Optional) Save session as routine.

Roughly the size of the "sessions as ordered blocks" change (commit
`9f232fb`) — worth reading that commit and `f4cb90d` (groups and dropsets)
for how the session side was done.

## How to work in this repo

These are the owner's standing preferences — follow them:

- **Commit directly to `main`**; no feature branches or PRs unless asked.
  End commit messages with the `Co-Authored-By` line your harness gives you.
  Pushing to `main` deploys to production (Vercel) — push only when the
  owner says to.
- **Project notes live in `README.md`** (deferred ideas, considerations),
  not in separate memory files. Update README → Data model when the stored
  shape changes. (This plan file is the exception, by request; delete it or
  mark it done when the work is finished.)
- **Tests:** `npm test` (node's built-in runner, `tests/lib/*.test.js`) and
  `npm run build` must both pass. Add tests for new lib logic.
- **Check UI changes in a browser without real login** — the app only talks
  to the owner's production Firebase (there's no test project), so never log
  in or use real data:
  1. In `src/main.jsx`, temporarily render
     `<App uid="test" userEmail="t@t" onLogout={() => {}} />` instead of the
     `<AuthGate>` wrapper.
  2. In `src/lib/firestoreLog.js`, temporarily rename the real
     `subscribeToCollection` / `writeChanges` and export stubs that serve
     fake data from memory — `generateDemoData(new Date(), 3)` from
     `./demoData.js` is an easy source — and record writes on
     `window.__writes` so saves can be checked.
  3. Run `npx vite --port 5199 --strictPort` and drive it with Playwright
     (`npm i -D playwright` / `npx playwright install chromium` if it isn't
     available — it isn't in `package.json`).
  4. **Revert both files** (`git checkout src/main.jsx
     src/lib/firestoreLog.js`) before committing; nothing test-only ships.
- Code style: match the surrounding code — explanatory comments above
  functions and components, inline styles with the CSS variables in
  `src/ui/styles.js` / `Shell.jsx`, small pure helpers in `src/lib/` with
  tests.
