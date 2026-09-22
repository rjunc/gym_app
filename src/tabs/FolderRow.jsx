import { Pencil, Trash2, ChevronRight, Folder } from "lucide-react";
import IconBtn from "../ui/IconBtn.jsx";
import { cardStyle, inputStyle } from "../ui/styles.js";

export default function FolderRow({
  folder,
  subCount,
  itemCount,
  itemNoun,
  accent,
  isRenaming,
  renameDraft,
  setRenameDraft,
  onOpen,
  onStartRename,
  onCommitRename,
  onDelete,
}) {
  return (
    <div style={{ ...cardStyle, padding: 10, display: "flex", alignItems: "center", gap: 10 }}>
      <div onClick={() => !isRenaming && onOpen()} style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, cursor: "pointer" }}>
        <div style={{ background: `var(${accent}-dim)`, borderRadius: 8, padding: 7, display: "flex" }}>
          <Folder size={16} color={`var(${accent})`} />
        </div>
        {isRenaming ? (
          <input
            autoFocus
            value={renameDraft}
            onChange={(e) => setRenameDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onCommitRename()}
            onBlur={onCommitRename}
            onClick={(e) => e.stopPropagation()}
            style={{ ...inputStyle, padding: "4px 8px" }}
          />
        ) : (
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{folder.name}</div>
            <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
              {subCount > 0 ? `${subCount} folder${subCount !== 1 ? "s" : ""} · ` : ""}
              {itemCount} {itemNoun}
              {itemCount !== 1 ? "s" : ""}
            </div>
          </div>
        )}
      </div>
      {!isRenaming && (
        <div style={{ display: "flex", gap: 4 }}>
          <IconBtn onClick={onStartRename}>
            <Pencil size={13} />
          </IconBtn>
          <IconBtn onClick={onDelete} danger>
            <Trash2 size={13} />
          </IconBtn>
        </div>
      )}
      <ChevronRight size={15} color="var(--text-dim)" onClick={() => !isRenaming && onOpen()} style={{ cursor: "pointer" }} />
    </div>
  );
}
