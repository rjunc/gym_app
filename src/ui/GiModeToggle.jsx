const OPTIONS = [
  { key: "gi", label: "Gi" },
  { key: "no-gi", label: "No-Gi" },
];

// Gi mode shows everything (no-gi-safe techniques still work in the gi).
// No-gi mode hides anything marked giOnly, since those moves don't apply.
export default function GiModeToggle({ mode, setMode, accent = "--accent4" }) {
  return (
    <div style={{ display: "inline-flex", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      {OPTIONS.map(({ key, label }) => {
        const active = mode === key;
        return (
          <button
            key={key}
            onClick={() => setMode(key)}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              background: active ? `var(${accent})` : "var(--surface-2)",
              color: active ? "#15160F" : "var(--text-dim)",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
