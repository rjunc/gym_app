import { useState, useEffect, useRef } from "react";
import { subscribeToCollection, writeChanges } from "./firestoreLog.js";
import { diffRecords } from "./records.js";

// One Firestore collection as React state: [items, setItems, status]. Pages
// change `items` with setItems like any other state, and only the records that
// actually changed are written back (see diffRecords); snapshots from the
// server (including other devices' edits) replace `items` as they arrive.
//
// status.loaded turns true on the first snapshot. Until then nothing is ever
// written, so a failed or slow first load can't be mistaken for an empty log
// and saved over the real one. status.loadError is set if the listener fails
// before that first snapshot; status.error for any later sync/save failure.
// `enabled` holds the subscription back (e.g. until a migration has run).
export function useSyncedCollection(authUid, name, enabled = true) {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState({ loaded: false, loadError: null, error: null });
  // Map of id -> record as last seen from or sent to Firestore; null until the
  // first snapshot, which is what blocks saving before a real load.
  const synced = useRef(null);

  useEffect(() => {
    synced.current = null;
    setItems([]);
    setStatus({ loaded: false, loadError: null, error: null });
    if (!enabled) return;
    return subscribeToCollection(
      authUid,
      name,
      (records) => {
        synced.current = new Map(records.map((r) => [r.id, r]));
        setItems(records);
        setStatus((s) => ({ ...s, loaded: true, error: null }));
      },
      (err) => {
        console.error(`sync failed (${name})`, err);
        setStatus((s) => (s.loaded ? { ...s, error: err } : { ...s, loadError: err }));
      }
    );
  }, [authUid, name, enabled]);

  useEffect(() => {
    if (!synced.current) return;
    const { upserts, deleteIds } = diffRecords(synced.current, items);
    if (upserts.length === 0 && deleteIds.length === 0) return;
    synced.current = new Map(items.map((r) => [r.id, r]));
    writeChanges(authUid, name, upserts, deleteIds).catch((err) => {
      console.error(`save failed (${name})`, err);
      setStatus((s) => ({ ...s, error: err }));
    });
  }, [items, authUid, name]);

  return [items, setItems, status];
}
