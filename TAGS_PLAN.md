# Plan: one tag system across exercises, blocks and sessions

Status: **draft for discussion** (2026-09-27). Nothing built yet. Settle the
open questions at the bottom before starting.

## The problem

Tags exist on almost every record (sessions, journals, rolls, routines,
techniques, Library exercises), each as its own independent list of
lowercase strings. Now that sessions and routines are built from Library
exercises (blocks), this overlaps and confuses:

- Squats are tagged `legs` in the Library, but a session with squats only
  shows under `legs` on Home if the session was *also* tagged `legs`. Home,
  search and cards read only `entry.tags` (`matchesTags` in
  `src/lib/activity.js`, `src/lib/search.js`, `src/ui/EntryCard.jsx`).
- Routines have their own tags, which `applyRoutine` copies into the session
  when it's added (`src/lib/routines.js`). It's a one-time copy, so editing a
  routine's tags never reaches older sessions, whether you'd want it to or not.
- There's nowhere to say *how* one exercise was done this time
  ("explosive bench today") other than the free-text block `note`, or a
  session tag that doesn't say which exercise it meant.

## Core idea: three kinds of tag, each in one place

| Kind | Examples | Lives on | Reaches past records? |
|---|---|---|---|
| **What the exercise is** | push, legs, compound, plyo, core | Library exercise (`exercise.tags`, as today) | **Yes**, by lookup: never copied |
| **How it was done this time** | explosive, slow, paused, tempo, belt | The block (`block.tags`, new) | No, it's what happened, like the numbers |
| **What the day was about** | deload, hotel gym, sick, test day | The session (`session.tags`, as today) | No |

Rule that removes the "retroactive?" dilemma: **exercise tags are looked up,
never copied; block and session tags are written once and frozen.**

- Adding `plyo` to Box Jump instantly tags every session that contains a Box
  Jump block, and nothing else.
- Adding an explosive movement to the Core Day routine doesn't tag old Core
  Day sessions, because they don't contain that movement.
- Routines stop having their own tags: a routine's tags are worked out from
  its blocks.

### A record's *effective* tags

```
effectiveTags(session) = session.tags
                       ∪ block.tags for every block
                       ∪ exercise.tags for every block's exercise (looked up live)
effectiveTags(routine) = block.tags ∪ exercise.tags of its blocks
effectiveTags(journal | roll) = entry.tags            (no blocks → no lookup)
```

One pure helper in `src/lib/tags.js`, e.g.
`effectiveTags(entry, exercisesById) → [{ tag, source: "entry" | "block" | "exercise" }]`,
which Home, search, cards, history sheets and CSV all use. Build
`exercisesById` once per render (`useMemo`) and it stays cheap.

## Plan

### 1. Data

```
block: { id, exerciseId, sets, note?, groupId?, tags? }   // new: tags for how it was done this time
session.tags   // unchanged shape; now means "what the day was about"
routine.tags   // removed after migration (step 6)
exercise.tags  // unchanged shape; now also reaches sessions/routines by lookup
```

Blocks can only **add** tags. They can't hide one of the exercise's own tags:
if a tag sometimes doesn't apply, it isn't part of what the exercise is, so it
belongs on the block. (See open question 1.)

### 2. Logging a block with tags

- `src/ui/BlocksField.jsx`: a small tag control per block (next to the note),
  suggestions ordered by `tagUsage` over **block tags** only, so the list
  stays short (explosive, paused, tempo...). Draft blocks gain `tags`;
  `toDraftBlocks` / `fromDraftBlocks` carry them.
- The exercise's own tags show greyed on the block, not editable there.
- A block's tags show everywhere its note shows (cards, `EntryDetailSheet`,
  history sheets, the "Last" line).

### 3. Routines

