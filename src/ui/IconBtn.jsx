export default function IconBtn({ children, onClick, danger }) {
  return (
    <button
      onClick={onClick}
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
