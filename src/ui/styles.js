// The shared look of the app's building blocks, as inline style objects that
// read the tokens in theme.css. Type scale: 11 (eyebrow), 12 (meta, labels),
// 13 (secondary), 14 (body), 16 (sheet title), 22 (page title). Spacing
// steps by 4 (4, 8, 12, 16, 20, 24). Radii: 8 small controls, 10 buttons
// and inputs, 14 cards, 999 pills.

// A form field's or section's label.
export const labelStyle = { fontSize: 12, color: "var(--text-dim)", marginBottom: 6, display: "block", fontWeight: 600 };

// The small uppercase line above a title ("SESSION", "LIFTING").
export const eyebrowStyle = { fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" };

// Secondary text under a title: a date, a count, a folder path.
export const metaStyle = { fontSize: 12, color: "var(--text-dim)" };

export const inputStyle = {
  width: "100%",
  background: "var(--surface-2)",
  border: "1px solid var(--border-strong)",
  borderRadius: 10,
  padding: "10px 12px",
  color: "var(--text)",
  lineHeight: 1.35,
  // iOS Safari auto-zooms the page on focus for any input/textarea/select
  // rendered under 16px, and doesn't reliably zoom back out on blur. 16px
  // stays under that threshold and avoids the zoom entirely.
  fontSize: 16,
  outline: "none",
};

// A long unbroken run of text you typed (a link, a row of dashes) would
// otherwise refuse to wrap and push the card or sheet wider than the screen,
// making it scroll sideways. overflow-wrap is inherited, so setting it on the
// containers covers every title, note and set line inside them.
export const wrapAnywhere = { overflowWrap: "anywhere" };

export const cardStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: 16,
  ...wrapAnywhere,
};

// A block nested inside a card or sheet (a set block, a round).
export const insetStyle = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "10px 12px",
};

// Free text someone wrote (notes, details): readable body text that keeps
// their line breaks.
export const noteTextStyle = {
  fontSize: 14,
  lineHeight: 1.6,
  color: "var(--text)",
  margin: 0,
  whiteSpace: "pre-wrap",
};

// Clamps a note to `lines` lines unless `open`.
export const clamp = (open, lines = 5) => ({
  display: "-webkit-box",
  WebkitLineClamp: open ? "unset" : lines,
  WebkitBoxOrient: "vertical",
  overflow: open ? "visible" : "hidden",
});

export const primaryBtnStyle = {
  background: "var(--accent)",
  color: "var(--on-accent)",
  border: "none",
  borderRadius: 10,
  padding: "9px 14px",
  minHeight: 38,
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  whiteSpace: "nowrap",
};

export const secondaryBtnStyle = {
  background: "var(--surface-2)",
  color: "var(--text)",
  border: "1px solid var(--border-strong)",
  borderRadius: 10,
  padding: "7px 12px",
  minHeight: 36,
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  whiteSpace: "nowrap",
};

export const ghostLinkStyle = {
  background: "none",
  border: "none",
  color: "var(--accent)",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: 0,
};

export const tagPillStyle = {
  borderRadius: 999,
  padding: "4px 8px 4px 11px",
  fontSize: 12,
  fontWeight: 600,
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  border: "1px solid",
};

// A pill in a form for something picked (a tag, a routine, a technique),
// tinted in the form's colour.
export const pickedPillStyle = (accentVar) => ({
  ...tagPillStyle,
  background: `var(${accentVar}-dim)`,
  borderColor: "transparent",
  color: `var(${accentVar})`,
});

// The X inside a picked pill.
export const pillRemoveStyle = { background: "none", border: "none", color: "inherit", cursor: "pointer", display: "flex", padding: 2, margin: -2, opacity: 0.8 };

// Wraps a list of chips or pills.
export const chipRowStyle = { display: "flex", flexWrap: "wrap", gap: 6 };
