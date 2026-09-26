import { useState, useMemo } from "react";
import { Plus, FolderPlus, X } from "lucide-react";
import { newRecord, editById } from "../lib/records.js";
import { folderPath } from "../lib/folders.js";
import { matchesSearch, folderItemSearchFields, exerciseNameMap } from "../lib/search.js";
import Breadcrumb from "../ui/Breadcrumb.jsx";
import TagChip from "../ui/TagChip.jsx";
import IconBtn from "../ui/IconBtn.jsx";
import FolderItemEditor from "./FolderItemEditor.jsx";
import GiModeToggle from "../ui/GiModeToggle.jsx";
import SearchBox from "../ui/SearchBox.jsx";
import SegmentedToggle from "../ui/SegmentedToggle.jsx";
import LibraryItemCard from "./LibraryItemCard.jsx";
import PickBar from "../ui/PickBar.jsx";
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
  // usageSummary for its card, what tapping the card does (onOpenItem(item),
  // e.g. open its summary sheet), and a sentence added to the delete
  // confirmation (e.g. "Used in 8 sessions.").
  usageFor,
  onOpenItem,
  deleteWarningFor,
  // Opens the page for picking items into an entry (see PagePicker):
  // { addedIds, chosen, onAdd(item), onRemove(id), onDone, initialQuery }. Everything works as
  // usual, except each card gets an Add button, deleting items and folders
  // is hidden (so the entry can't end up linking something deleted), a bar
  // with Done sits on top, the search starts from what was typed in the
  // entry's field, and a new item starts with that name and is added to the
  // entry once saved.
  pick,
}) {
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [search, setSearch] = useState(pick?.initialQuery || "");
  const [searchMatchMode, setSearchMatchMode] = useState("all"); // "all" or "any" of the typed words
  const [activeTags, setActiveTags] = useState([]);
  const [tagMatchMode, setTagMatchMode] = useState("all"); // "all" (AND) or "any" (OR)
  const [giMode, setGiMode] = useState("gi");
  const [expanded, setExpanded] = useState(null);
  // The new/edit form: null when closed, else { item } to edit or
  // { defaults } to create (see FolderItemEditor).
  const [composer, setComposer] = useState(null);
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

  const openNewComposer = () =>
    // Picking and couldn't find it: start the new item from the search.
    setComposer({ defaults: { folderId: currentFolderId, name: pick ? search.trim() : "" } });

  const openEdit = (item) => setComposer({ item });

  // Returns whether it was deleted (the confirmation can be cancelled).
  const deleteItem = (id) => {
    const warning = deleteWarningFor ? deleteWarningFor(items.find((r) => r.id === id)) : "";
    if (!window.confirm(`Delete this ${itemNoun}?${warning ? ` ${warning}` : ""} This can't be undone.`)) return false;
    setItems((prev) => prev.filter((r) => r.id !== id));
    return true;
  };

  const toggleStar = (id) => setItems((prev) => editById(prev, id, { starred: !prev.find((r) => r.id === id)?.starred }));

  return (
    <>
      {pick && (
        <PickBar
          noun={`${itemNoun}s`}
          onDone={pick.onDone}
          accent={accent}
          chosen={pick.chosen}
          onRemove={pick.onRemove}
          onOpen={(id) => {
            const r = items.find((x) => x.id === id);
            if (r && onOpenItem) onOpenItem(r);
          }}
        />
      )}
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
                    onDelete={pick ? undefined : () => deleteItem(r.id)}
                    onAdd={pick ? () => pick.onAdd(r) : undefined}
                    onRemove={pick ? () => pick.onRemove(r.id) : undefined}
                    added={pick ? pick.addedIds.includes(r.id) : false}
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
                    onDelete={pick ? undefined : () => deleteFolder(f)}
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
                    onDelete={pick ? undefined : () => deleteItem(r.id)}
                    onAdd={pick ? () => pick.onAdd(r) : undefined}
                    onRemove={pick ? () => pick.onRemove(r.id) : undefined}
                    added={pick ? pick.addedIds.includes(r.id) : false}
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

      {composer && (
        <FolderItemEditor
          item={composer.item}
          defaults={composer.defaults}
          items={items}
          setItems={setItems}
          folders={folders}
          config={{ itemNoun, namePlaceholder, textLabel, textPlaceholder, accent, showPositions, showStar, showGiOnly, showExercises }}
          exercises={exercises}
          exerciseUsage={exerciseUsage}
          // Created while picking for an entry: that's what it's for.
          onSaved={(saved) => {
            if (!composer.item && pick) pick.onAdd(saved);
          }}
          onClose={() => setComposer(null)}
        />
      )}
    </>
  );
}
