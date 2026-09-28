// What a list or page shows when there's nothing in it: an icon, a short
// title, a line of guidance and optionally a button to fix it.
export default function EmptyState({ icon: Icon, title, children, action, compact = false }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 8, padding: compact ? "20px 12px" : "48px 16px" }}>
      {Icon && (
        <div style={{ width: 44, height: 44, borderRadius: 999, background: "var(--surface-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", marginBottom: 4 }}>
          <Icon size={20} />
        </div>
      )}
      {title && <div style={{ fontWeight: 600, fontSize: 15 }}>{title}</div>}
      {children && <div style={{ color: "var(--text-dim)", fontSize: 13, maxWidth: 340, lineHeight: 1.5 }}>{children}</div>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}
