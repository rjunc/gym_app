import { useState, useMemo } from "react";
import { Search, Plus, Pencil, Trash2, ChevronRight, Folder, FolderPlus, X } from "lucide-react";
import { uid } from "../lib/id.js";
import { folderPath } from "../lib/folders.js";
import Breadcrumb from "../ui/Breadcrumb.jsx";
import TagChip from "../ui/TagChip.jsx";
import IconBtn from "../ui/IconBtn.jsx";
import EntryComposer from "../ui/EntryComposer.jsx";
import RoutineCard from "./RoutineCard.jsx";
import { inputStyle, cardStyle, primaryBtnStyle, secondaryBtnStyle, ghostLinkStyle } from "../ui/styles.js";

export default function RoutinesTab({ folders, setFolders, routines, setRoutines }) {
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [search, setSearch] = useState("");
  const [activeTags, setActiveTags] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showComposer, setShowComposer] = useState(false);
  const [form, setForm] = useState({ name: "", tags: [], text: "", folderId: null });
  const [tagDraft, setTagDraft] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [addingFolder, setAddingFolder] = useState(false);
  const [folderError, setFolderError] = useState("");
  const [renamingFolderId, setRenamingFolderId] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");

  const isFiltering = search.trim() !== "" || activeTags.length > 0;

  const allTags = useMemo(() => {
    const set = new Set();
    routines.forEach((r) => (r.tags || []).forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [routines]);

  const subfolders = useMemo(
    () => folders.filter((f) => (f.parentId || null) === currentFolderId).sort((a, b) => a.name.localeCompare(b.name)),
    [folders, currentFolderId]
  );

  const routinesInFolder = useMemo(
    () => routines.filter((r) => (r.folderId || null) === currentFolderId).sort((a, b) => a.name.localeCompare(b.name)),
    [routines, currentFolderId]
  );

  const filteredRoutines = useMemo(() => {
    const q = search.trim().toLowerCase();
    return routines
      .filter((r) => {
        const matchesSearch =
          q === "" ||
          r.name.toLowerCase().includes(q) ||
          (r.text || "").toLowerCase().includes(q) ||
          (r.tags || []).some((t) => t.toLowerCase().includes(q));
        const matchesTags = activeTags.length === 0 || activeTags.every((t) => (r.tags || []).includes(t));
        return matchesSearch && matchesTags;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [routines, search, activeTags]);

  const breadcrumb = folderPath(folders, currentFolderId);

  const folderCounts = (folderId) => {
    const subCount = folders.filter((f) => (f.parentId || null) === folderId).length;
    const routineCount = routines.filter((r) => (r.folderId || null) === folderId).length;
    return { subCount, routineCount };
  };

  const toggleTagFilter = (t) => setActiveTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const createFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    setFolders((prev) => [...prev, { id: uid(), name, parentId: currentFolderId }]);
    setNewFolderName("");
    setAddingFolder(false);
  };

  const startRename = (folder) => {
    setRenamingFolderId(folder.id);
    setRenameDraft(folder.name);
  };

  const commitRename = () => {
    const name = renameDraft.trim();
    if (name) {
      setFolders((prev) => prev.map((f) => (f.id === renamingFolderId ? { ...f, name } : f)));
    }
    setRenamingFolderId(null);
  };

  const deleteFolder = (folder) => {
    const { subCount, routineCount } = folderCounts(folder.id);
    if (subCount > 0 || routineCount > 0) {
      setFolderError(`"${folder.name}" isn't empty. Move or delete what's inside it first.`);
      setTimeout(() => setFolderError(""), 3500);
      return;
    }
    setFolders((prev) => prev.filter((f) => f.id !== folder.id));
  };

  const resetForm = () => {
    setForm({ name: "", tags: [], text: "", folderId: currentFolderId });
    setTagDraft("");
    setEditingId(null);
  };

  const openNewComposer = () => {
    resetForm();
    setShowComposer(true);
  };

  const openEdit = (routine) => {
    setForm({ name: routine.name, tags: [...(routine.tags || [])], text: routine.text || "", folderId: routine.folderId || null });
    setEditingId(routine.id);
    setShowComposer(true);
    setTagDraft("");
  };

  const addTagFromDraft = () => {
    const t = tagDraft.trim().toLowerCase();
    if (t && !form.tags.includes(t)) setForm((f) => ({ ...f, tags: [...f.tags, t] }));
    setTagDraft("");
  };

  const removeFormTag = (t) => setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }));

  const saveRoutine = () => {
    if (!form.name.trim()) return;
    if (editingId) {
      setRoutines((prev) => prev.map((r) => (r.id === editingId ? { ...r, ...form, name: form.name.trim() } : r)));
    } else {
      setRoutines((prev) => [{ id: uid(), ...form, name: form.name.trim() }, ...prev]);
    }
    setShowComposer(false);
    resetForm();
  };

  const deleteRoutine = (id) => setRoutines((prev) => prev.filter((r) => r.id !== id));

  const folderOptions = useMemo(() => {
    const opts = [{ id: null, label: "No folder (top level)" }];
    folders
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((f) => {
        const path = folderPath(folders, f.id).map((p) => p.name).join(" / ");
        opts.push({ id: f.id, label: path });
      });
    return opts;
  }, [folders]);

  return (
    <>
      <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 0.3 }}>Library</div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 0.2 }}>Routines</div>
          </div>
          <button onClick={openNewComposer} style={{ ...primaryBtnStyle, background: "var(--accent2)" }}>
            <Plus size={15} /> New routine
          </button>
        </div>

        <div style={{ position: "relative", marginBottom: 10 }}>
          <Search size={15} style={{ position: "absolute", left: 10, top: 10, color: "var(--text-dim)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search routines or tags…"
            style={{ ...inputStyle, padding: "9px 10px 9px 32px" }}
          />
        </div>

        {allTags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {allTags.map((t) => (
              <TagChip key={t} label={t} accent="--accent2" active={activeTags.includes(t)} onClick={() => toggleTagFilter(t)} />
            ))}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 18px" }}>
        {folderError && <div style={{ color: "var(--danger)", fontSize: 12, marginBottom: 10 }}>{folderError}</div>}

        {isFiltering ? (
          <>
            <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 10 }}>
              {filteredRoutines.length} result{filteredRoutines.length !== 1 ? "s" : ""}
            </div>
            {filteredRoutines.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--text-dim)", padding: "36px 10px", fontSize: 13 }}>
                Nothing matches that search or tag filter.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filteredRoutines.map((r) => (
                  <RoutineCard
                    key={r.id}
                    routine={r}
                    pathLabel={folderPath(folders, r.folderId).map((f) => f.name).join(" / ") || "Top level"}
                    isOpen={expanded === r.id}
                    onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
                    onEdit={() => openEdit(r)}
                    onDelete={() => deleteRoutine(r.id)}
                    onJump={() => {
                      setCurrentFolderId(r.folderId || null);
                      setSearch("");
                      setActiveTags([]);
                    }}
                    onTagClick={toggleTagFilter}
                    activeTags={activeTags}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <Breadcrumb path={breadcrumb} onNavigate={setCurrentFolderId} />

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {subfolders.map((f) => {
                const { subCount, routineCount } = folderCounts(f.id);
                const isRenaming = renamingFolderId === f.id;
                return (
                  <div key={f.id} style={{ ...cardStyle, padding: 10, display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      onClick={() => !isRenaming && setCurrentFolderId(f.id)}
                      style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, cursor: "pointer" }}
                    >
                      <div style={{ background: "var(--accent2-dim)", borderRadius: 8, padding: 7, display: "flex" }}>
                        <Folder size={16} color="var(--accent2)" />
                      </div>
                      {isRenaming ? (
                        <input
                          autoFocus
                          value={renameDraft}
                          onChange={(e) => setRenameDraft(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && commitRename()}
                          onBlur={commitRename}
                          onClick={(e) => e.stopPropagation()}
                          style={{ ...inputStyle, padding: "4px 8px" }}
                        />
                      ) : (
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{f.name}</div>
                          <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
                            {subCount > 0 ? `${subCount} folder${subCount !== 1 ? "s" : ""} · ` : ""}
                            {routineCount} routine{routineCount !== 1 ? "s" : ""}
                          </div>
                        </div>
                      )}
                    </div>
                    {!isRenaming && (
                      <div style={{ display: "flex", gap: 4 }}>
                        <IconBtn onClick={() => startRename(f)}>
                          <Pencil size={13} />
                        </IconBtn>
                        <IconBtn onClick={() => deleteFolder(f)} danger>
                          <Trash2 size={13} />
                        </IconBtn>
                      </div>
                    )}
                    <ChevronRight size={15} color="var(--text-dim)" onClick={() => !isRenaming && setCurrentFolderId(f.id)} style={{ cursor: "pointer" }} />
                  </div>
                );
              })}

              {addingFolder ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    autoFocus
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && createFolder()}
                    placeholder="Folder name"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button onClick={createFolder} style={secondaryBtnStyle}>
                    Add
                  </button>
                  <IconBtn onClick={() => setAddingFolder(false)}>
                    <X size={14} />
                  </IconBtn>
                </div>
              ) : (
                <button onClick={() => setAddingFolder(true)} style={{ ...ghostLinkStyle, marginTop: 2 }}>
                  <FolderPlus size={14} /> New folder here
                </button>
              )}
            </div>

            {routinesInFolder.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--text-dim)", padding: "24px 10px", fontSize: 13 }}>
                {routines.length === 0 && folders.length === 0
                  ? 'No routines yet. Tap "New routine" or add a folder to start organizing your library.'
                  : "No routines directly in this folder."}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {routinesInFolder.map((r) => (
                  <RoutineCard
                    key={r.id}
                    routine={r}
                    isOpen={expanded === r.id}
                    onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
                    onEdit={() => openEdit(r)}
                    onDelete={() => deleteRoutine(r.id)}
                    onTagClick={toggleTagFilter}
                    activeTags={activeTags}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showComposer && (
        <EntryComposer
          title={editingId ? "Edit routine" : "New routine"}
          form={form}
          setForm={setForm}
          tagDraft={tagDraft}
          setTagDraft={setTagDraft}
          onAddTag={addTagFromDraft}
          onRemoveTag={removeFormTag}
          onSave={saveRoutine}
          onClose={() => {
            setShowComposer(false);
            resetForm();
          }}
          showName
          showFolder
          folderOptions={folderOptions}
          textLabel="Routine details"
          textPlaceholder="Warm-up, then A1) Back squat 5x5, A2) Romanian deadlift 4x8, B1) Walking lunges..., finish with core circuit..."
          saveLabel={editingId ? "Save changes" : "Save routine"}
          accent="--accent2"
        />
      )}
    </>
  );
}
