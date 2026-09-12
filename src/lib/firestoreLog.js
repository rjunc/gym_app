import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase.js";

// Each user's whole log (sessions/journals/routines/folders) lives in one
// document — small enough data that a single doc + realtime listener is
// simpler than splitting into subcollections.
const userDocRef = (authUid) => doc(db, "users", authUid, "data", "log");

// Subscribes to a user's log document. `onData` receives the document's
// fields (or {} if it doesn't exist yet, e.g. a brand-new account); `onError`
// receives any Firestore error. Returns an unsubscribe function.
export function subscribeToLog(authUid, onData, onError) {
  return onSnapshot(userDocRef(authUid), (snap) => onData(snap.exists() ? snap.data() : {}), onError);
}

export function saveLog(authUid, data) {
  return setDoc(userDocRef(authUid), data);
}
