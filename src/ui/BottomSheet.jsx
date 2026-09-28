import { X, ChevronLeft } from "lucide-react";
import { eyebrowStyle, metaStyle } from "./styles.js";

// The panel behind every form and summary: dims the page and slides up from
// the bottom on a phone, or opens as a centred dialog on a wider screen (see
// .sheet-* in theme.css). `header` stays put at the top and `footer` (a
// form's Save) at the bottom, while everything in between scrolls, down and
// never sideways. Closes on a tap outside it. `gap` is the space
// between the body's direct children.
export default function BottomSheet({ onClose, gap = 16, header, footer, children }) {
  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet-panel" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        {header && <div className="sheet-head">{header}</div>}
        <div className="sheet-body" style={{ gap }}>
          {children}
        </div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}

// The standard top of a sheet: Back (when it's stacked on another), a
// coloured eyebrow for what kind of thing it is, the title, a line of meta
// under it, the close button, and `children` under all that (tags, actions).
export function SheetHeader({ eyebrow, accent = "--accent", title, meta, onBack, onClose, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Back"
            title="Back"
            className="icon-btn"
            style={{ background: "var(--surface-2)", border: "none", color: "var(--text)", cursor: "pointer", display: "flex", padding: 6, borderRadius: 9, margin: "-2px 4px 0 -4px", flexShrink: 0 }}
          >
            <ChevronLeft size={18} />
          </button>
        )}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
          {eyebrow && <span style={{ ...eyebrowStyle, color: `var(${accent})` }}>{eyebrow}</span>}
          <div style={{ fontWeight: 700, fontSize: 18, lineHeight: 1.3, letterSpacing: "-0.01em" }}>{title}</div>
          {meta && <div style={metaStyle}>{meta}</div>}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close"
            title="Close"
            className="icon-btn"
            style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", display: "flex", padding: 6, borderRadius: 9, margin: "-4px -6px 0 0", flexShrink: 0 }}
          >
            <X size={20} />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
