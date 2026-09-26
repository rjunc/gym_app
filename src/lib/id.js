export const uid = () => Math.random().toString(36).slice(2, 10);

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

// Shifts an ISO date string by `days` (negative to go back), local-time
// based to match todayISO()/formatDate().
export function shiftISODate(iso, days) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const formatDate = (iso) => {
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return iso;
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
};

// A full ISO timestamp (createdAt/updatedAt) as local "Thu, Sep 24 at
// 6:00 PM", with the year added when it isn't the current one. Returns ""
// for anything unreadable.
export const formatDateTime = (timestamp, now = new Date()) => {
  const d = new Date(timestamp);
  if (!timestamp || isNaN(d)) return "";
  const date = d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} at ${time}`;
};

// Whether a record was edited after it was created — more than a minute
// apart, so saving straight after creating doesn't count.
export const wasEdited = (record) =>
  !!record.createdAt && !!record.updatedAt && new Date(record.updatedAt) - new Date(record.createdAt) > 60 * 1000;
