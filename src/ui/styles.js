export const labelStyle = { fontSize: 11, color: "var(--text-dim)", marginBottom: 6, display: "block", fontWeight: 600 };

export const inputStyle = {
  width: "100%",
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "10px 12px",
  color: "var(--text)",
  // iOS Safari auto-zooms the page on focus for any input/textarea/select
  // rendered under 16px, and doesn't reliably zoom back out on blur. 16px
  // stays under that threshold and avoids the zoom entirely.
  fontSize: 16,
  outline: "none",
};

export const cardStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 14,
};

export const primaryBtnStyle = {
  background: "var(--accent)",
  color: "#15160F",
  border: "none",
  borderRadius: 9,
  padding: "9px 14px",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 6,
};

export const secondaryBtnStyle = {
  background: "var(--surface-2)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "8px 12px",
  fontWeight: 600,
  fontSize: 12,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 6,
};

export const ghostLinkStyle = {
  background: "none",
  border: "none",
  color: "var(--accent)",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 3,
  padding: 0,
};

export const tagPillStyle = {
  borderRadius: 999,
  padding: "3px 8px 3px 10px",
  fontSize: 11,
  fontWeight: 600,
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  border: "1px solid",
};
