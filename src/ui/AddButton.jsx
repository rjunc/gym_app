import { Plus, Check } from "lucide-react";
import { primaryBtnStyle, secondaryBtnStyle } from "./styles.js";

// A card's "Add" button when its page is opened for picking (see PagePicker);
// "Added" once it's in the entry (or held for it until Done), and tapping
// that takes it back out.
export default function AddButton({ added, onAdd, onRemove, accent = "--accent" }) {
  return added ? (
    <button
      onClick={onRemove}
      aria-label="Remove from entry"
      title="Remove from entry"
      style={{ ...secondaryBtnStyle, minHeight: 32, padding: "5px 10px", color: `var(${accent})`, background: `var(${accent}-dim)`, borderColor: "transparent" }}
    >
      <Check size={14} /> Added
    </button>
  ) : (
    <button onClick={onAdd} style={{ ...primaryBtnStyle, background: `var(${accent})`, minHeight: 32, padding: "5px 12px", fontSize: 13 }}>
      <Plus size={14} /> Add
    </button>
  );
}
