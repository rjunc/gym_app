// Small two-or-more-way segmented control, e.g. Gi/No-Gi or Match All/Any.
// An option can carry its own `accent` to override the control-wide one, for
// choices that each have a colour of their own.
export default function SegmentedToggle({ options, value, setValue, accent = "--accent" }) {
  return (
    <div
      role="group"
      style={{ display: "inline-flex", gap: 2, padding: 3, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, maxWidth: "100%" }}
    >
      {options.map(({ key, label, accent: optionAccent }) => {
        const active = value === key;
        return (
          <button
            key={key}
            onClick={() => setValue(key)}
            aria-pressed={active}
            style={{
              padding: "5px 12px",
              fontSize: 13,
              fontWeight: 600,
              border: "none",
              borderRadius: 7,
              cursor: "pointer",
              whiteSpace: "nowrap",
              background: active ? `var(${optionAccent || accent})` : "transparent",
              color: active ? "var(--on-accent)" : "var(--text-dim)",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
