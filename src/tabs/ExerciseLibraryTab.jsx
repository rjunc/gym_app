import { useState, useMemo } from "react";
import { Plus, FolderPlus, Layers, SearchX } from "lucide-react";
import { matchesTags } from "../lib/activity.js";
import { entriesByExercise, exerciseDeleteWarning } from "../lib/exercises.js";
import { matchesSearch, exerciseSearchFields } from "../lib/search.js";
import { folderPath } from "../lib/folders.js";
import { useSheets } from "../lib/SheetStack.js";
import TagChip from "../ui/TagChip.jsx";
import TagFilter from "../ui/TagFilter.jsx";
import SearchBox, { TagsToggle } from "../ui/SearchBox.jsx";
import { PageHeader, PageBody } from "../ui/Page.jsx";
import EmptyState from "../ui/EmptyState.jsx";
import SegmentedToggle from "../ui/SegmentedToggle.jsx";
import ExerciseCard from "./ExerciseCard.jsx";
import ExerciseEditor from "./ExerciseEditor.jsx";
import FolderBrowser from "./FolderBrowser.jsx";
import PickBar from "../ui/PickBar.jsx";
import { primaryBtnStyle, secondaryBtnStyle, metaStyle } from "../ui/styles.js";

const ACCENT = "--accent2"; // matches Routines/Techniques, the other library-style tabs

