import { X, Check } from "lucide-react";
import { primaryBtnStyle, tagPillStyle, pillRemoveStyle } from "./styles.js";

// The strip across the top of a page opened for picking (see PagePicker):
// says what's going on, and Done goes back to the entry form. Under that, a
// chip for everything the entry will have after Done, in that order — what
// was already in it (outlined), then what's been added on this visit
// (filled). Tapping a chip opens its summary; its X takes it back out. One
// row that scrolls sideways, so adding doesn't push the page down.
//   chosen  [{ id, name, isNew }]
export default function PickBar({ noun, onDone, accent = "--accent", chosen = [], onRemove, onOpen }) {
  const newCount = chosen.filter((c) => c.isNew).length;
  return (
    <div style={{ background: `var(${accent}-dim)`, borderBottom: "1px solid var(--border)", paddingTop: "env(safe-area-inset-top)", flexShrink: 0 }}>
      <div className="page-inner">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 16px" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: `var(${accent})` }}>Adding {noun} to your entry</div>
            <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
              {chosen.length === 0 ? "Tap Add on any to include it" : `${chosen.length} in the entry${newCount > 0 ? ` · ${newCount} new` : ""}`}
            </div>
          </div>
          <button onClick={onDone} style={{ ...primaryBtnStyle, background: `var(${accent})`, minHeight: 36 }}>
            <Check size={15} /> Done
          </button>
        </div>
        {chosen.length > 0 && (
          <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "0 16px 10px" }}>
            {chosen.map((c) => (
              <span
                key={c.id}
                title={c.isNew ? "Added on this visit" : "Already in the entry"}
                style={{
                  ...tagPillStyle,
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                  background: c.isNew ? `var(${accent})` : "var(--bg)",
                  borderColor: c.isNew ? "transparent" : "var(--border-strong)",
                  color: c.isNew ? "var(--on-accent)" : "var(--text)",
                }}
              >
                <button
                  onClick={() => onOpen?.(c.id)}
                  style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0, font: "inherit" }}
                >
                  {c.name}
                </button>
                <button onClick={() => onRemove(c.id)} aria-label={`Remove ${c.name}`} style={pillRemoveStyle}>
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
