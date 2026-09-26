import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { todayISO } from "../lib/id.js";
import { newRecord, editById } from "../lib/records.js";
import { DEFAULT_MEASURE, measureOf } from "../lib/sets.js";
import { matchesTags } from "../lib/activity.js";
import { tagUsage, addTagsFromDraft } from "../lib/tags.js";
import { entriesByExercise } from "../lib/exercises.js";
import { usageList } from "../lib/links.js";
import { routineOptions } from "../lib/routines.js";
import { matchesSearch, exerciseSearchFields, nameMap } from "../lib/search.js";
import { cleanFields, cleanLine } from "../lib/text.js";
import TagChip from "../ui/TagChip.jsx";
import EntryComposer from "../ui/EntryComposer.jsx";
import TagFilter from "../ui/TagFilter.jsx";
import SearchBox from "../ui/SearchBox.jsx";
import SegmentedToggle from "../ui/SegmentedToggle.jsx";
import ExerciseCard from "./ExerciseCard.jsx";
import ExerciseHistorySheet from "./ExerciseHistorySheet.jsx";
import PickBar from "../ui/PickBar.jsx";
import { primaryBtnStyle } from "../ui/styles.js";

const ACCENT = "--accent2"; // matches Routines/Techniques, the other library-style tabs

const emptyForm = () => ({ name: "", tags: [], text: "", prescription: "", measure: DEFAULT_MEASURE, active: true });

