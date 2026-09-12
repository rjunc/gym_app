import { Fragment } from "react";
import { Home, ChevronRight } from "lucide-react";
import { ghostLinkStyle } from "./styles.js";

export default function Breadcrumb({ path, onNavigate }) {
  return (
    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4, marginBottom: 12, fontSize: 12 }}>
      <button
        onClick={() => onNavigate(null)}
        style={{ ...ghostLinkStyle, color: path.length === 0 ? "var(--text)" : "var(--text-dim)", fontWeight: path.length === 0 ? 700 : 600 }}
      >
        <Home size={12} /> Home
      </button>
      {path.map((f, i) => (
        <Fragment key={f.id}>
          <ChevronRight size={12} color="var(--text-dim)" />
          <button
            onClick={() => onNavigate(f.id)}
            style={{
              ...ghostLinkStyle,
              color: i === path.length - 1 ? "var(--text)" : "var(--text-dim)",
              fontWeight: i === path.length - 1 ? 700 : 600,
            }}
          >
            {f.name}
          </button>
        </Fragment>
      ))}
    </div>
  );
}
