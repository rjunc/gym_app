import { useState, useMemo } from "react";
import { Plus, FolderPlus, SearchX, BookOpen } from "lucide-react";
import { editById } from "../lib/records.js";
import { folderPath } from "../lib/folders.js";
import { matchesSearch, folderItemSearchFields, exerciseNameMap } from "../lib/search.js";
import FolderItemEditor from "./FolderItemEditor.jsx";
import GiModeToggle from "../ui/GiModeToggle.jsx";
import SearchBox, { TagsToggle } from "../ui/SearchBox.jsx";
import TagFilter from "../ui/TagFilter.jsx";
import { PageHeader, PageBody } from "../ui/Page.jsx";
import EmptyState from "../ui/EmptyState.jsx";
import LibraryItemCard from "./LibraryItemCard.jsx";
import SetsSummary from "../ui/SetsSummary.jsx";
import PickBar from "../ui/PickBar.jsx";
import FolderBrowser from "./FolderBrowser.jsx";
import { primaryBtnStyle, secondaryBtnStyle, metaStyle } from "../ui/styles.js";

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
  // Routines: the exercises are a plan of blocks (see FolderItemEditor), and
  // each card shows it in brief (see SetsSummary). `history` is the sessions,
  // for the editor's "Last" lines.
  showBlocks = false,
  history = [],
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
  const [tagsOpen, setTagsOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);
  // The new/edit form: null when closed, else { item } to edit or
  // { defaults } to create (see FolderItemEditor).
  const [composer, setComposer] = useState(null);
  const [addingFolder, setAddingFolder] = useState(false);

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

  const hasSubfolders = folders.some((f) => (f.parentId || null) === currentFolderId);

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

  const countItems = (folderId) => visibleItems.filter((r) => (r.folderId || null) === folderId).length;

  const toggleTagFilter = (t) => setActiveTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

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
      <PageHeader
        eyebrow={eyebrow}
        title={heading}
        hideMenu={!!pick}
        actions={
          <button onClick={openNewComposer} style={{ ...primaryBtnStyle, background: `var(${accent})` }} aria-label={`New ${itemNoun}`}>
            <Plus size={16} /> New
          </button>
        }
      >
        {(items.length > 0 || folders.length > 0) && (
          <>
            <SearchBox
              value={search}
              setValue={setSearch}
              matchMode={searchMatchMode}
              setMatchMode={setSearchMatchMode}
              placeholder={searchPlaceholder}
              accent={accent}
              trailing={visibleItems.some((r) => (r.tags || []).length > 0) && <TagsToggle open={tagsOpen} count={activeTags.length} onClick={() => setTagsOpen((v) => !v)} accent={accent} />}
            />
            <TagFilter
              entries={visibleItems}
              activeTags={activeTags}
              onToggle={toggleTagFilter}
              matchMode={tagMatchMode}
              setMatchMode={setTagMatchMode}
              accent={accent}
              collapsed={!tagsOpen}
            />
          </>
        )}
        {showGiOnly && (
          <div>
            <GiModeToggle mode={giMode} setMode={setGiMode} accent={accent} />
          </div>
        )}
      </PageHeader>

      <PageBody>
        {isFiltering ? (
          <>
            <div style={{ ...metaStyle, padding: "0 2px" }}>
              {filteredItems.length} result{filteredItems.length !== 1 ? "s" : ""}
            </div>
            {filteredItems.length === 0 ? (
              <EmptyState icon={SearchX} title="No matches">
                Nothing matches that search or tag filter.
                {giMode === "no-gi" && hiddenGiOnlyCount > 0 && (
                  <div style={{ marginTop: 6 }}>
                    ({hiddenGiOnlyCount} gi-only {itemNoun}
                    {hiddenGiOnlyCount !== 1 ? "s" : ""} hidden in No-Gi mode)
                  </div>
                )}
              </EmptyState>
            ) : (
              filteredItems.map((r) => (
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
                  summary={showBlocks ? <SetsSummary entry={r} exerciseNameById={exerciseNameById} accent={accent} includeEmpty style={{ marginTop: 10 }} /> : undefined}
                />
              ))
            )}
          </>
        ) : items.length === 0 && folders.length === 0 && !addingFolder ? (
          <EmptyState
            icon={BookOpen}
            title={`No ${itemNoun}s yet`}
            action={
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                <button onClick={openNewComposer} style={{ ...primaryBtnStyle, background: `var(${accent})` }}>
                  <Plus size={16} /> New {itemNoun}
                </button>
                <button onClick={() => setAddingFolder(true)} style={secondaryBtnStyle}>
                  <FolderPlus size={15} /> New folder
                </button>
              </div>
            }
          >
            {emptyLabel}
          </EmptyState>
        ) : (
          <>
            <FolderBrowser
              folders={folders}
              setFolders={setFolders}
              currentFolderId={currentFolderId}
              onNavigate={setCurrentFolderId}
              items={items}
              countItems={countItems}
              itemNoun={itemNoun}
              accent={accent}
              addingFolder={addingFolder}
              setAddingFolder={setAddingFolder}
              canDelete={!pick}
            />

            {itemsInFolder.length === 0 ? (
              // At the top level, folders are the point; only say so when
              // there's nothing else here.
              (currentFolderId !== null || !hasSubfolders) && <div style={{ textAlign: "center", color: "var(--text-dim)", padding: "24px 10px", fontSize: 13 }}>
                No {itemNoun}s directly in this folder.
                {giMode === "no-gi" && hiddenGiOnlyCount > 0 && (
                  <div style={{ marginTop: 6 }}>
                    ({hiddenGiOnlyCount} gi-only {itemNoun}
                    {hiddenGiOnlyCount !== 1 ? "s" : ""} hidden in No-Gi mode)
                  </div>
                )}
              </div>
            ) : (
              itemsInFolder.map((r) => (
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
                  summary={showBlocks ? <SetsSummary entry={r} exerciseNameById={exerciseNameById} accent={accent} includeEmpty style={{ marginTop: 10 }} /> : undefined}
                />
              ))
            )}
          </>
        )}
      </PageBody>

      {composer && (
        <FolderItemEditor
          item={composer.item}
          defaults={composer.defaults}
          items={items}
          setItems={setItems}
          folders={folders}
          config={{ itemNoun, namePlaceholder, textLabel, textPlaceholder, accent, showPositions, showStar, showGiOnly, showExercises, showBlocks }}
          exercises={exercises}
          exerciseUsage={exerciseUsage}
          history={history}
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
