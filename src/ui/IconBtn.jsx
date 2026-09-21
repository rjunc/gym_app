// `label` names the button for screen readers and as a hover tooltip.
export default function IconBtn({ children, onClick, danger, label }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: 7,
        padding: 6,
        color: danger ? "var(--danger)" : "var(--text-dim)",
        cursor: "pointer",
        display: "flex",
      }}
    >
      {children}
    </button>
  );
}
