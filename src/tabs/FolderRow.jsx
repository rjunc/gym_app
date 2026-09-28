import { Pencil, Trash2, ChevronRight, Folder } from "lucide-react";
import IconBtn from "../ui/IconBtn.jsx";
import { cardStyle, inputStyle, metaStyle } from "../ui/styles.js";

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
    <div
      onClick={(ev) => !isRenaming && !ev.target.closest("button") && onOpen()}
      className={isRenaming ? undefined : "card-click"}
      style={{ ...cardStyle, padding: "10px 10px 10px 12px", display: "flex", alignItems: "center", gap: 12 }}
    >
      <div style={{ background: `var(${accent}-dim)`, borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Folder size={18} color={`var(${accent})`} />
      </div>
      {isRenaming ? (
        <input
          autoFocus
          aria-label="Folder name"
          value={renameDraft}
          onChange={(e) => setRenameDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onCommitRename()}
          onBlur={onCommitRename}
          style={{ ...inputStyle, padding: "6px 10px", flex: 1 }}
        />
      ) : (
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{folder.name}</div>
          <div style={metaStyle}>
            {subCount > 0 ? `${subCount} folder${subCount !== 1 ? "s" : ""} · ` : ""}
            {itemCount} {itemNoun}
            {itemCount !== 1 ? "s" : ""}
          </div>
        </div>
      )}
      {!isRenaming && (
        <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          <IconBtn onClick={onStartRename} label="Rename folder">
            <Pencil size={15} />
          </IconBtn>
          {onDelete && (
            <IconBtn onClick={onDelete} danger label="Delete folder">
              <Trash2 size={15} />
            </IconBtn>
          )}
          <ChevronRight size={18} color="var(--text-faint)" style={{ marginLeft: 2 }} />
        </div>
      )}
    </div>
  );
}
