import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// True once all required env vars are present. If they're missing (e.g. the
// developer hasn't set up Firebase yet), the app shows a setup screen instead
// of crashing on a bad initializeApp() call.
export const firebaseConfigured = Object.values(firebaseConfig).every(Boolean);

export const app = firebaseConfigured ? initializeApp(firebaseConfig) : null;

export const auth = firebaseConfigured ? getAuth(app) : null;

// Persistent local cache lets the app keep working offline and load instantly
// from the last-synced snapshot, then reconcile with the server in the background.
export const db = firebaseConfigured
  ? initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      // A record field left undefined is skipped instead of failing the whole
      // save (each record is written as its own document).
      ignoreUndefinedProperties: true,
    })
  : null;
