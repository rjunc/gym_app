import { BookOpen } from "lucide-react";

// The routines an entry was built from (routineIds), as one small line —
// "Push A · Warm-up" — with the Routines page's icon and colour. Deleted
// routines are left out; renders nothing when there are none to show.
export default function RoutineLinks({ entry, routineNameById, style }) {
  const names = (entry.routineIds || []).map((id) => routineNameById.get(id)).filter(Boolean);
  if (names.length === 0) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "var(--accent2)", ...style }}>
      <BookOpen size={11} style={{ flexShrink: 0 }} />
      <span>{names.join(" · ")}</span>
    </div>
  );
}
