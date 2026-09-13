import { Dumbbell, Swords } from "lucide-react";

const MODES = [
  { key: "lifting", label: "Lifting", Icon: Dumbbell, accent: "--accent" },
  { key: "jits", label: "Jits", Icon: Swords, accent: "--accent4" },
];

export default function ModeSwitcher({ mode, setMode }) {
  return (
    <div style={{ display: "flex", gap: 8, padding: "10px 18px", background: "var(--bg)" }}>
      {MODES.map(({ key, label, Icon, accent }) => {
        const active = mode === key;
        return (
          <button
            key={key}
            onClick={() => setMode(key)}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "8px 0",
              borderRadius: 9,
              border: `1px solid ${active ? `var(${accent})` : "var(--border)"}`,
              background: active ? `var(${accent}-dim)` : "var(--surface)",
              color: active ? `var(${accent})` : "var(--text-dim)",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
