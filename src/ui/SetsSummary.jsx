import { formatSets, blocksOf } from "../lib/sets.js";

// A session's blocks as compact lines in the order done — "Back squat
// 3×5 @ 225 lb — felt heavy" — one per block that has sets or a note (the
// same exercise can appear twice). Renders nothing when nothing was logged.
// A deleted Library exercise's sets are still shown, under "Deleted
// exercise", so the numbers aren't lost from view.
export default function SetsSummary({ entry, exerciseNameById, accent = "--accent", style }) {
  const lines = blocksOf(entry).filter((b) => (b.sets || []).length > 0 || b.note);
  if (lines.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, ...style }}>
      {lines.map((b) => (
        <div key={b.id} style={{ fontSize: 12, lineHeight: 1.4 }}>
          <span style={{ fontWeight: 700, color: `var(${accent})` }}>{exerciseNameById.get(b.exerciseId) || "Deleted exercise"}</span>
          {(b.sets || []).length > 0 && <span style={{ color: "var(--text)" }}> {formatSets(b.sets)}</span>}
          {b.note && <span style={{ color: "var(--text-dim)", fontStyle: "italic" }}> — {b.note}</span>}
        </div>
      ))}
    </div>
  );
}
