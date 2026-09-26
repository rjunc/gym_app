import { uid } from "./id.js";

// Every record (entry, routine, technique, exercise, folder) carries
// createdAt/updatedAt as full ISO timestamps, so same-day entries have a real
// order and "last edited" is knowable. Records from before 2026-09-25 (or
// imported without them) simply lack both — they're never faked.
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

// createdAt/updatedAt from an imported record, kept only if they're strings.
export function importedTimestamps(r) {
  return {
    ...(typeof r.createdAt === "string" && r.createdAt ? { createdAt: r.createdAt } : {}),
    ...(typeof r.updatedAt === "string" && r.updatedAt ? { updatedAt: r.updatedAt } : {}),
  };
}
