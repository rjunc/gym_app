// A tappable pill: a tag, a filter, a suggestion. Outlined and quiet until
// `active`, then tinted in `accent`. `dot` puts a small swatch of that colour
// in front (used where the chip also stands for a colour, like Home's types).
export default function TagChip({ label, active, small, accent, onClick, dot }) {
  const accentVar = accent || "--accent";
  return (
    <button
      onClick={onClick}
      aria-pressed={onClick ? !!active : undefined}
      style={{
        background: active ? `var(${accentVar}-dim)` : "transparent",
        border: `1px solid ${active ? "transparent" : "var(--border-strong)"}`,
        color: active ? `var(${accentVar})` : "var(--text-dim)",
        borderRadius: 999,
        padding: small ? "2px 9px" : "5px 12px",
        fontSize: small ? 12 : 13,
        fontWeight: 600,
        cursor: onClick ? "pointer" : "default",
        whiteSpace: "nowrap",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        lineHeight: 1.4,
      }}
    >
      {dot && <span style={{ width: 8, height: 8, borderRadius: 999, background: active ? `var(${accentVar})` : "var(--text-faint)", flexShrink: 0 }} />}
      {label}
    </button>
  );
}
