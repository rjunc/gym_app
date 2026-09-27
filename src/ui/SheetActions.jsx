import { Pencil, Repeat, BookmarkPlus, Trash2 } from "lucide-react";
import { secondaryBtnStyle } from "./styles.js";

// The Edit / Redo / Save as routine / Delete buttons at the top of a summary
// sheet. Pass only the actions that apply; renders nothing if none do.
export default function SheetActions({ onEdit, onRedo, onSaveAsRoutine, onDelete }) {
  if (!onEdit && !onRedo && !onSaveAsRoutine && !onDelete) return null;
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {onEdit && (
        <button onClick={onEdit} style={secondaryBtnStyle}>
          <Pencil size={13} /> Edit
        </button>
      )}
      {onRedo && (
        <button onClick={onRedo} style={secondaryBtnStyle}>
          <Repeat size={13} /> Redo
        </button>
      )}
      {onSaveAsRoutine && (
        <button onClick={onSaveAsRoutine} style={secondaryBtnStyle}>
          <BookmarkPlus size={13} /> Save as routine
        </button>
      )}
      {onDelete && (
        <button onClick={onDelete} style={{ ...secondaryBtnStyle, color: "var(--danger)" }}>
          <Trash2 size={13} /> Delete
        </button>
      )}
    </div>
  );
}
