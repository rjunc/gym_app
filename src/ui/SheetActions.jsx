import { Pencil, Repeat, BookmarkPlus, Trash2 } from "lucide-react";
import { secondaryBtnStyle } from "./styles.js";

// The Edit / Redo / Save as routine / Delete buttons at the top of a summary
// sheet. Pass only the actions that apply; renders nothing if none do. Delete
// sits apart on the right, icon only, so it's never mistaken for the others.
export default function SheetActions({ onEdit, onRedo, onSaveAsRoutine, onDelete }) {
  if (!onEdit && !onRedo && !onSaveAsRoutine && !onDelete) return null;
  const btn = { ...secondaryBtnStyle, minHeight: 34, padding: "6px 11px" };
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
        {onEdit && (
          <button onClick={onEdit} style={btn}>
            <Pencil size={14} /> Edit
          </button>
        )}
        {onRedo && (
          <button onClick={onRedo} style={btn}>
            <Repeat size={14} /> Redo
          </button>
        )}
        {onSaveAsRoutine && (
          <button onClick={onSaveAsRoutine} style={btn}>
            <BookmarkPlus size={14} /> Save as routine
          </button>
        )}
      </div>
      {onDelete && (
        <button onClick={onDelete} aria-label="Delete" title="Delete" style={{ ...btn, color: "var(--danger)", padding: "6px 9px", alignSelf: "flex-start" }}>
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
}
