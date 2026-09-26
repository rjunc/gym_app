import { formatSets } from "../lib/sets.js";

// A session's logged sets as compact lines — "Back squat   3×5 @ 225 lb" —
// one per exercise that has numbers, in the entry's exercise order. Renders
// nothing when no sets were logged. A deleted Library exercise's sets are
// still shown, under "Deleted exercise", so the numbers aren't lost from view.
export default function SetsSummary({ entry, exerciseNameById, accent = "--accent", style }) {
  const sets = entry.sets || {};
  const order = [...(entry.exerciseIds || []), ...Object.keys(sets).filter((id) => !(entry.exerciseIds || []).includes(id))];
  const lines = order.filter((id) => (sets[id] || []).length > 0);
  if (lines.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, ...style }}>
      {lines.map((id) => (
        <div key={id} style={{ fontSize: 12, lineHeight: 1.4 }}>
          <span style={{ fontWeight: 700, color: `var(${accent})` }}>{exerciseNameById.get(id) || "Deleted exercise"}</span>
          <span style={{ color: "var(--text)" }}> {formatSets(sets[id])}</span>
        </div>
      ))}
    </div>
  );
}
