# Session Log

A workout session/routine journal built with React + Vite, deployed on Vercel.
Data syncs across devices via Firebase Firestore, gated behind email/password
login so it's only ever your data.

**Status:** live. Firebase project created, Firestore rules published, env
vars set both locally (`.env.local`) and on Vercel. The setup steps below are
for reference (e.g. if you ever need to recreate the project or onboard it
somewhere else) — you don't need to redo them.

**Stage: pre-production (as of 2026-09-28).** The only users are the owner
and a few testers, and there is no real data to preserve. Design changes
don't need migrations, fallbacks or compatibility with older record shapes:
change the shape, update the test data, and re-add it. Changes are
committed and pushed straight to `main` (which deploys to production),
unless the owner asks for a branch or PR.

## Develop locally

```bash
npm install
npm run dev
```

Uses the same Firebase project as production (see `.env.local`), so you're
testing against your real data. Log in with the account you already created.

## Build

```bash
npm run build
npm run preview
```

## Deploy

Push to `main` — Vercel is connected to this GitHub repo and redeploys
automatically. Environment variables only apply to builds made *after*
they're saved in Vercel's dashboard, so if you ever change a Firebase config
value, trigger a fresh deploy (don't reuse the build cache) after updating it
in **Settings → Environment Variables**.

## UI

The look lives in two places:

- **`src/ui/theme.css`** holds the design tokens (colours, including one
  accent per part of the app: gold for sessions, green for routines and
  exercises, indigo for journals, blue for BJJ), the layout (full-screen
  shell, a sidebar that's a drawer on phones and always open from 960px,
  sheets that slide up on phones and open as centred dialogs from 720px),
  and interaction states (hover, keyboard focus, sheet animations, reduced
  motion).
- **`src/ui/styles.js`** holds the shared inline styles for the building
  blocks (cards, buttons, inputs, labels, pills, note text), with the type
  scale and spacing steps noted at the top.

Pages are built from `PageHeader` / `PageBody` (`src/ui/Page.jsx`), sheets
from `BottomSheet` + `SheetHeader`, and empty lists from `EmptyState`.

## Data model

Every record is its own Firestore document, grouped by kind:
`users/{uid}/sessions/{id}`, `.../journals/{id}`, `.../rolls/{id}`,
`.../routines/{id}`, `.../folders/{id}`, `.../techniques/{id}`,
`.../jitsFolders/{id}`, `.../exercises/{id}`, `.../exerciseFolders/{id}` and
`.../goals/{id}` (routines, techniques and exercises each have their own folder tree). The document id is the
record's id and the document is the whole record, so what's stored is
exactly what the app works with (see `src/lib/firestoreLog.js`).

- **Only what changed is written.** Each collection is synced by
  `src/lib/useSyncedCollection.js`: after any change, the records that are
  new or edited are written and the ones removed are deleted, nothing else.
- **Two devices can't wipe each other's work.** Editing different records
  on two devices (including one that was offline and syncs later) never
  conflicts. Editing the *same* record on both keeps whichever save
  reached the server last.
- **No size ceiling in practice.** Firestore's 1 MiB limit now applies to a
  single record, not the whole log.
- **Nothing is saved until a real load has happened.** If the first load
  fails, the app shows a Reload screen instead of an empty log that could
  be typed over.

**What was done, in order (blocks).** A session stores what was done as an
ordered list, `blocks: [{ id, exerciseId, sets: [...], note? }]`, one block
per exercise done at one point in the session. The same exercise can appear
in several blocks (squats first, back-off squats at the end), and the order
is the order it was done (reorderable while logging). A block with no sets is
just "done, no numbers"; `note` is a short line for what the numbers can't
say ("last set AMRAP"), shown next to the sets everywhere, on the next
session's "Last" line, and searchable. Consecutive blocks can form a
superset or circuit: they share a `groupId`, and the session lists
`groups: [{ id, kind: "superset" | "circuit" }]` (set 1 of each is round 1,
and so on; see `src/lib/groups.js`). A set with `drop: true` carries straight
on from the one before (dropsets, rest-pause). The session's `exerciseIds` is kept
as the distinct exercises of its blocks, which is what links, usage counts
and search go by (journals just have `exerciseIds`).

**Routines are plans in the same shape.** A routine stores `blocks` and
`groups` exactly like a session, plus `exerciseIds` derived from its blocks
the same way. Its sets are the *planned* numbers (a block with no sets means
"just do it"); rep ranges and RPE go in the block's `note`. Adding a routine
to a session appends its whole plan to the end, as if done right after what's
already there: every block (no dedupe — two routines with Plank give two
Plank blocks), its supersets/circuits and its notes, with fresh ids. The
planned sets arrive as empty rows with the plan's numbers greyed in the
boxes and a "Plan: …" line with **As planned** to fill them; only what's
typed or filled is saved, and the plan itself is never stored on the session
(see `applyRoutine` in `src/lib/routines.js`). A session is a copy: editing
the routine later never changes it. **Save as routine** on a session's sheet
does the reverse (`routineFromSession`).

**Logged sets.** Which fields a set has depends on how it was logged
(weight × reps, reps, time as `seconds`, `distance` with optional time,
weight × time, weight × distance, reps × time, or time @ `level` — a
machine's own unitless setting, like a stairmaster's resistance). That's
picked per block, not on the exercise: it starts from however the exercise
was logged last time (the matching round of it, if it was done more than
once), and an exercise never logged before asks. Older exercises may still
carry a `measure`, used only as the starting point before their first logged
session. Weights are in lb. Distance is in mi, km, m or yd, picked per block
while logging (starting from the unit it was last logged in), and the unit
is saved on every set. Time is saved in seconds, typed in min or sec the
same way (cardio starts in min, holds in sec); `timeUnit` on the set records
which. See `src/lib/sets.js`.

**Plan goals.** The Plan page holds goals for how often to train
something: `{ id, name, active, scope: "exercise" | "session", rules: [{ kind:
"any" | "none", tags, exerciseIds }], target, period: "week" | "month" }`
(`name` optional; blank spells out the rules, e.g. "(push or pull) +
plyometrics, not legs"). Every rule must hold: an "any" rule needs one of its
chips (tags or Library exercises), a "none" rule none of them. The scope says
where: **Same exercise** means one exercise meets every rule by its own Library
tags (the session's tags don't count), so "push + plyometrics" needs a clap
push-up, not bench press plus box jumps; **Same session** lets each rule be met
by anything in the session (its tags or any of its exercises), so bench press
plus box jumps counts. Only lifting sessions count (not mat sessions). An
inactive goal (`active: false`) keeps its history but isn't tracked: it's
listed last on the Plan page, greyed out, and Home never warns about it. The goal
form previews the latest sessions a goal matches as you edit it.
Progress is the number of sessions (two on one day
count twice) in a rolling window ending today: the last 7 days for a week,
the last 30 for a month, so last Friday's session still counts on Thursday.
Status: **Off track** (fewer sessions in the window than the target), **At
risk** (met, but the next session is due tomorrow for a weekly goal, within
4 days for a monthly one, before the session keeping it met slides out of the
window), otherwise **On track**. Home shows a card listing the goals that are
off track or at risk. See `src/lib/goals.js`.

CSV/JSON export and import live in the sidebar. JSON keeps blocks exactly.
CSV lists them in order in a `sets` column for reading only, like exercise
names. Plan goals only travel in the JSON export.

## Managing accounts

Firebase Console → **Authentication → Users** lists every account (email,
created date, last login, UID). Select rows and use the trash icon to delete
one or several at once.

Deleting a user there only removes their *login* — it does not delete their
data. Each account's log lives under `users/{uid}/` (one subcollection per
kind of record); clean it up manually under
**Firestore Database → Data** if you want to fully remove a test account's
footprint.

## Open considerations (not urgent — revisit whenever)

- **⚠️ IMPORTANT, do soon: delta sync, so opening the app doesn't re-read
  everything (2026-09-26).** Unlike the rest of this list, this one
  shouldn't wait.
  - **The problem:** every open after ~30 minutes away re-reads every
    record in every collection (one read per record, even though the local
    cache already has them). The free plan's 50,000 reads a day are **shared
    by the whole Firebase project**, not per account, so every pilot user
    draws from the same pool. With the test data button (~350 records per
    account), 10 pilot users get ~14 opens each per day between them; 25 get
    ~5. When the pool runs out, *everyone* sees "Couldn't load your log"
    until the daily reset (nothing is lost, but the app is unusable).
  - **Stopgap until it's done:** switch the project to the pay-as-you-go
    (Blaze) plan with a budget alert. The 50,000 a day stay free and the
    rest costs ~6¢ per 100,000 reads, but every open still reads
    everything, so cost and load time keep growing with the log.
  - **The fix:** on open, show the local cache and ask Firestore only for
    records changed since the last sync. An open then costs a handful of
    reads however large the log gets. Lives in `src/lib/useSyncedCollection.js`
    and `src/lib/firestoreLog.js`; the pages don't need to change.
  - **What it has to get right:**
    - *Deletes:* a "changed since" query can't see a deleted document, so a
      delete must become a tombstone (`deleted: true` plus a fresh sync
      time), hidden by the app and purged after a while (e.g. 90 days).
    - *Clocks:* "changed since" must use the server's time, not the
      device's. Write a `syncedAt: serverTimestamp()` on every save and
      query on that; `updatedAt` is the phone's clock, and a phone set
      slightly wrong would make other devices miss its edits.
    - *Records that predate it:* records without `syncedAt` need a one-time
      backfill (or one last full load that stamps them), or they'd never be
      picked up by the query.
    - *A wiped cache:* iOS can clear a website's stored data after a while
      (less so once it's added to the home screen). If the cache comes back
      empty or older than the last sync time, do one full load instead of
      trusting it.
    - *Other devices:* the live listener only needs to watch records
      changed since the last sync, so edits from another device still
      arrive as they do now.
  - **Size:** a few hours plus careful testing, since every save and load
    goes through it. Worth a test on two devices (edit, delete, offline
    edit) before shipping.

- **Temporary "Add test data" button in the sidebar (added 2026-09-26).**
  For pilot testing: it fills the signed-in account with ~300 made-up,
  fully linked records (9 months of sessions with sets and notes, routines
  in folders with planned sets, a Library covering every way of logging sets, journals, rolls,
  techniques that chain into a Flow). Every generated record's id starts
  with `demo-`, and the same button then reads "Remove test data" and
  deletes exactly those, leaving anything typed in by hand. It writes to
  real Firestore, so each add costs ~300 writes and makes every later app
  open read ~300 more records (see the reads note below). To take it out:
  delete `src/lib/demoData.js` and the code marked `TEMPORARY` in
  `src/App.jsx` and `src/ui/Sidebar.jsx`.
  - **How the button decides (2026-09-28).** `toggleDemoData` in
    `src/App.jsx`. It reads "Remove test data" when any record in any
    collection (sessions, routines, folders, journals, rolls, techniques,
    jitsFolders, exercises, exerciseFolders, goals) has an id starting with `demo-`, and "Add test
    data" when none do. It's recomputed on every render, so it flips by
    itself. Add generates ~9 months ending today with fresh `demo-` ids and
    merges them in (nothing replaced); Remove deletes every `demo-` record
    and nothing else. Both write to Firestore, so it's account-wide, on
    every device.
  - **A real record can't get a `demo-` id by chance.** `uid()`
    (`src/lib/id.js`) makes up to 8 characters of `0-9a-z`, never a hyphen;
    only the generator adds the prefix.
  - **Import/export treat test records like any other.** Exports include
    them with their ids; import keeps ids and merges by id (same id
    replaces, new id adds). So an export taken with test data present brings
    it back on import, still removable. JSON round-trips it exactly. CSV
    import recreates folders by path with normal ids, so after a CSV
    import "Remove test data" leaves those folders behind, empty.
  - **Edge cases.** A test record edited to hold real numbers still has its
    `demo-` id and is deleted by Remove. A real record built from test data
    (a session logged from a test routine, a routine saved from a test
    session) is kept, but its links then point at deleted records. Test data
    added before a shape change stays in the old shape: Remove, then Add.

- **Sign-up is currently open to anyone.** Any visitor who finds the URL can
  create their own account via the sign-up form. This isn't a data leak —
  Firestore rules mean each account only ever sees its own (empty) log — but
  it does mean strangers could clutter the Users list. Options if this
  becomes annoying: remove the public sign-up button and create accounts
  manually from the Firebase Console, or restrict sign-up to a specific
  allowlisted email.
- **Login is email/password, not "Sign in with Google."** Chosen for setup
  simplicity (no OAuth consent screen needed). If typing a separate password
  is annoying, Google Sign-In can be added alongside or instead of it —
  needs enabling the Google provider in Firebase Console plus a small code
  change to add the button.
- **Firestore rules should be spot-checked occasionally.** They currently
  restrict all reads/writes under `users/{uid}/` to `request.auth.uid ==
  uid` (see `firestore.rules`). If you ever edit them in the Firebase
  Console, paste carefully — a malformed rules file can silently fail to
  publish, leaving the previous (possibly deny-all) rules in effect.
- **Bundle size warning during build** (`some chunks are larger than 500 kB`)
  comes from the Firebase SDK. Harmless for a personal app at this scale;
  only worth addressing (via code-splitting) if load time ever becomes
  noticeable.
- **The ceiling to watch is daily reads, not storage (2026-09-25).** With one
  document per record, Firestore's 1 MiB limit applies to a single entry
  (a long session is ~2–5 KB, one logged set ~50 bytes), so it's
  effectively gone. What grows instead is reads: opening the app after more
  than ~30 minutes away re-reads every record in every collection (the local
  cache makes it fast, but Firestore still counts it), and the free plan
  allows 50,000 reads a day **for the whole project, shared by every
  account** (see the delta sync item above, which is the real fix). Rough
  math for one account at ~500 records a year plus a few hundred
  Library/routine items:

  | Log age  | Records | Opens/day before the free limit (one user) |
  |----------|---------|---------------------------------|
  | 1 year   | ~800    | ~60                             |
  | 3 years  | ~1,800  | ~27                             |
  | 10 years | ~5,500  | ~9                              |

  Going over on the free plan blocks reads until the daily reset. The app
  then shows its "Couldn't load your log" screen, with nothing lost. On the
  paid pay-as-you-go plan it costs about 6¢ per 100,000 reads. Fixes, when it
  ever matters: switch to the paid plan (simplest), or load only recent
  entries (e.g. the last 12 months) at startup and fetch older ones when
  scrolling back or searching (a moderate change to `useSyncedCollection`
  and the pages). The other limits aren't close: 1 GiB storage (the log
  stays in the tens of MB), 20,000 writes a day (only a huge import could
  hit it), and holding everything in memory for client-side filtering is
  fine into the thousands of records.
- **Back up by exporting JSON, regularly.** Nothing is backed up
  automatically, and deleting a record deletes its Firestore document for
  good. JSON is the only complete export: it keeps sets, routine plans,
  exercise links and routine links exactly. CSV has a fixed set of columns and loses those links
  and the set numbers on re-import.
- **CSV vs JSON: why the CSV is lossy, and what each is for (discussed
  2026-09-28).** JSON is the backup format; CSV is a readable report.
  - **Why CSV can't hold the data.** CSV is one flat table of text cells.
    A session (and now a routine) is nested: an ordered list of `blocks`,
    each with its own list of `sets`, each set with only the fields that
    apply (`weight`/`reps`, `seconds`, `distance`…, plus `drop`). Blocks can
    also belong to a superset/circuit: `groups` is a separate list beside
    the blocks (`[{ id, kind }]`), and a block joins one by carrying its
    `groupId`. Groups aren't nested around blocks on purpose, so everything
    that doesn't care about groups (Last lookups, history, search, usage,
    `exerciseIds`, CSV text) walks one flat list, and linking/ungrouping only
    sets or clears `groupId`. `tidyGroups` keeps it valid (a group's blocks
    are consecutive, at least two, unused groups dropped, groups ordered like
    their blocks); `layoutBlocks` turns it into 1, 2a, 2b, 3 for display.
    Records also point at each other by id (`exerciseIds`, `routineIds`,
    `folderId`) and have typed values (numbers, flags, units).
  - **What the CSV does instead, and loses on re-import.** Sets and
    routine plans are written as a sentence ("Back squat: 2×5 @ 225 lb;
    Superset (Dips: … + Tricep pushdown: …)") and not parsed back. Exercise
    and routine links are written as names and not matched back (renames
    and duplicate names make that unreliable). Folders are written as paths
    and recreated by name with new ids. Everything is text, so types are
    guessed back per column. It's one file with a `type` column for all six
    record types, so most cells are blank and each new field is a new
    column for every row. What does round-trip: ids, dates, titles, tags,
    text, timestamps, technique positions/flags, exercise prescription,
    measure and active.
  - **Not inherently worse, just the wrong fit here.** Making CSV lossless
    would mean JSON inside cells or several linked tables (sessions, blocks,
    sets), i.e. rebuilding JSON in a harder-to-read form.
  - **CSV strengths:** opens in any spreadsheet (sort, filter, total
    volume, chart without code); readable (names, "3×5 @ 225 lb"); easy to
    type or edit rows by hand and import (journals, techniques, an exercise
    list); accepted by most tools; smaller.
  - **JSON weaknesses:** hard to read or hand-edit (ids instead of names,
    one missing comma breaks the file); needs code or a converter to
    analyse; bulky (repeated keys, pretty-printed); no format version, only
    `exportedAt` (see the schema-version note below); import merges and
    never deletes (an old backup brings back deleted records) and trusts
    the file's ids (a record with the same id silently replaces yours).
    The last two apply to CSV import too.
  - **Suggestions, not done:** label the buttons "Export backup (JSON)" /
    "Export for spreadsheets (CSV)"; consider making CSV export-only, since
    its import is where the silent losses happen; add a `version` field to
    the JSON export.
- **Editing the *same* record on two devices: the last save wins
  (2026-09-25).** Each record is its own document, so edits to different
  records never collide. Editing one record on two devices keeps whichever
  save reached the server last. Editing a record on one device while deleting
  it on another brings it back. Rare for a single user, so left alone.
- **JSON import drops fields it doesn't know about (shelved 2026-09-25).**
  The import normalizers in `src/lib/importNormalize.js` rebuild each record
  from a fixed list of fields. Any field added to the app later that isn't
  also added there is silently lost when a JSON backup is restored.
  - **Fix:** copy every field from the file first, then overwrite the known
    fields with their checked versions, so tags, sets and ids stay validated
    and anything unrecognised passes through. About 20 lines plus tests.
  - **Guard it needs:** drop keys starting with `__`. Firestore reserves
    names like `__name__`, and one such key would make that import's save
    fail.
  - **Downsides:** a hand-edited or foreign JSON file could bring junk keys
    (e.g. a typo like `exerciseID`) into records, where they'd sit unnoticed
    because the app ignores fields it doesn't know. A field the app later
    drops on purpose could also come back when an old backup is restored.
    Both are harmless clutter, not breakage.
  - CSV doesn't benefit either way, because its columns are fixed.
  - Nothing to change in Firestore rules or deploy steps.
- **A schema version on records (shelved 2026-09-25).** Not needed yet:
  when the first migration is written, it can treat "no version field" as
  version 1, since everything saved before the field existed is the first
  shape. Adding it now gains nothing that can't be had later.
  - **If added, put it on every record** (e.g. `schemaVersion`, set by
    `newRecord` in `src/lib/records.js`), not in one `meta/schema`
    document. A per-record version survives a half-finished migration (each
    record says what shape it's in) and catches an old browser tab writing
    old-shape records after an update. A single document can claim "v2"
    while some records are still v1.
  - **Downsides:** it does nothing until a migration reads it, and the
    number has to be raised every time the shape changes. Forgetting that
    once is worse than having no version, because it gives false
    confidence.
  - It would pair with the import change above: a migration could use the
    version to clean out fields that a restored backup brought back.
- **Deleting a Library exercise or routine leaves broken links in old
  entries.** Entries keep the deleted id in `exerciseIds`/`routineIds`.
  Links are hidden in the form, and logged sets show under "Deleted
  exercise", so no numbers are lost from view, but the name is. Marking an
  exercise inactive instead of deleting it keeps the history intact. An
  "archive instead of delete" option would make that the default.
- **Data-shape changes that can safely wait (2026-09-25).** None of these
  lose information if they're done later; a script can convert a JSON
  export into the new shape, so no re-entering is needed.
  - **One `entries` collection instead of separate sessions/rolls/
    journals**, with a `kind` field. They already share a shape, and Home
    moves entries between them when a type is changed. It would make adding
    new kinds of entry (e.g. competitions) simpler.
  - **Tag rename/merge tool.** Tags are lowercased strings matched exactly,
    so "leg" and "legs" drift apart the same way positions do (see the
    position rename/merge idea under Feature ideas).
  - **Structured fields on rolls:** partner, duration, rounds, subs given/
    received, and `techniqueIds` linking rolls to techniques the way
    sessions link exercises. Start recording these early if roll stats will
    ever be wanted, because details only in free text can't become numbers
    later.

- **Tags: exercise-first redesign (discussed 2026-09-28, NOT decided or
  built).** Supersedes the draft in `TAGS_PLAN.md` where they differ (see
  the end of this note).
  - **The problem.** Tags live independently on sessions, routines and
    Library exercises (plus journals, rolls, techniques). Now that sessions
    and routines are built from exercises, this is redundant and raises "do
    I tag this on the exercise or on the session/routine?" A session with
    squats only shows under `legs` if the session itself was tagged `legs`;
    routine tags are copied into a session once when the routine is added
    (`applyRoutine`), so later edits never reach it.
  - **The owner's idea.** Tags come from exercises: adding exercises gives
    the session/routine their tags, so the separate tag field can go. The
    dilemma is redundancy vs flexibility: maybe keep a way to tag a
    session directly "in case I ever need it".
  - **Proposed rule (one home per tag).** *Is it true every time I do this
    exercise?* → tag the exercise (legs, push, core, compound, plyo,
    cardio). *Is it about this particular day?* → tag the session (deload,
    hotel gym, sick, test day, PR day). Routine-ish labels ("Core Day") are
    the routine's name or folder, not a tag. "Explosive today" goes in the
    block note; a variation that matters (paused bench) becomes its own
    exercise with its own history.
  - **Proposed build.**
    1. Sessions and routines show tags **worked out from their exercises**,
       looked up live, never copied or stored. Home filters, search and
       cards all use them; on cards, exercise-derived tags look slightly
       different from day tags so the source is clear.
    2. **Routines lose their own tags** entirely (a routine is its plan,
       name and folder). Removes the routine form's Tags field and the tag
       copying in `applyRoutine` / `routineFromSession`.
    3. **Sessions keep a small optional "Day tags" field**, with a hint
       ("about this day: deload, travel, sick…") and suggestions only from
       existing day tags. This is the kept flexibility; if it's never used,
       removing it later is trivial.
    4. **No per-block tags** (for now): a third place to tag brings the
       dilemma back.
    5. Journals, rolls and techniques keep their own tags (no exercises).
    6. No migration: pre-production, no data to preserve.
  - **Retroactive by design.** Because exercise tags are looked up, adding
    `plyo` to Box jump immediately tags every past and future session and
    routine containing a box jump; removing or renaming a tag changes them
    all the same way. That's correct because exercise tags describe the
    movement, not the day. Day tags are stored on the session and stay as
    written.
  - **Tag filter size.** Home and the Sessions page use `TagFilter`
    (`src/ui/TagFilter.jsx`): all tags as chips up to 8, otherwise the 6 most
    used as chips plus a searchable list. So the chip row doesn't grow; the
    "most used" six would just become mostly exercise tags (strength, legs,
    push). The **Routines page is different**: `FolderLibraryTab` shows every
    tag as a chip (height-capped, scrolls), so it would list every exercise
    tag used in any routine. If that feels cluttered, switch it to
    `TagFilter`.
  - **Open questions for the owner.**
    1. Keep optional day tags on sessions, or drop session tags entirely?
    2. Should journals (which link exercises but aren't workouts) pick up
       exercise tags? Leaning no.
    3. Switch the Routines page to the top-6 `TagFilter`?
    4. How should derived vs day tags look on cards?
  - **Differences from `TAGS_PLAN.md`** (the earlier draft): it adds
    per-block tags ("how it was done this time") and a reviewed migration
    step; this proposal drops both. It agrees on live lookup of exercise
    tags, routines losing their own tags, and journals/rolls/techniques
    keeping theirs.

## Feature ideas (not urgent)

- **Things the logged sets make possible (2026-09-25).** Sessions now store
  per-set numbers in ordered blocks (see "What was done, in order" under Data
  model). None of these are
  built:
  - **PRs per exercise:** heaviest weight, best weight for a given number of
    reps, estimated 1-rep max, longest hold or distance.
  - **A progress chart** on each exercise's history sheet.
  - **Weekly volume** (sets × reps × weight) per exercise or per tag, e.g.
    total `legs` volume.
  - **Rep ranges and progression in routine plans.** Plans hold exact
    numbers today (ranges/RPE go in the block note). Structured ranges would
    allow "hit the top of the range → go up" suggestions.
- **Things the timestamps and routine links make possible (2026-09-25).**
  Every record has `createdAt`/`updatedAt`, and sessions/journals record
  `routineIds`. None of these are built:
  - **Sort same-day entries by the time they were logged** (today they're in
    newest-created-first order, which is close, but not shown).
  - **A "recently edited" view.**
- **Journals aren't on the Home calendar.** They were left out when Home's
  calendar was built, since a journal entry isn't training. The Sessions/
  Rolls/Journals tabs remain the only way to browse and search entries by
  text — Home was deliberately kept to date/tag filtering only, to avoid
  cluttering the page with a search box. Revisit whether journals belong on
  Home too, e.g. as a third opt-in type alongside Sessions/Rolls.
- **Search gaps, left alone on purpose (2026-09-25).** Every list page's
  search box now shares one matcher (`src/lib/search.js`: words matched
  across all of an item's fields, `"quoted phrases"` kept together, with an
  All words / Any word toggle).
  Deliberately not included: dates (the Home calendar covers that, and
  number searches like "225" would start matching them), a text search on
  Home or Flow (both stay tag/position filtering only), and the in-form
  pickers, which stay name-only apart from the Exercises picker also
  matching exercise tags. Revisit any of these if they turn out to be missed.
- **Edit an entry from an exercise's or routine's history (2026-09-25).**
  Tapping a Library exercise or a routine opens a sheet of every
  session/journal entry that links it (`src/ui/HistorySheet.jsx`), and
  tapping one of those opens that entry's full summary on top — read-only.
  Edit/Redo/Delete aren't offered there because those entries belong to the
  Sessions/Journals pages; adding them would mean handing the Library and
  Routines pages the sessions/journals setters and the entry form, or
  jumping to the entry on its own page, which needs cross-page navigation
  state the app doesn't have yet.
- **A random routine builder, drawing from the Library.** Idea: pick one
  random exercise per tag/category (a `mobility` one, a `strength` one, a
  `cardio` one, ...) to assemble a day's routine automatically. The Library
  page's tag-based (no folders) organization, optional `prescription`
  field, and `active` flag were designed with this in mind, but the builder
  itself hasn't been started.
- **Jits/Flow ideas, from a session on "build a library that helps in any
  position" (2026-09-21).** Flow could only navigate by position, with no
  way to narrow the technique list once you'd arrived at one — filtering by
  tag (e.g. "just show me escapes") now works there the same way it already
  did in the Techniques tab, scoped to whichever tags actually appear at
  the current position. (A dedicated structured `role` field — Escape/
  Submission/Sweep/... as a fixed enum — was tried first and reverted:
  it duplicated what tags already did, wasn't user-editable without a code
  change, and risked drifting out of sync with a technique's own tags.)
  Two related ideas from that session didn't get built:
  - **A "go-to" star per technique.** When several techniques are logged
    from the same position, nothing marks which one is your actual trusted
    answer vs. one you tried once. A starred technique could sort first.
  - **Position rename/merge tool.** Positions are freeform strings matched
    by exact normalized text (`src/lib/positions.js`), so naming drift
    ("mount bottom" vs "bottom mount") silently creates disconnected nodes
    with no way to fix it after the fact — folders have rename, positions
    don't. Only worth building once the position vocabulary is large enough
    for drift to actually bite.
- **Read-only viewer access for friends (2026-09-22).** Let friends view and
  search the whole log (jits + lifts) without editing, without giving out
  real edit access. Firestore rules currently only allow
  `request.auth.uid == uid`, so a viewer needs *some* Firebase Auth identity,
  just not full owner access. Sketch: give each friend (or one shared) a real
  Firebase Auth login, add a read-only allowance to `firestore.rules` for
  those UIDs (`allow read: if request.auth.uid == uid || request.auth.uid in
  [...friend UIDs]`, write stays owner-only), and add a "viewer mode" in the
  app that hides the composer/edit/delete controls when the logged-in UID
  isn't the owner's. Search/filtering need no new work — it's all client-side
  over data they can already read. Main cost: manually maintaining the friend
  UID allowlist in the rules file (revocable per-friend, unlike a shared
  password); the Firestore rule is the actual security boundary, not the
  UI hiding. Not built.
