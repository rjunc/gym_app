import { formatSets, loggedExerciseIds, exerciseNoteOf } from "../lib/sets.js";

// A session's logged sets as compact lines — "Back squat   3×5 @ 225 lb" —
// one per exercise that has numbers or a note (shown after them, dimmed), in
// the entry's exercise order. Renders nothing when nothing was logged. A deleted Library exercise's sets are
// still shown, under "Deleted exercise", so the numbers aren't lost from view.
export default function SetsSummary({ entry, exerciseNameById, accent = "--accent", style }) {
  const sets = entry.sets || {};
  const lines = loggedExerciseIds(entry);
  if (lines.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, ...style }}>
      {lines.map((id) => (
        <div key={id} style={{ fontSize: 12, lineHeight: 1.4 }}>
          <span style={{ fontWeight: 700, color: `var(${accent})` }}>{exerciseNameById.get(id) || "Deleted exercise"}</span>
          {(sets[id] || []).length > 0 && <span style={{ color: "var(--text)" }}> {formatSets(sets[id])}</span>}
          {exerciseNoteOf(entry, id) && <span style={{ color: "var(--text-dim)", fontStyle: "italic" }}> — {exerciseNoteOf(entry, id)}</span>}
        </div>
      ))}
    </div>
  );
}
