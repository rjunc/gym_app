import { Plus, Check } from "lucide-react";
import { primaryBtnStyle, secondaryBtnStyle } from "./styles.js";

// A card's "Add" button when its page is opened for picking (see PagePicker);
// "Added" once it's in the entry, and inert — take it back off in the form.
export default function AddButton({ added, onAdd, accent = "--accent" }) {
  return added ? (
    <button disabled style={{ ...secondaryBtnStyle, padding: "6px 10px", color: `var(${accent})`, cursor: "default" }}>
      <Check size={13} /> Added
    </button>
  ) : (
    <button onClick={onAdd} style={{ ...primaryBtnStyle, background: `var(${accent})`, padding: "6px 10px" }}>
      <Plus size={13} /> Add
    </button>
  );
}