// A flat, taggable list of every exercise you know — no folders, because one
// exercise (e.g. a kettlebell swing) can belong under several categories
// (strength AND cardio) at once, and a folder can only put it in one place.
// Tags double as categories: a future routine builder can pick "a random
// mobility exercise, a random strength exercise, a random cardio exercise"
// straight off this list by querying tags, which is why the tag vocabulary
// here is worth keeping clean (reuse existing tags via the suggestions below
// rather than typing near-duplicates).
//
// `pick` opens the page for picking exercises into an entry (see PagePicker):
// { addedIds, onAdd(exercise), onDone, initialQuery }. The page works exactly
// as usual, except each card gets an Add button, Delete is hidden (so the
// entry can't end up linking a deleted exercise), a bar with Done sits on
// top, the search starts from what was typed in the entry's field, and a new
// exercise starts with that name and is added to the entry once saved.
export default function ExerciseLibraryTab({ exercises, setExercises, sessions = [], journals = [], routines = [], folders = [], pick }) {
  const [search, setSearch] = useState(pick?.initialQuery || "");
  const [searchMatchMode, setSearchMatchMode] = useState("all"); // "all" or "any" of the typed words
  const [activeTags, setActiveTags] = useState([]);
  const [tagMatchMode, setTagMatchMode] = useState("all");
  const [status, setStatus] = useState("active"); // "active" | "inactive" | "all"
  // A quick way to find exercises a future random-pick builder could never
  // select, because they have no category tag to be found by.
  const [untaggedOnly, setUntaggedOnly] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showComposer, setShowComposer] = useState(false);
  const [historyId, setHistoryId] = useState(null); // exercise whose history sheet is open
  const [form, setForm] = useState(emptyForm());
  const [tagDraft, setTagDraft] = useState("");

  const tagSuggestions = useMemo(() => tagUsage(exercises, todayISO()), [exercises]);
  const untaggedCount = useMemo(() => exercises.filter((e) => (e.tags || []).length === 0).length, [exercises]);

  // Backlinks for "which sessions/journal entries/routines use this
  // exercise", keyed by exercise id.
  const sessionsByExercise = useMemo(() => entriesByExercise(sessions), [sessions]);
  const journalsByExercise = useMemo(() => entriesByExercise(journals), [journals]);
  const routinesByExercise = useMemo(() => entriesByExercise(routines), [routines]);
  // Folder-path labels ("Legs / Squat day") for the history sheet's routine list.
  const routineLabels = useMemo(() => routineOptions(routines, folders), [routines, folders]);
  // Names for an entry's links when its summary opens from the history sheet.
  const exerciseNameById = useMemo(() => nameMap(exercises), [exercises]);
  const routineNameById = useMemo(() => nameMap(routines), [routines]);
  const historyExercise = historyId ? exercises.find((e) => e.id === historyId) : null;

  const filtered = useMemo(() => {
    return exercises
      .filter((e) => {
        const matchesStatus = status === "all" || (status === "active" ? e.active !== false : e.active === false);
        const matchesText = matchesSearch(exerciseSearchFields(e), search, searchMatchMode);
        // Untagged mode is its own filter — an untagged exercise can never
        // match a tag filter, so the two would otherwise always empty the list.
        const matchesTagScope = untaggedOnly ? (e.tags || []).length === 0 : matchesTags(e.tags, activeTags, tagMatchMode);
        return matchesStatus && matchesText && matchesTagScope;
      })
      .slice()
      .sort((a, b) => {
        const byStatus = (a.active === false ? 1 : 0) - (b.active === false ? 1 : 0);
        return byStatus !== 0 ? byStatus : (a.name || "").localeCompare(b.name || "");
      });
  }, [exercises, search, searchMatchMode, activeTags, tagMatchMode, status, untaggedOnly]);

  const resetForm = () => {
    setForm(emptyForm());
    setTagDraft("");
    setEditingId(null);
  };

  const openNewComposer = () => {
    resetForm();
    // Picking and couldn't find it: start the new exercise from the search.
    if (pick && search.trim()) setForm((f) => ({ ...f, name: search.trim() }));
    setShowComposer(true);
  };

  const openEdit = (exercise) => {
    setForm({
      name: exercise.name || "",
      tags: [...(exercise.tags || [])],
      text: exercise.text || "",
      prescription: exercise.prescription || "",
      measure: measureOf(exercise),
      active: exercise.active !== false,
    });
    setEditingId(exercise.id);
    setShowComposer(true);
    setTagDraft("");
  };

  const addTagFromDraft = () => {
    setForm((f) => ({ ...f, tags: addTagsFromDraft(f.tags, tagDraft) }));
    setTagDraft("");
  };

  const removeFormTag = (t) => setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }));

  // Exercise names are compared case-insensitively so "Bench" and "bench"
  // count as the same exercise — otherwise the Library (and the Exercises
  // picker it feeds) quietly grows near-duplicates.
  const trimmedName = cleanLine(form.name);
  const isDuplicateName =
    trimmedName !== "" && exercises.some((e) => e.id !== editingId && cleanLine(e.name).toLowerCase() === trimmedName.toLowerCase());

  const saveExercise = () => {
    const fields = cleanFields(form);
    if (!fields.name || isDuplicateName) return;
    if (editingId) {
      setExercises((prev) => editById(prev, editingId, fields));
    } else {
      const created = newRecord(fields);
      setExercises((prev) => [created, ...prev]);
      // Created while picking for an entry: that's what it's for.
      if (pick) pick.onAdd(created);
    }
    setShowComposer(false);
    resetForm();
  };

  const deleteExercise = (id) => {
    const list = usageList({
      sessions: sessionsByExercise.get(id),
      journals: journalsByExercise.get(id),
      routines: routinesByExercise.get(id),
    });
    const warning = list ? ` Used in ${list}.` : "";
    if (!window.confirm(`Delete this exercise?${warning} This can't be undone.`)) return false;
    setExercises((prev) => prev.filter((e) => e.id !== id));
    return true;
  };

  const toggleTagFilter = (t) => setActiveTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  return (
    <>
      {pick && <PickBar noun="exercises" onDone={pick.onDone} accent={ACCENT} />}
      <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 0.3 }}>Library</div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 0.2 }}>Exercises</div>
          </div>
          <button onClick={openNewComposer} style={{ ...primaryBtnStyle, background: `var(${ACCENT})` }}>
            <Plus size={15} /> New exercise
          </button>
        </div>

        <SearchBox
          value={search}
          setValue={setSearch}
          matchMode={searchMatchMode}
          setMatchMode={setSearchMatchMode}
          placeholder="Search text, tags, prescription…"
          accent={ACCENT}
        />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
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
            <TagChip label={`No tags (${untaggedCount})`} accent="--danger" active={untaggedOnly} onClick={() => setUntaggedOnly((v) => !v)} />
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
          />
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 18px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-dim)", padding: "36px 10px", fontSize: 13 }}>
            {exercises.length === 0 ? 'No exercises yet. Tap "New exercise" to add your first one.' : "Nothing matches the current search or filters."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((e) => (
              <ExerciseCard
                key={e.id}
                exercise={e}
                accent={ACCENT}
                isOpen={expanded === e.id}
                onToggle={() => setExpanded(expanded === e.id ? null : e.id)}
                onEdit={() => openEdit(e)}
                onDelete={pick ? undefined : () => deleteExercise(e.id)}
                onAdd={pick ? () => pick.onAdd(e) : undefined}
                added={pick ? pick.addedIds.includes(e.id) : false}
                onOpen={() => setHistoryId(e.id)}
                activeTags={activeTags}
                onTagClick={toggleTagFilter}
                usedInSessions={sessionsByExercise.get(e.id) || []}
                usedInJournals={journalsByExercise.get(e.id) || []}
                usedInRoutines={routinesByExercise.get(e.id) || []}
              />
            ))}
          </div>
        )}
      </div>

      {historyExercise && (
        <ExerciseHistorySheet
          exercise={historyExercise}
          accent={ACCENT}
          sessions={sessionsByExercise.get(historyExercise.id) || []}
          journals={journalsByExercise.get(historyExercise.id) || []}
          routines={routineLabels.filter((o) => (routinesByExercise.get(historyExercise.id) || []).some((r) => r.id === o.id))}
          exerciseNameById={exerciseNameById}
          routineNameById={routineNameById}
          onEdit={() => {
            setHistoryId(null);
            openEdit(historyExercise);
          }}
          onDelete={
            pick
              ? undefined
              : () => {
                  if (deleteExercise(historyExercise.id)) setHistoryId(null);
                }
          }
          onClose={() => setHistoryId(null)}
        />
      )}

      {showComposer && (
        <EntryComposer
          title={editingId ? "Edit exercise" : "New exercise"}
          form={form}
          setForm={setForm}
          tagDraft={tagDraft}
          setTagDraft={setTagDraft}
          onAddTag={addTagFromDraft}
          onRemoveTag={removeFormTag}
          onSave={saveExercise}
          onClose={() => {
            setShowComposer(false);
            resetForm();
          }}
          saveDisabled={!form.name.trim() || isDuplicateName}
          showName
          nameField="name"
          nameLabel="Name"
          namePlaceholder="Goblet squat, cat-cow, jump rope…"
          nameError={isDuplicateName ? "An exercise with this name already exists." : undefined}
          showPrescription
          showMeasure
          showActive
          textLabel="Notes (optional)"
          textPlaceholder="Cues, setup, how to scale…"
          saveLabel={editingId ? "Save changes" : "Save exercise"}
          tagSuggestions={tagSuggestions}
          accent={ACCENT}
        />
      )}
    </>
  );
}
