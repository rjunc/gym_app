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

CSV/JSON export and import live in the sidebar.

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

## Feature ideas (not urgent)

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
- **Jump from an exercise's history to the entry itself (2026-09-25).**
  Tapping a Library exercise opens a read-only sheet of its routines and
  every session/journal entry that links it. Tapping one of those entries
  does nothing yet; it could jump to that entry on the Sessions/Journals
  page, or open it for editing. Left out because it needs cross-page
  navigation state (switch pages, then scroll to/open a specific entry)
  that the app doesn't have anywhere else yet.
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
