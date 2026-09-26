import { uid } from "./id.js";

// Every record (entry, routine, technique, exercise, folder) carries
// createdAt/updatedAt as full ISO timestamps, so same-day entries have a real
// order and "last edited" is knowable. A record imported from a file without
// them simply lacks both — they're never faked.
export const nowISO = () => new Date().toISOString();

// A brand-new record: fresh id, both timestamps set to now.
export function newRecord(fields) {
  const now = nowISO();
  return { id: uid(), ...fields, createdAt: now, updatedAt: now };
}

// An edit to an existing record: fields merged in, createdAt kept, updatedAt
// bumped to now.
export function editRecord(record, fields) {
  return { ...record, ...fields, updatedAt: nowISO() };
}

// Replaces the record with `id` in `list` with editRecord(record, fields),
// leaving every other record untouched. The common edit path for setState.
export function editById(list, id, fields) {
  return list.map((r) => (r.id === id ? editRecord(r, fields) : r));
}

// Stored records come back from Firestore in no useful order, so they're put
// newest-created first, the order the app has always kept by adding new
// records to the front. Records without createdAt (imported without one) go
// last, by id so the order at least stays put between loads.
export function newestFirst(records) {
  return [...records].sort((a, b) => {
    const ca = a.createdAt || "";
    const cb = b.createdAt || "";
    if (ca !== cb) return ca < cb ? 1 : -1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

// What has to be written to bring the stored copy of a collection (`synced`, a
// Map of id -> record as last seen from or sent to Firestore) in line with
// `items` (the app's current array). Every edit makes a new object (see
// editRecord), so any record that isn't the very same object as its synced
// copy is written; anything synced that's no longer in `items` is deleted.
// Records that didn't change are never touched.
export function diffRecords(synced, items) {
  const upserts = items.filter((r) => synced.get(r.id) !== r);
  const current = new Set(items.map((r) => r.id));
  const deleteIds = [...synced.keys()].filter((id) => !current.has(id));
  return { upserts, deleteIds };
}

// createdAt/updatedAt from an imported record, kept only if they're strings.
export function importedTimestamps(r) {
  return {
    ...(typeof r.createdAt === "string" && r.createdAt ? { createdAt: r.createdAt } : {}),
    ...(typeof r.updatedAt === "string" && r.updatedAt ? { updatedAt: r.updatedAt } : {}),
  };
}
