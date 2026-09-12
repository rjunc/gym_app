# Session Log

A workout session/routine journal built with React + Vite. Data syncs across
devices via Firebase Firestore, gated behind email/password login so it's
only ever your data.

## 1. Create a Firebase project (one-time, ~5 min)

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and click **Add project**. Name it anything (e.g. "session-log"). You can skip Google Analytics.
2. In the left sidebar, go to **Build → Authentication → Get started**. Under **Sign-in method**, enable **Email/Password**.
3. Go to **Build → Firestore Database → Create database**. Choose a region close to you, and start in **production mode**.
4. Once created, go to the **Rules** tab and replace the contents with what's in [firestore.rules](firestore.rules) in this repo, then **Publish**. This restricts each user to only reading/writing their own data.
5. Go to **Project settings** (gear icon, top left) → scroll to **Your apps** → click the **</>** (web) icon → register an app (any nickname). Firebase will show you a config object like:
   ```js
   const firebaseConfig = {
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "...",
   };
   ```
   Keep this page open for the next step.

These values aren't secret — they identify your Firebase project, not authenticate as you. The actual security is the Firestore rules (step 4) plus login (step 2).

## 2. Configure environment variables

**Locally:** copy `.env.example` to `.env.local` and fill in the six values from the Firebase config above:

```bash
cp .env.example .env.local
```

**On Vercel:** in your project → **Settings → Environment Variables**, add each of the six `VITE_FIREBASE_*` keys with their values, then redeploy (Vercel won't pick up new env vars on an already-built deployment — trigger a new one from the Deployments tab, or just push a commit).

## 3. Develop locally

```bash
npm install
npm run dev
```

The first time you open the app you'll be asked to sign up (email + password) — this creates your account. Log in with the same account on any other device/browser to see the same data.

## Build

```bash
npm run build
npm run preview
```

## Deploy to Vercel

**Option A — via the Vercel dashboard**
1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. Vercel auto-detects the Vite framework preset — add the env vars from step 2 above, then Deploy.

**Option B — via CLI**
```bash
npm install -g vercel
vercel
```
Follow the prompts; Vercel will detect the Vite build automatically (`npm run build`, output dir `dist`). Add the env vars via `vercel env add` or the dashboard.

## Data model

Each user's entire log (sessions, routines, folders) lives in one Firestore
document at `users/{uid}/data/log`. That mirrors the old single-blob
`localStorage` shape, keeps reads/writes to one round trip, and is well
within the free-tier limits for personal use. CSV/JSON export and import
(bottom toolbar) still work exactly as before, independent of Firestore.
