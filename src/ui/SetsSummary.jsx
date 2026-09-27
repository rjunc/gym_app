import { Fragment } from "react";
import { formatSets, blocksOf } from "../lib/sets.js";
import { layoutBlocks, GROUP_KINDS } from "../lib/groups.js";

// A session's blocks as compact lines in the order done — "Back squat
// 3×5 @ 225 lb — felt heavy" — one per block that has sets or a note (the
// same exercise can appear twice), and one per superset or circuit with its
// exercises joined by "+". Renders nothing when nothing was logged. A deleted
// Library exercise's sets are still shown, under "Deleted exercise", so the
// numbers aren't lost from view. `includeEmpty` lists blocks with neither
// sets nor a note too (a routine's plan, where "just do it" is still part of
// it).
export default function SetsSummary({ entry, exerciseNameById, accent = "--accent", includeEmpty = false, style }) {
  const logged = (b) => includeEmpty || (b.sets || []).length > 0 || b.note;
  const lines = layoutBlocks(blocksOf(entry), entry.groups)
    .map((item) => (item.type === "block" ? { key: item.block.id, blocks: logged(item.block) ? [item.block] : [] } : { key: item.group.id, kind: item.group.kind, blocks: item.members.map((m) => m.block).filter(logged) }))
    .filter((line) => line.blocks.length > 0);
  if (lines.length === 0) return null;

  const part = (b) => (
    <>
      <span style={{ fontWeight: 700, color: `var(${accent})` }}>{exerciseNameById.get(b.exerciseId) || "Deleted exercise"}</span>
      {(b.sets || []).length > 0 && <span style={{ color: "var(--text)" }}> {formatSets(b.sets)}</span>}
      {b.note && <span style={{ color: "var(--text-dim)", fontStyle: "italic" }}> — {b.note}</span>}
    </>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, ...style }}>
      {lines.map((line) => (
        <div key={line.key} style={{ fontSize: 12, lineHeight: 1.4 }}>
          {line.kind && <span style={{ color: "var(--text-dim)", fontWeight: 700 }}>{GROUP_KINDS[line.kind]}: </span>}
          {line.blocks.map((b, i) => (
            <Fragment key={b.id}>
              {i > 0 && <span style={{ color: "var(--text-dim)" }}> + </span>}
              {part(b)}
            </Fragment>
          ))}
        </div>
      ))}
    </div>
  );
}
