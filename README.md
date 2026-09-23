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

Each user's entire log (sessions, routines, folders) lives in one Firestore
document at `users/{uid}/data/log`. That mirrors the old single-blob
`localStorage` shape, keeps reads/writes to one round trip, and is well
within the free-tier limits for personal use — see the single-document size
cap under Open considerations below for the one real ceiling this design
has. CSV/JSON export and import (bottom toolbar) still work exactly as
before, independent of Firestore.

## Managing accounts

Firebase Console → **Authentication → Users** lists every account (email,
created date, last login, UID). Select rows and use the trash icon to delete
one or several at once.

Deleting a user there only removes their *login* — it does not delete their
data. Each account's log is a separate Firestore document at
`users/{uid}/data/log`; clean it up manually under **Firestore Database →
Data** if you want to fully remove a test account's footprint.

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
  restrict all reads/writes to `request.auth.uid == uid` (see
  `firestore.rules`). If you ever edit them in the Firebase Console, paste
  carefully — a malformed rules file can silently fail to publish, leaving
  the previous (possibly deny-all) rules in effect.
- **Bundle size warning during build** (`some chunks are larger than 500 kB`)
  comes from the Firebase SDK. Harmless for a personal app at this scale;
  only worth addressing (via code-splitting) if load time ever becomes
  noticeable.
- **The real storage ceiling is Firestore's 1 MiB per-document limit, not the
  1 GB free-tier quota.** Every field lives in one document, so that
  document — not the account-wide 1 GB pool — is what could eventually fill
  up; with a single user you'll never come close to 1 GB itself. Rough math
  at ~6 training days/week: short one-line entries would take roughly
  9-10 years to approach 1 MiB, detailed paragraph-per-session entries
  roughly 3-4 years. The library/routine/technique data is comparatively
  small and plateaus once it's populated, since it doesn't grow daily.
  Not urgent — worth a rough size check every year or so.
- **Related: every save rewrites the entire document, not just what
  changed.** The debounced save in `App.jsx` does one `setDoc` of the whole
  combined object on every edit, so changing one session's text also
  re-sends every routine, technique, and library exercise. Harmless at the
  current size, but it's the same root cause as the size cap above, and
  worth fixing together if either becomes annoying. In order of effort:
  1. **Write only what changed.** Swap the single `setDoc` for `updateDoc`
     calls scoped to just the field that changed (e.g. only `{ sessions }`
     when a session changes). Cuts the per-edit network cost to roughly
     "how big is this one category," with no change to the data model.
  2. **Split the one document into a handful, by category** (e.g.
     `users/{uid}/data/sessions`, `.../library`, `.../routines`), each still
     an array-in-one-document like today. Multiplies the effective size
     ceiling by however many documents you split into, and an edit to one
     category no longer touches the others at all. Each category is still
     capped eventually, just at its own, much slower rate.
  3. **Move the genuinely unbounded data into real subcollections.**
     Sessions/rolls/journals are the only things that grow forever; the
     library/routines/techniques/folders are small and plateau. Giving just
     the dated logs their own subcollection (one document per entry, or
     bucketed by month/year) removes the size ceiling for the part of the
     data that would ever hit it, and means syncing only moves the entries
     that actually changed. The correct long-term shape, but the biggest
     lift — it changes how every tab reads/writes, not just how saving is
     wired up.

  None of this is built. #1 is cheap and worth doing on its own; #2 and #3
  are only worth it once the size or sync cost actually becomes noticeable.

## Feature ideas (not urgent)

- **Journals aren't on the Home calendar.** They were left out when Home's
  calendar was built, since a journal entry isn't training. The Sessions/
  Rolls/Journals tabs remain the only way to browse and search entries by
  text — Home was deliberately kept to date/tag filtering only, to avoid
  cluttering the page with a search box. Revisit whether journals belong on
  Home too, e.g. as a third opt-in type alongside Sessions/Rolls.
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
