# Session Log

A workout session/routine journal built with React + Vite, deployed on Vercel.
Data syncs across devices via Firebase Firestore, gated behind email/password
login so it's only ever your data.

**Status:** live. Firebase project created, Firestore rules published, env
vars set both locally (`.env.local`) and on Vercel. The setup steps below are
for reference (e.g. if you ever need to recreate the project or onboard it
somewhere else) — you don't need to redo them.

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

## Data model

Every record is its own Firestore document, grouped by kind:
`users/{uid}/sessions/{id}`, `.../journals/{id}`, `.../rolls/{id}`,
`.../routines/{id}`, `.../folders/{id}`, `.../techniques/{id}`,
`.../jitsFolders/{id}` and `.../exercises/{id}`. The document id is the
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

**Logged sets.** A session can carry per-set numbers for each linked Library
exercise, as `sets: { [exerciseId]: [{ reps, weight, weightUnit }, …] }`.
Which fields a set has depends on how it was logged (weight × reps, reps,
time as `seconds`, or `distance` with optional time). That's picked per
session, not on the exercise: it starts from however the exercise was logged
last time, and an exercise never logged before asks. Older exercises may
still carry a `measure`, used only as the starting point before their first
logged session. Weights are
in lb and distances in miles, and the unit is saved on every set. Sets
are optional, so an exercise with no entry is just "done, no numbers".
See `src/lib/sets.js`.

CSV/JSON export and import live in the sidebar. JSON keeps sets exactly.
CSV lists them in a `sets` column for reading only, like exercise names.

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
  allows 50,000 reads a day. Rough math at ~500 records a year plus a few
  hundred Library/routine items:

  | Log age  | Records | Opens/day before the free limit |
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
  good. JSON is the only complete export: it keeps sets, exercise links and
  routine links exactly. CSV has a fixed set of columns and loses those links
  and the set numbers on re-import.
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

## Feature ideas (not urgent)

- **Things the logged sets make possible (2026-09-25).** Sessions now store
  per-set numbers (see "Logged sets" under Data model). None of these are
  built:
  - **PRs per exercise:** heaviest weight, best weight for a given number of
    reps, estimated 1-rep max, longest hold or distance.
  - **A progress chart** on each exercise's history sheet.
  - **Weekly volume** (sets × reps × weight) per exercise or per tag, e.g.
    total `legs` volume.
  - **Routines with target sets,** so adding "Squat 3×10" to a session
    prefills three rows. Today a routine's `prescription` is free text and
    isn't used to fill sets.
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
