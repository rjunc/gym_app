// A quiet icon-only button (edit, delete, star…): no chrome until hovered,
// so a card's actions don't compete with its content. `label` names the
// button for screen readers and as a hover tooltip. `active` gives it a
// persistent highlighted state (e.g. a toggled-on star) instead of danger's
// "this action is destructive" red on hover.
export default function IconBtn({ children, onClick, danger, active, label }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`icon-btn${danger ? " danger" : ""}`}
      style={{
        background: active ? "var(--accent-dim)" : "transparent",
        border: "none",
        borderRadius: 8,
        width: 32,
        height: 32,
        padding: 0,
        color: active ? "var(--accent)" : "var(--text-dim)",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}
