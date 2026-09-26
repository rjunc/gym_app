import { primaryBtnStyle } from "./styles.js";

// The strip across the top of a page opened for picking (see PagePicker):
// says what's going on, and Done goes back to the entry form.
export default function PickBar({ noun, onDone, accent = "--accent" }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        padding: "10px 18px",
        background: `var(${accent}-dim)`,
        borderBottom: "1px solid var(--border)",
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 600, color: `var(${accent})` }}>Adding {noun} to your entry</span>
      <button onClick={onDone} style={{ ...primaryBtnStyle, background: `var(${accent})`, padding: "6px 14px" }}>
        Done
      </button>
    </div>
  );
}
