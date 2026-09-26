import { useState, useMemo } from "react";
import { Plus, FolderPlus, X } from "lucide-react";
import { todayISO } from "../lib/id.js";
import { newRecord, editById } from "../lib/records.js";
import { folderPath } from "../lib/folders.js";
import { matchesSearch, folderItemSearchFields, exerciseNameMap } from "../lib/search.js";
import { cleanFields } from "../lib/text.js";
import { collectPositions } from "../lib/positions.js";
import { tagUsage, addTagsFromDraft } from "../lib/tags.js";
import Breadcrumb from "../ui/Breadcrumb.jsx";
import TagChip from "../ui/TagChip.jsx";
import IconBtn from "../ui/IconBtn.jsx";
import EntryComposer from "../ui/EntryComposer.jsx";
import GiModeToggle from "../ui/GiModeToggle.jsx";
import SearchBox from "../ui/SearchBox.jsx";
import SegmentedToggle from "../ui/SegmentedToggle.jsx";
import LibraryItemCard from "./LibraryItemCard.jsx";
import FolderRow from "./FolderRow.jsx";
import { inputStyle, primaryBtnStyle, secondaryBtnStyle, ghostLinkStyle } from "../ui/styles.js";

// Routines and Techniques are both a foldered library of named, tagged text
// items — no dates. Both tabs are thin wrappers around this.
export default function FolderLibraryTab({
  items,
  setItems,
  folders,
  setFolders,
  eyebrow,
  heading,
  itemNoun,
  searchPlaceholder,
  emptyLabel,
  namePlaceholder,
  textLabel,
  textPlaceholder,
  accent = "--accent2",
  showPositions = false,
  showStar = false,
  showGiOnly = false,
  showExercises = false,
  exercises = [],
  // Session usage counts (exerciseUsageCounts) that rank the Exercises picker.
  exerciseUsage,
  // Optional, for items that dated entries link to (routines): the item's
  // usageSummary for its card, what tapping the card does, and a sentence
  // added to the delete confirmation (e.g. "Used in 8 sessions.").
  usageFor,
  onOpenItem,
  deleteWarningFor,
}) {
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [search, setSearch] = useState("");
  const [searchMatchMode, setSearchMatchMode] = useState("all"); // "all" or "any" of the typed words
  const [activeTags, setActiveTags] = useState([]);
  const [tagMatchMode, setTagMatchMode] = useState("all"); // "all" (AND) or "any" (OR)
  const [giMode, setGiMode] = useState("gi");
  const [expanded, setExpanded] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showComposer, setShowComposer] = useState(false);
  const [form, setForm] = useState({
    name: "",
    tags: [],
    text: "",
    folderId: null,
    position: "",
    toPosition: "",
    starred: false,
    giOnly: false,
    ...(showExercises ? { exerciseIds: [] } : {}),
  });
  const [tagDraft, setTagDraft] = useState("");
  const tagSuggestions = useMemo(() => tagUsage(items, todayISO()), [items]);
  const [newFolderName, setNewFolderName] = useState("");
  const [addingFolder, setAddingFolder] = useState(false);
  const [folderError, setFolderError] = useState("");
  const [renamingFolderId, setRenamingFolderId] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");

  const isFiltering = search.trim() !== "" || activeTags.length > 0;

  // In No-Gi mode, anything marked giOnly is hidden everywhere in this tab —
  // browsing, folder counts, search — since it simply doesn't apply.
  const visibleItems = useMemo(
    () => (showGiOnly && giMode === "no-gi" ? items.filter((r) => !r.giOnly) : items),
    [items, showGiOnly, giMode]
  );
  const hiddenGiOnlyCount = items.length - visibleItems.length;

  // Starred items always sort first; everything else keeps alphabetical
  // order below them.
  const byStarThenName = (a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0) || a.name.localeCompare(b.name);

  const allTags = useMemo(() => {
    const set = new Set();
    visibleItems.forEach((r) => (r.tags || []).forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [visibleItems]);

  const subfolders = useMemo(
    () => folders.filter((f) => (f.parentId || null) === currentFolderId).sort((a, b) => a.name.localeCompare(b.name)),
    [folders, currentFolderId]
  );

  const itemsInFolder = useMemo(
    () => visibleItems.filter((r) => (r.folderId || null) === currentFolderId).sort(byStarThenName),
    [visibleItems, currentFolderId]
  );

  const exerciseNameById = useMemo(() => exerciseNameMap(exercises), [exercises]);

  const filteredItems = useMemo(() => {
    return visibleItems
      .filter((r) => {
        const matchesText = matchesSearch(folderItemSearchFields(r, folders, exerciseNameById), search, searchMatchMode);
        const matchesTags =
          activeTags.length === 0 ||
          (tagMatchMode === "any"
            ? activeTags.some((t) => (r.tags || []).includes(t))
            : activeTags.every((t) => (r.tags || []).includes(t)));
        return matchesText && matchesTags;
      })
      .sort(byStarThenName);
  }, [visibleItems, search, searchMatchMode, folders, exerciseNameById, activeTags, tagMatchMode]);

  const breadcrumb = folderPath(folders, currentFolderId);

  const folderCounts = (folderId) => {
    const subCount = folders.filter((f) => (f.parentId || null) === folderId).length;
    const itemCount = visibleItems.filter((r) => (r.folderId || null) === folderId).length;
    return { subCount, itemCount };
  };

  const toggleTagFilter = (t) => setActiveTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const createFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    setFolders((prev) => [...prev, newRecord({ name, parentId: currentFolderId })]);
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
      setFolders((prev) => editById(prev, renamingFolderId, { name }));
    }
    setRenamingFolderId(null);
  };

  const deleteFolder = (folder) => {
    const { subCount, itemCount } = folderCounts(folder.id);
    if (subCount > 0 || itemCount > 0) {
      setFolderError(`"${folder.name}" isn't empty. Move or delete what's inside it first.`);
      setTimeout(() => setFolderError(""), 3500);
      return;
    }
    if (!window.confirm(`Delete the folder "${folder.name}"? This can't be undone.`)) return;
    setFolders((prev) => prev.filter((f) => f.id !== folder.id));
  };

  const resetForm = () => {
    setForm({
      name: "",
      tags: [],
      text: "",
      folderId: currentFolderId,
      position: "",
      toPosition: "",
      starred: false,
      giOnly: false,
      ...(showExercises ? { exerciseIds: [] } : {}),
    });
    setTagDraft("");
    setEditingId(null);
  };

  const openNewComposer = () => {
    resetForm();
    setShowComposer(true);
  };

  const openEdit = (item) => {
    setForm({
      name: item.name,
      tags: [...(item.tags || [])],
      text: item.text || "",
      folderId: item.folderId || null,
      position: item.position || "",
      toPosition: item.toPosition || "",
      starred: !!item.starred,
      giOnly: !!item.giOnly,
      ...(showExercises ? { exerciseIds: [...(item.exerciseIds || [])] } : {}),
    });
    setEditingId(item.id);
    setShowComposer(true);
    setTagDraft("");
  };

  const addTagFromDraft = () => {
    setForm((f) => ({ ...f, tags: addTagsFromDraft(f.tags, tagDraft) }));
    setTagDraft("");
  };

  const removeFormTag = (t) => setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }));

  const saveItem = () => {
    const fields = cleanFields(form);
    if (!fields.name) return;
    if (editingId) {
      setItems((prev) => editById(prev, editingId, fields));
    } else {
      setItems((prev) => [newRecord(fields), ...prev]);
    }
    setShowComposer(false);
    resetForm();
  };

  const deleteItem = (id) => {
    const warning = deleteWarningFor ? deleteWarningFor(items.find((r) => r.id === id)) : "";
    if (!window.confirm(`Delete this ${itemNoun}?${warning ? ` ${warning}` : ""} This can't be undone.`)) return;
    setItems((prev) => prev.filter((r) => r.id !== id));
  };

  const toggleStar = (id) => setItems((prev) => editById(prev, id, { starred: !prev.find((r) => r.id === id)?.starred }));

  const positionOptions = useMemo(() => (showPositions ? collectPositions(items) : []), [items, showPositions]);

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
            <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 0.3 }}>{eyebrow}</div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 0.2 }}>{heading}</div>
          </div>
          <button onClick={openNewComposer} style={{ ...primaryBtnStyle, background: `var(${accent})` }}>
            <Plus size={15} /> New {itemNoun}
          </button>
        </div>

        {showGiOnly && (
          <div style={{ marginBottom: 10 }}>
            <GiModeToggle mode={giMode} setMode={setGiMode} accent={accent} />
          </div>
        )}

        <SearchBox
          value={search}
          setValue={setSearch}
          matchMode={searchMatchMode}
          setMatchMode={setSearchMatchMode}
          placeholder={searchPlaceholder}
          accent={accent}
        />

        {allTags.length > 0 && (
          // Capped and independently scrollable so a large tag vocabulary
          // browses its own list instead of pushing folders/items below out
          // of view — this container sits in a fixed-height shell with no
          // page-level scroll, so an unbounded chip cloud would strand
          // everything under it.
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 88, overflowY: "auto" }}>
            {allTags.map((t) => (
              <TagChip key={t} label={t} accent={accent} active={activeTags.includes(t)} onClick={() => toggleTagFilter(t)} />
            ))}
          </div>
        )}

        {activeTags.length > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Match:</span>
            <SegmentedToggle
              options={[
                { key: "all", label: "All tags" },
                { key: "any", label: "Any tag" },
              ]}
              value={tagMatchMode}
              setValue={setTagMatchMode}
              accent={accent}
            />
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 18px" }}>
        {folderError && <div style={{ color: "var(--danger)", fontSize: 12, marginBottom: 10 }}>{folderError}</div>}

        {isFiltering ? (
          <>
            <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 10 }}>
              {filteredItems.length} result{filteredItems.length !== 1 ? "s" : ""}
            </div>
            {filteredItems.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--text-dim)", padding: "36px 10px", fontSize: 13 }}>
                Nothing matches that search or tag filter.
                {giMode === "no-gi" && hiddenGiOnlyCount > 0 && (
                  <div style={{ marginTop: 6 }}>
                    ({hiddenGiOnlyCount} gi-only {itemNoun}
                    {hiddenGiOnlyCount !== 1 ? "s" : ""} hidden in No-Gi mode)
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filteredItems.map((r) => (
                  <LibraryItemCard
                    key={r.id}
                    item={r}
                    accent={accent}
                    pathLabel={folderPath(folders, r.folderId).map((f) => f.name).join(" / ") || "Top level"}
                    isOpen={expanded === r.id}
                    onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
                    onEdit={() => openEdit(r)}
                    onDelete={() => deleteItem(r.id)}
                    onJump={() => {
                      setCurrentFolderId(r.folderId || null);
                      setSearch("");
                      setActiveTags([]);
                    }}
                    onTagClick={toggleTagFilter}
                    activeTags={activeTags}
                    onToggleStar={showStar ? () => toggleStar(r.id) : undefined}
                    usage={usageFor ? usageFor(r) : undefined}
                    onOpen={onOpenItem ? () => onOpenItem(r) : undefined}
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
                const { subCount, itemCount } = folderCounts(f.id);
                const isRenaming = renamingFolderId === f.id;
                return (
                  <FolderRow
                    key={f.id}
                    folder={f}
                    subCount={subCount}
                    itemCount={itemCount}
                    itemNoun={itemNoun}
                    accent={accent}
                    isRenaming={isRenaming}
                    renameDraft={renameDraft}
                    setRenameDraft={setRenameDraft}
                    onOpen={() => setCurrentFolderId(f.id)}
                    onStartRename={() => startRename(f)}
                    onCommitRename={commitRename}
                    onDelete={() => deleteFolder(f)}
                  />
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

            {itemsInFolder.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--text-dim)", padding: "24px 10px", fontSize: 13 }}>
                {items.length === 0 && folders.length === 0 ? emptyLabel : `No ${itemNoun}s directly in this folder.`}
                {giMode === "no-gi" && hiddenGiOnlyCount > 0 && (
                  <div style={{ marginTop: 6 }}>
                    ({hiddenGiOnlyCount} gi-only {itemNoun}
                    {hiddenGiOnlyCount !== 1 ? "s" : ""} hidden in No-Gi mode)
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {itemsInFolder.map((r) => (
                  <LibraryItemCard
                    key={r.id}
                    item={r}
                    accent={accent}
                    isOpen={expanded === r.id}
                    onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
                    onEdit={() => openEdit(r)}
                    onDelete={() => deleteItem(r.id)}
                    onTagClick={toggleTagFilter}
                    activeTags={activeTags}
                    onToggleStar={showStar ? () => toggleStar(r.id) : undefined}
                    usage={usageFor ? usageFor(r) : undefined}
                    onOpen={onOpenItem ? () => onOpenItem(r) : undefined}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showComposer && (
        <EntryComposer
          title={editingId ? `Edit ${itemNoun}` : `New ${itemNoun}`}
          form={form}
          setForm={setForm}
          tagDraft={tagDraft}
          setTagDraft={setTagDraft}
          onAddTag={addTagFromDraft}
          onRemoveTag={removeFormTag}
          onSave={saveItem}
          onClose={() => {
            setShowComposer(false);
            resetForm();
          }}
          showName
          namePlaceholder={namePlaceholder}
          showFolder
          folderOptions={folderOptions}
          showPositions={showPositions}
          positionOptions={positionOptions}
          showStar={showStar}
          showGiOnly={showGiOnly}
          showExercises={showExercises}
          exerciseOptions={exercises}
          exerciseUsage={exerciseUsage}
          textLabel={textLabel}
          textPlaceholder={textPlaceholder}
          saveLabel={editingId ? "Save changes" : `Save ${itemNoun}`}
          tagSuggestions={tagSuggestions}
          accent={accent}
        />
      )}
    </>
  );
}
