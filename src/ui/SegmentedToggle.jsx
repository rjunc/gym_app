// Small two-or-more-way segmented control, e.g. Gi/No-Gi or Match All/Any.
// An option can carry its own `accent` to override the control-wide one, for
// choices that each have a colour of their own.
export default function SegmentedToggle({ options, value, setValue, accent = "--accent" }) {
  return (
    <div style={{ display: "inline-flex", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      {options.map(({ key, label, accent: optionAccent }) => {
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
              background: active ? `var(${optionAccent || accent})` : "var(--surface-2)",
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
