import { Fragment } from "react";
import { ChevronRight } from "lucide-react";
import { ghostLinkStyle } from "./styles.js";

// Where you are in a foldered library: `rootLabel` (the top level), then
// each folder down to the current one. Every step but the last goes back to
// that folder.
export default function Breadcrumb({ path, onNavigate, rootLabel = "Top level" }) {
  const step = (current) => ({
    ...ghostLinkStyle,
    fontSize: 13,
    color: current ? "var(--text)" : "var(--text-dim)",
    fontWeight: current ? 600 : 500,
    padding: "2px 0",
  });
  return (
    <nav aria-label="Folders" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4, padding: "0 2px" }}>
      <button onClick={() => onNavigate(null)} aria-current={path.length === 0 ? "location" : undefined} style={step(path.length === 0)}>
        {rootLabel}
      </button>
      {path.map((f, i) => (
        <Fragment key={f.id}>
          <ChevronRight size={14} color="var(--text-faint)" />
          <button onClick={() => onNavigate(f.id)} aria-current={i === path.length - 1 ? "location" : undefined} style={step(i === path.length - 1)}>
            {f.name}
          </button>
        </Fragment>
      ))}
    </nav>
  );
}
