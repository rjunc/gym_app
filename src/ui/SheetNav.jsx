import { useSheets } from "../lib/SheetStack.js";

// A name that opens its record's sheet on top of the current one: a routine,
// a Library exercise or a dated entry, as `sheet` (see SheetStack's open).
// Keeps the surrounding text's look, underlined so it reads as tappable.
// Renders plain text when there's nothing to open — no sheet stack, or no
// `sheet` (e.g. the record was deleted).
export function SheetLink({ sheet, children, style }) {
  const sheets = useSheets();
  if (!sheets || !sheet) return <span style={style}>{children}</span>;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        sheets.open(sheet);
      }}
      style={{
        background: "none",
        border: "none",
        padding: 0,
        font: "inherit",
        color: "inherit",
        textAlign: "left",
        cursor: "pointer",
        textDecoration: "underline",
        textDecorationStyle: "dotted",
        textUnderlineOffset: 3,
        textDecorationColor: "color-mix(in srgb, currentColor 45%, transparent)",
        ...style,
      }}
    >
      {children}
    </button>
  );
}
