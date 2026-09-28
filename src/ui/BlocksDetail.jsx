import { CornerDownRight } from "lucide-react";
import { formatSet } from "../lib/sets.js";
import { layoutBlocks, GROUP_KINDS } from "../lib/groups.js";
import { SheetLink } from "./SheetNav.jsx";
import { insetStyle } from "./styles.js";

// Blocks laid out to read, for the summary sheets: a session's blocks (what
// was done) or a routine's (the plan), in order, with supersets/circuits
// bracketed together under their kind, every set listed on its own line
// (drops marked ↳) and each block's note under its sets. Exercise names are
// links to their own sheets (see SheetStack). `numbered` puts 1, 2a, 2b… in
// front of each block (off for a journal's plain list of exercises);
// `emptyLabel` is what a block with neither sets nor a note says, if
// anything.
export default function BlocksDetail({ blocks, groups, exerciseNameById, accent, numbered = true, emptyLabel }) {
  const items = layoutBlocks(blocks, groups);

  const blockCard = (b, label) => {
    const list = b.sets || [];
    let setNumber = 0;
    return (
      <div key={b.id} style={insetStyle}>
        <div style={{ display: "flex", gap: 8, fontWeight: 600, fontSize: 14, color: `var(${accent})` }}>
          {numbered && <span style={{ color: "var(--text-dim)", minWidth: 18, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{label}</span>}
          {exerciseNameById.has(b.exerciseId) ? <SheetLink sheet={{ kind: "exercise", id: b.exerciseId }}>{exerciseNameById.get(b.exerciseId)}</SheetLink> : "Deleted exercise"}
        </div>
        {list.length === 0 ? (
          emptyLabel && !b.note && <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 2 }}>{emptyLabel}</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 6, paddingLeft: numbered ? 26 : 0 }}>
            {list.map((set, i) => {
              const isDrop = set.drop && i > 0;
              if (!isDrop) setNumber += 1;
              return (
                <div key={i} style={{ display: "flex", gap: 10, fontSize: 14, fontVariantNumeric: "tabular-nums" }}>
                  <span style={{ color: "var(--text-faint)", width: 14, textAlign: "right", flexShrink: 0 }}>{isDrop ? <CornerDownRight size={11} /> : setNumber}</span>
                  <span>{formatSet(set)}</span>
                </div>
              );
            })}
          </div>
        )}
        {b.note && <div style={{ fontSize: 13, color: "var(--text-dim)", fontStyle: "italic", marginTop: 6, paddingLeft: numbered ? 26 : 0 }}>{b.note}</div>}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((item) =>
        item.type === "block" ? (
          blockCard(item.block, item.label)
        ) : (
          <div key={item.group.id} style={{ borderLeft: `2px solid var(${accent})`, paddingLeft: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: `var(${accent})` }}>
              <span style={{ color: "var(--text-dim)", marginRight: 6 }}>{item.number}</span>
              {GROUP_KINDS[item.group.kind]}
            </div>
            {item.members.map((m) => blockCard(m.block, m.label))}
          </div>
        )
      )}
    </div>
  );
}
