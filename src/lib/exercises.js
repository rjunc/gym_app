// How often each Library exercise appears in sessions logged in the last
// `days` days (default 30), keyed by exercise id. Used to sort the
// "Exercises" picker's suggestions by what's actually been trained lately,
// instead of alphabetically.
export function recentExerciseCounts(sessions, todayISO, days = 30) {
  const cutoff = shiftISODate(todayISO, -days);
  const counts = new Map();
  sessions.forEach((s) => {
    if (typeof s.date !== "string" || s.date < cutoff) return;
    (s.exerciseIds || []).forEach((id) => counts.set(id, (counts.get(id) || 0) + 1));
  });
  return counts;
}

// Shifts an ISO date string by `days` (negative to go back), local-time
// based to match todayISO()/formatDate() elsewhere.
function shiftISODate(iso, days) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
