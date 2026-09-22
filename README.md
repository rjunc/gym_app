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
  Not urgent — worth a rough size check every year or so. If it ever gets
  close, the fix is splitting the ever-growing dated entries (sessions/
  rolls/journals) out of the single document, e.g. into a subcollection,
  rather than anything drastic.

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
