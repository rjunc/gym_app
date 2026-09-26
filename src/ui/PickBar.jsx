import { X } from "lucide-react";
import { primaryBtnStyle, tagPillStyle } from "./styles.js";

// The strip across the top of a page opened for picking (see PagePicker):
// says what's going on, and Done goes back to the entry form. Under that, a
// chip for everything the entry will have after Done, in that order — what
// was already in it (plain), then what's been added on this visit (filled).
// Tapping a chip opens its summary; its X takes it back out. One row that
// scrolls sideways, so adding doesn't push the page down.
//   chosen  [{ id, name, isNew }]
export default function PickBar({ noun, onDone, accent = "--accent", chosen = [], onRemove, onOpen }) {
  const newCount = chosen.filter((c) => c.isNew).length;
  return (
    <div style={{ background: `var(${accent}-dim)`, borderBottom: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 18px" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: `var(${accent})` }}>Adding {noun} to your entry</span>
        <button onClick={onDone} style={{ ...primaryBtnStyle, background: `var(${accent})`, padding: "6px 14px" }}>
          Done{newCount > 0 ? ` · +${newCount}` : ""}
        </button>
      </div>
      {chosen.length > 0 && (
        <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "0 18px 10px" }}>
          {chosen.map((c) => (
            <span
              key={c.id}
              title={c.isNew ? "Added on this visit" : "Already in the entry"}
              style={{
                ...tagPillStyle,
                flexShrink: 0,
                whiteSpace: "nowrap",
                background: c.isNew ? `var(${accent})` : "var(--bg)",
                borderColor: `var(${accent})`,
                color: c.isNew ? "var(--bg)" : `var(${accent})`,
              }}
            >
              <button
                onClick={() => onOpen?.(c.id)}
                style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0, font: "inherit" }}
              >
                {c.name}
              </button>
              <button
                onClick={() => onRemove(c.id)}
                aria-label={`Remove ${c.name}`}
                style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", display: "flex" }}
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
