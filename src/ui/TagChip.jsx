export default function TagChip({ label, active, small, accent, onClick }) {
  const accentVar = accent || "--accent";
  const accentDimVar = `${accentVar}-dim`;
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? `var(${accentDimVar})` : "transparent",
        border: `1px solid ${active ? `var(${accentVar})` : "var(--border)"}`,
        color: active ? `var(${accentVar})` : "var(--text-dim)",
        borderRadius: 999,
        padding: small ? "2px 9px" : "4px 11px",
        fontSize: small ? 11 : 12,
        fontWeight: 600,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}
