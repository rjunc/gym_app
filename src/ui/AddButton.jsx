import { Plus, Check, X } from "lucide-react";
import { primaryBtnStyle, secondaryBtnStyle } from "./styles.js";

// A card's "Add" button when its page is opened for picking (see PagePicker);
// "Added" once it's in the entry, and tapping that takes it back out.
export default function AddButton({ added, onAdd, onRemove, accent = "--accent" }) {
  return added ? (
    <button onClick={onRemove} aria-label="Remove from entry" style={{ ...secondaryBtnStyle, padding: "6px 10px", color: `var(${accent})` }}>
      <Check size={13} /> Added <X size={11} />
    </button>
  ) : (
    <button onClick={onAdd} style={{ ...primaryBtnStyle, background: `var(${accent})`, padding: "6px 10px" }}>
      <Plus size={13} /> Add
    </button>
  );
}
