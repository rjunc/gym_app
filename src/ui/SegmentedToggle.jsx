// Small two-or-more-way segmented control, e.g. Gi/No-Gi or Match All/Any.
export default function SegmentedToggle({ options, value, setValue, accent = "--accent" }) {
  return (
    <div style={{ display: "inline-flex", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      {options.map(({ key, label }) => {
        const active = value === key;
        return (
          <button
            key={key}
            onClick={() => setValue(key)}
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
