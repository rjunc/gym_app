import { useState } from "react";
import { FolderPlus, X, AlertTriangle } from "lucide-react";
import { newRecord, editById } from "../lib/records.js";
import { folderPath } from "../lib/folders.js";
import Breadcrumb from "../ui/Breadcrumb.jsx";
import IconBtn from "../ui/IconBtn.jsx";
import FolderRow from "./FolderRow.jsx";
import { inputStyle, primaryBtnStyle, ghostLinkStyle } from "../ui/styles.js";

// The folder half of a foldered library page (Routines, Techniques,
// Exercises): where you are, the folders inside it, and adding, renaming and
// deleting folders. The page draws the items in the current folder below it.
//   folders / setFolders       the page's folder tree
//   currentFolderId / onNavigate   the folder being shown (null: top level)
//   items                      every item, so a folder with anything in it —
//                              even items the page is hiding — can't be deleted
//   countItems(folderId)       how many items to show on a folder's row (the
//                              ones the page is showing)
//   addingFolder / setAddingFolder   whether the new folder field is open,
//                              held by the page so its empty state can open it
//   canDelete                  false while picking for an entry (see PagePicker)
export default function FolderBrowser({
  folders,
  setFolders,
  currentFolderId,
  onNavigate,
  items,
  countItems,
  itemNoun,
  accent,
  addingFolder,
  setAddingFolder,
  canDelete = true,
}) {
  const [newFolderName, setNewFolderName] = useState("");
  const [folderError, setFolderError] = useState("");
  const [renamingFolderId, setRenamingFolderId] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");

  const subfolders = folders.filter((f) => (f.parentId || null) === currentFolderId).sort((a, b) => a.name.localeCompare(b.name));
  const subCountOf = (folderId) => folders.filter((f) => (f.parentId || null) === folderId).length;

  const createFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    setFolders((prev) => [...prev, newRecord({ name, parentId: currentFolderId })]);
    setNewFolderName("");
    setAddingFolder(false);
  };

  const commitRename = () => {
    const name = renameDraft.trim();
    if (name) setFolders((prev) => editById(prev, renamingFolderId, { name }));
    setRenamingFolderId(null);
  };

  const deleteFolder = (folder) => {
    if (subCountOf(folder.id) > 0 || items.some((r) => (r.folderId || null) === folder.id)) {
      setFolderError(`"${folder.name}" isn't empty. Move or delete what's inside it first.`);
      setTimeout(() => setFolderError(""), 3500);
      return;
    }
    if (!window.confirm(`Delete the folder "${folder.name}"? This can't be undone.`)) return;
    setFolders((prev) => prev.filter((f) => f.id !== folder.id));
  };

  return (
    <>
      {folderError && (
        <div role="alert" style={{ display: "flex", gap: 8, alignItems: "flex-start", color: "var(--danger)", background: "var(--danger-dim)", borderRadius: 10, padding: "10px 12px", fontSize: 13 }}>
          <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          {folderError}
        </div>
      )}

      <Breadcrumb path={folderPath(folders, currentFolderId)} onNavigate={onNavigate} rootLabel={`All ${itemNoun}s`} />

      {subfolders.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {subfolders.map((f) => (
            <FolderRow
              key={f.id}
              folder={f}
              subCount={subCountOf(f.id)}
              itemCount={countItems(f.id)}
              itemNoun={itemNoun}
              accent={accent}
              isRenaming={renamingFolderId === f.id}
              renameDraft={renameDraft}
              setRenameDraft={setRenameDraft}
              onOpen={() => onNavigate(f.id)}
              onStartRename={() => {
                setRenamingFolderId(f.id);
                setRenameDraft(f.name);
              }}
              onCommitRename={commitRename}
              onDelete={canDelete ? () => deleteFolder(f) : undefined}
            />
          ))}
        </div>
      )}

      {addingFolder ? (
        <div style={{ display: "flex", gap: 8 }}>
          <input
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createFolder()}
            placeholder="Folder name"
            aria-label="New folder name"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={createFolder} style={{ ...primaryBtnStyle, background: `var(${accent})`, minHeight: 44 }}>
            Add
          </button>
          <IconBtn onClick={() => setAddingFolder(false)} label="Cancel">
            <X size={16} />
          </IconBtn>
        </div>
      ) : (
        <button onClick={() => setAddingFolder(true)} style={{ ...ghostLinkStyle, color: "var(--text-dim)", alignSelf: "flex-start", padding: "2px 2px" }}>
          <FolderPlus size={15} /> New folder here
        </button>
      )}
    </>
  );
}

// The folder options for an item's Folder field, each labelled with its full
// path.
export function folderOptions(folders) {
  return [
    { id: null, label: "No folder (top level)" },
    ...folders
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((f) => ({ id: f.id, label: folderPath(folders, f.id).map((p) => p.name).join(" / ") })),
  ];
}