- Routine blocks can carry block tags too ("this is the explosive bench
  slot"). `applyRoutine` copies blocks (so their tags come along) but **stops
  copying routine-level tags**. `routineFromSession` stops copying session
  tags into the routine, but keeps block tags.
- The routine editor (`FolderItemEditor` + `ROUTINE_CONFIG`) drops the Tags
  field and shows the worked-out tags read-only.
- Routine search (`folderItemSearchFields`) matches on the worked-out tags.

### 4. Home, search, cards

- `HomeTab.jsx`: the filter vocabulary and `matchesTags` use `effectiveTags`.
  "All" mode then means something useful: `push` + `legs` finds sessions that
  trained both.
- The chip list could explode (every exercise's tags). Group the filter chips
  by source (Session / How / Exercise) or collapse Exercise tags behind "More".
- `EntryCard`: session tags as today; exercise-derived tags greyed/outlined, so
  it's clear where a tag came from; tapping either filters.
- `search.js`: session and routine search fields include the effective tags
  and block tags.

### 5. Editing an exercise's tags

- `ExerciseEditor.jsx`: under Tags, a non-blocking line such as "Tags apply to
  the 34 sessions and 3 routines that use this exercise"
  (`entriesByExercise` already has these counts). No confirm pop-up: a lookup
  is the expected behaviour, and a pop-up on every save gets tiresome.
- Exercise delete warning (`exerciseDeleteWarning`): mention that its tags
  will disappear from those sessions too.

### 6. Migration (one-off, reviewable)

A pure `planTagMigration(data) → { sessionTagDrops, routineTagMoves, ... }`
plus a screen (e.g. in Settings) that shows the proposal before applying:

- **Session tags already covered** by exercise tags (session `legs` + a squat
  block tagged `legs` in the Library): offer to drop them. Anything not
  covered stays as a session tag.
- **Routine tags**: for each, suggest moving it to its exercises (if true of
  all of them), leaving it to future session tags, or dropping it. Folders and
  the routine name often already say "Core Day".
- Sessions that got routine tags copied in the past keep them. Past records
  aren't rewritten beyond the drops approved above.
- Journals and rolls: untouched.

### 7. Tag management (optional, can ship separately)

No central tag list with IDs. Tags stay plain strings, and the vocabulary is
worked out from records the way `tagUsage` already does. That avoids linking
by ID and a second collection to keep in sync. Add a **Manage tags** screen
instead:

- All tags, with counts per source (exercises / blocks / sessions / rolls /
  techniques).
- **Rename / merge** (`paused` + `pause` → `paused`), which rewrites every
  record using it (only what changed is synced, like every other edit).
- **Delete** a tag everywhere.

### 8. Other places that read or write tags

- `combinedCsv.js` / `importNormalize.js`: block tags need a home in export
  and import (blocks aren't in the CSV today; decide with the blocks CSV
  work). Export stored tags only, never the worked-out ones, so a re-import
  doesn't freeze exercise tags into sessions.
- `redoFields` (`activity.js`): copies session tags and blocks (block tags
  come with them), as today.
- `demoData.js`: move a few tags onto blocks so the demo shows the feature.
- README → Data model: document the three kinds and the lookup rule.

### 9. Tests

- `tests/lib/tags.test.js`: `effectiveTags` (union, sources, deduped, missing
  exercise ignored), block-tag suggestions.
- `tests/lib/routines.test.js`: `applyRoutine` carries block tags and no
  routine tags; `routineFromSession` drops session tags.
- `tests/lib/activity.test.js`: Home filter matches exercise-derived tags,
  and "all" mode across blocks.
- Migration planner: covered/uncovered session tags, routine tag moves.

## Variants: explosive vs slow vs paused bench

Rule of thumb, written into the README when this ships:

- **Separate exercise** when the numbers aren't comparable, or you want its
  own history and "Last" line: paused bench, close-grip, pin press, tempo
  work with much lower loads.
- **Block tag** when it's the same lift done a bit differently and the
  numbers are still comparable: explosive vs controlled, belt, cue focus.

## Open questions

1. **Block tags that hide an exercise's own tag?** This plan says no, blocks
   only add. Is there a real case where you'd need to remove one of an
   exercise's own tags for a single session?
2. **"Last" line and block tags.** When today's bench is tagged `explosive`,
   should "Last" prefer the last *explosive* bench, or keep showing the most
   recent bench no matter how it was done (with its tags shown)?
3. **Journals** link exercises without blocks. Should they pick up exercise
   tags? This plan says no, because a journal isn't a workout.
4. **Home filter noise.** Group chips by source, or hide exercise tags behind
   a toggle? Try it with real data before deciding.
5. **Routine-level context tags.** Is there any routine tag that is truly
   about the whole routine and not its exercises ("hotel", "no equipment")?
   If so, the routine name and folder may be enough, or the tag becomes a
   session tag when you log it.
6. **Techniques / rolls** (BJJ side) keep their own tags, since they have no
   exercise blocks. Confirm nothing there should change.
