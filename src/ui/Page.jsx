import { Menu } from "lucide-react";
import { useShell } from "../lib/ShellContext.js";
import { eyebrowStyle } from "./styles.js";

// The top of every page: the menu button (narrow screens only), the page's
// title with an optional eyebrow above it, its main action(s) on the right,
// and `children` under that for the page's search and filters. Doesn't
// scroll; PageBody below it does. `hideMenu` when the page is opened over an
// entry form for picking, where leaving the page would lose the form. `wide`
// matches a wide PageBody.
export function PageHeader({ eyebrow, title, actions, hideMenu = false, wide = false, children }) {
  const shell = useShell();
  return (
    <header className="page-header">
      <div className={`page-inner${wide ? " wide" : ""}`} style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 40 }}>
          {shell && !hideMenu && (
            <button
              className="wide-hidden icon-btn"
              onClick={shell.openMenu}
              aria-label="Open menu"
              style={{ background: "none", border: "none", color: "var(--text)", cursor: "pointer", display: "flex", padding: 8, margin: "-8px 0 -8px -8px", borderRadius: 10 }}
            >
              <Menu size={22} />
            </button>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            {eyebrow && <div style={{ ...eyebrowStyle, color: "var(--text-dim)", marginBottom: 1 }}>{eyebrow}</div>}
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</h1>
          </div>
          {actions && <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>{actions}</div>}
        </div>
        {children}
      </div>
    </header>
  );
}

// The page's scrolling content, in the same centred column as its header
// (`wide` for a page with two columns on a big screen, like Home).
export function PageBody({ children, gap = 12, wide = false }) {
  return (
    <div className="page-body">
      <div className={`page-inner${wide ? " wide" : ""}`} style={{ padding: "16px 16px 32px", display: "flex", flexDirection: "column", gap }}>
        {children}
      </div>
    </div>
  );
}
