// `label` names the button for screen readers and as a hover tooltip.
// `active` gives it a persistent highlighted state (e.g. a toggled-on star)
// instead of danger's "this action is destructive" red.
export default function IconBtn({ children, onClick, danger, active, label }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        background: active ? "var(--accent-dim)" : "var(--surface-2)",
        border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
        borderRadius: 7,
        padding: 6,
        color: danger ? "var(--danger)" : active ? "var(--accent)" : "var(--text-dim)",
        cursor: "pointer",
        display: "flex",
      }}
    >
      {children}
    </button>
  );
}
