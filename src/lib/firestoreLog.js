import { collection, doc, getDoc, onSnapshot, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebase.js";
import { newestFirst } from "./records.js";

// Each kind of record lives in its own subcollection, one document per record:
// users/{uid}/sessions/{id}, users/{uid}/routines/{id}, … The document id is
// the record's id, and the document holds the whole record (id included), so
// what's stored is exactly what the app works with. Saving an edit writes only
// that record, two devices editing different records never overwrite each
// other, and Firestore's 1 MiB limit applies to one record rather than the
// whole log.
export const COLLECTIONS = ["sessions", "journals", "rolls", "routines", "folders", "techniques", "jitsFolders", "exercises"];

const collectionRef = (authUid, name) => collection(db, "users", authUid, name);

// Before 2026-09-25 the whole log was one document holding every collection
// as an array. It's kept as a read-only backup after migration.
const legacyDocRef = (authUid) => doc(db, "users", authUid, "data", "log");

// Firestore caps a batch at 500 writes, so big changes (an import) go out in
// chunks.
const BATCH_LIMIT = 500;

async function commitInChunks(ops) {
  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    ops.slice(i, i + BATCH_LIMIT).forEach((op) => op(batch));
    await batch.commit();
  }
}

// Subscribes to one collection. `onData` receives its records, newest first
// (see newestFirst); `onError` receives any Firestore error. Returns an
// unsubscribe function.
export function subscribeToCollection(authUid, name, onData, onError) {
  return onSnapshot(
    collectionRef(authUid, name),
    (snap) => onData(newestFirst(snap.docs.map((d) => ({ ...d.data(), id: d.id })))),
    onError
  );
}

// Writes `upserts` (whole records) and deletes `deleteIds` in one collection.
export function writeChanges(authUid, name, upserts, deleteIds) {
  const col = collectionRef(authUid, name);
  return commitInChunks([
    ...upserts.map((record) => (batch) => batch.set(doc(col, record.id), record)),
    ...deleteIds.map((id) => (batch) => batch.delete(doc(col, id))),
  ]);
}

// Copies an old single-document log into the per-record collections, once.
// The old document is left in place, marked with migratedAt, as a backup.
// Safe to re-run if interrupted: records are written by id, so a second pass
// just rewrites the same documents. If the old document can't be read (e.g.
// offline with nothing cached), this does nothing and is retried next load.
export async function migrateLegacyLog(authUid) {
  let snap;
  try {
    snap = await getDoc(legacyDocRef(authUid));
  } catch {
    return;
  }
  if (!snap.exists()) return;
  const data = snap.data();
  if (data.migratedAt) return;
  const ops = [];
  COLLECTIONS.forEach((name) => {
    const col = collectionRef(authUid, name);
    (Array.isArray(data[name]) ? data[name] : [])
      .filter((record) => record && typeof record.id === "string" && record.id)
      .forEach((record) => ops.push((batch) => batch.set(doc(col, record.id), record)));
  });
  await commitInChunks(ops);
  await updateDoc(legacyDocRef(authUid), { migratedAt: new Date().toISOString() });
}