// Every exercise you know, filed in folders (their own tree, exerciseFolders)
// so the list is easy to browse: the page shows one folder at a time, like
// Routines and Techniques. Searching, filtering by tag or showing untagged
// ones lists matches from every folder at once, each with its folder path.
// The Active/All/Inactive toggle applies to both.
// A folder puts an exercise in one place, but one exercise (e.g. a kettlebell
// swing) can belong under several categories (strength AND cardio) at once,
// so tags are still the categories: a future routine builder can pick "a
// random mobility exercise, a random strength exercise, a random cardio
// exercise" straight off this list by querying tags, which is why the tag
// vocabulary here is worth keeping clean (reuse existing tags via the
// suggestions below rather than typing near-duplicates).
//
// `pick` opens the page for picking exercises into an entry (see PagePicker):
// { addedIds, chosen, onAdd(exercise), onRemove(id), onDone, initialQuery }. The page works exactly
// as usual, except each card gets an Add button, Delete is hidden (so the
// entry can't end up linking a deleted exercise), a bar with Done sits on
// top, the search starts from what was typed in the entry's field, and a new
// exercise starts with that name and is added to the entry once saved.
// Tapping an exercise opens its summary sheet on the app's sheet stack (see
// SheetStack).
export default function ExerciseLibraryTab({ exercises, setExercises, folders = [], setFolders, sessions = [], journals = [], routines = [], pick }) {
  const sheets = useSheets();
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [addingFolder, setAddingFolder] = useState(false);
  const [search, setSearch] = useState(pick?.initialQuery || "");
  const [searchMatchMode, setSearchMatchMode] = useState("all"); // "all" or "any" of the typed words
  const [activeTags, setActiveTags] = useState([]);
  const [tagMatchMode, setTagMatchMode] = useState("all");
  const [status, setStatus] = useState("active"); // "active" | "inactive" | "all"
  // A quick way to find exercises a future random-pick builder could never
  // select, because they have no category tag to be found by.
  const [untaggedOnly, setUntaggedOnly] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);
  // The new/edit form: null when closed, else { exercise } to edit or
  // { initialName } to create (see ExerciseEditor).
  const [composer, setComposer] = useState(null);
  const untaggedCount = useMemo(() => exercises.filter((e) => (e.tags || []).length === 0).length, [exercises]);

  // Backlinks for "which sessions/journal entries/routines use this
  // exercise", keyed by exercise id.
  const sessionsByExercise = useMemo(() => entriesByExercise(sessions), [sessions]);
  const journalsByExercise = useMemo(() => entriesByExercise(journals), [journals]);
  const routinesByExercise = useMemo(() => entriesByExercise(routines), [routines]);
  const openSheet = (id) => sheets.open({ kind: "exercise", id, ...(pick ? { hideDelete: true } : {}) });

  const isFiltering = search.trim() !== "" || activeTags.length > 0 || untaggedOnly;

  // Active first, then by name.
  const byStatusThenName = (a, b) => (a.active === false ? 1 : 0) - (b.active === false ? 1 : 0) || (a.name || "").localeCompare(b.name || "");

  // The status toggle applies everywhere on the page: browsing, folder
  // counts and search results.
  const shown = useMemo(
    () => exercises.filter((e) => status === "all" || (status === "active" ? e.active !== false : e.active === false)),
    [exercises, status]
  );

  const inFolder = useMemo(
    () => shown.filter((e) => (e.folderId || null) === currentFolderId).sort(byStatusThenName),
    [shown, currentFolderId]
  );

  const filtered = useMemo(() => {
    return shown
      .filter((e) => {
        const matchesText = matchesSearch(exerciseSearchFields(e, folders), search, searchMatchMode);
        // Untagged mode is its own filter — an untagged exercise can never
        // match a tag filter, so the two would otherwise always empty the list.
        const matchesTagScope = untaggedOnly ? (e.tags || []).length === 0 : matchesTags(e.tags, activeTags, tagMatchMode);
        return matchesText && matchesTagScope;
      })
      .sort(byStatusThenName);
  }, [shown, folders, search, searchMatchMode, activeTags, tagMatchMode, untaggedOnly]);

  const countItems = (folderId) => shown.filter((e) => (e.folderId || null) === folderId).length;
  const statusWord = status === "all" ? "" : `${status} `;

  // Picking and couldn't find it: start the new exercise from the search.
  // A new exercise goes in the folder being shown.
  const openNewComposer = () => setComposer({ initialName: pick ? search.trim() : "", folderId: currentFolderId });

  const openEdit = (exercise) => setComposer({ exercise });

  const deleteExercise = (id) => {
    const warning = exerciseDeleteWarning(id, sessions, journals, routines);
    if (!window.confirm(`Delete this exercise?${warning} This can't be undone.`)) return false;
    setExercises((prev) => prev.filter((e) => e.id !== id));
    return true;
  };

  const toggleTagFilter = (t) => setActiveTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  // What every exercise card gets, browsing or searching.
  const cardProps = (e) => ({
    exercise: e,
    accent: ACCENT,
    isOpen: expanded === e.id,
    onToggle: () => setExpanded(expanded === e.id ? null : e.id),
    onEdit: () => openEdit(e),
    onDelete: pick ? undefined : () => deleteExercise(e.id),
    onAdd: pick ? () => pick.onAdd(e) : undefined,
    onRemove: pick ? () => pick.onRemove(e.id) : undefined,
    added: pick ? pick.addedIds.includes(e.id) : false,
    onOpen: () => openSheet(e.id),
    activeTags,
    onTagClick: toggleTagFilter,
    usedInSessions: sessionsByExercise.get(e.id) || [],
    usedInJournals: journalsByExercise.get(e.id) || [],
    usedInRoutines: routinesByExercise.get(e.id) || [],
  });

  return (
    <>
      {pick && (
        <PickBar noun="exercises" onDone={pick.onDone} accent={ACCENT} chosen={pick.chosen} onRemove={pick.onRemove} onOpen={openSheet} />
      )}
      <PageHeader
        eyebrow="Lifting"
        title="Exercises"
        hideMenu={!!pick}
        actions={
          <button onClick={openNewComposer} style={{ ...primaryBtnStyle, background: `var(${ACCENT})` }} aria-label="New exercise">
            <Plus size={16} /> New
          </button>
        }
      >
        <SearchBox
          value={search}
          setValue={setSearch}
          matchMode={searchMatchMode}
          setMatchMode={setSearchMatchMode}
          placeholder="Search text, tags, folders, prescription…"
          accent={ACCENT}
          trailing={!untaggedOnly && exercises.some((e) => (e.tags || []).length > 0) && <TagsToggle open={tagsOpen} count={activeTags.length} onClick={() => setTagsOpen((v) => !v)} accent={ACCENT} />}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <SegmentedToggle
            options={[
              { key: "active", label: "Active" },
              { key: "all", label: "All" },
              { key: "inactive", label: "Inactive" },
            ]}
            value={status}
            setValue={setStatus}
            accent={ACCENT}
          />
          {untaggedCount > 0 && (
            <TagChip label={`Untagged · ${untaggedCount}`} accent="--danger" active={untaggedOnly} onClick={() => setUntaggedOnly((v) => !v)} />
          )}
        </div>

        {!untaggedOnly && (
          <TagFilter
            entries={exercises}
            activeTags={activeTags}
            onToggle={toggleTagFilter}
            matchMode={tagMatchMode}
            setMatchMode={setTagMatchMode}
            accent={ACCENT}
            collapsed={!tagsOpen}
          />
        )}
      </PageHeader>

      <PageBody>
        {exercises.length === 0 && folders.length === 0 && !addingFolder ? (
          <EmptyState
            icon={Layers}
            title="No exercises yet"
            action={
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                <button onClick={openNewComposer} style={{ ...primaryBtnStyle, background: `var(${ACCENT})` }}>
                  <Plus size={16} /> New exercise
                </button>
                <button onClick={() => setAddingFolder(true)} style={secondaryBtnStyle}>
                  <FolderPlus size={15} /> New folder
                </button>
              </div>
            }
          >
            Add the exercises you do, tagged by what they train and filed in folders, so sessions and routines can link to them.
          </EmptyState>
        ) : isFiltering ? (
          <>
            <div style={{ ...metaStyle, padding: "0 2px" }}>
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </div>
            {filtered.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title="No matches"
                action={
                  <button
                    onClick={() => {
                      setSearch("");
                      setActiveTags([]);
                      setUntaggedOnly(false);
                      setStatus("all");
                    }}
                    style={secondaryBtnStyle}
                  >
                    Clear filters
                  </button>
                }
              >
                Nothing matches the current search or filters.
              </EmptyState>
            ) : (
              filtered.map((e) => (
                <ExerciseCard
                  key={e.id}
                  {...cardProps(e)}
                  pathLabel={folderPath(folders, e.folderId).map((f) => f.name).join(" / ") || "Top level"}
                  onJump={() => {
                    setCurrentFolderId(e.folderId || null);
                    setSearch("");
                    setActiveTags([]);
                    setUntaggedOnly(false);
                  }}
                />
              ))
            )}
          </>
        ) : (
          <>
            <FolderBrowser
              folders={folders}
              setFolders={setFolders}
              currentFolderId={currentFolderId}
              onNavigate={setCurrentFolderId}
              items={exercises}
              countItems={countItems}
              itemNoun="exercise"
              accent={ACCENT}
              addingFolder={addingFolder}
              setAddingFolder={setAddingFolder}
              canDelete={!pick}
            />
            {inFolder.length === 0
              ? // At the top level, folders are the point; only say so when
                // there's nothing else here.
                (currentFolderId !== null || !folders.some((f) => !f.parentId)) && (
                  <div style={{ textAlign: "center", color: "var(--text-dim)", padding: "24px 10px", fontSize: 13 }}>No {statusWord}exercises directly in this folder.</div>
                )
              : inFolder.map((e) => (
                  <ExerciseCard key={e.id} {...cardProps(e)} />
                ))}
          </>
        )}
      </PageBody>

      {composer && (
        <ExerciseEditor
          exercise={composer.exercise}
          initialName={composer.initialName}
          initialFolderId={composer.folderId}
          exercises={exercises}
          folders={folders}
          setExercises={setExercises}
          // Created while picking for an entry: that's what it's for.
          onSaved={(saved) => {
            if (!composer.exercise && pick) pick.onAdd(saved);
          }}
          onClose={() => setComposer(null)}
        />
      )}
    </>
  );
}
