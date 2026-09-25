import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { uid } from "../lib/id.js";
import { matchesTags } from "../lib/activity.js";
import { tagCounts, addTagsFromDraft } from "../lib/tags.js";
import { entriesByExercise } from "../lib/exercises.js";
import { matchesSearch, exerciseSearchFields } from "../lib/search.js";
import TagChip from "../ui/TagChip.jsx";
import EntryComposer from "../ui/EntryComposer.jsx";
import TagFilter from "../ui/TagFilter.jsx";
import SearchBox from "../ui/SearchBox.jsx";
import SegmentedToggle from "../ui/SegmentedToggle.jsx";
import ExerciseCard from "./ExerciseCard.jsx";
import { primaryBtnStyle } from "../ui/styles.js";

const ACCENT = "--accent2"; // matches Routines/Techniques, the other library-style tabs

const emptyForm = () => ({ name: "", tags: [], text: "", prescription: "", active: true });

// A flat, taggable list of every exercise you know — no folders, because one
// exercise (e.g. a kettlebell swing) can belong under several categories
// (strength AND cardio) at once, and a folder can only put it in one place.
// Tags double as categories: a future routine builder can pick "a random
// mobility exercise, a random strength exercise, a random cardio exercise"
// straight off this list by querying tags, which is why the tag vocabulary
// here is worth keeping clean (reuse existing tags via the suggestions below
// rather than typing near-duplicates).
export default function ExerciseLibraryTab({ exercises, setExercises, sessions = [], journals = [], routines = [] }) {
  const [search, setSearch] = useState("");
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
  const [form, setForm] = useState(emptyForm());
  const [tagDraft, setTagDraft] = useState("");

  const tagSuggestions = useMemo(() => tagCounts(exercises), [exercises]);
  const untaggedCount = useMemo(() => exercises.filter((e) => (e.tags || []).length === 0).length, [exercises]);

  // Backlinks for "which sessions/journal entries/routines use this
  // exercise", keyed by exercise id.
  const sessionsByExercise = useMemo(() => entriesByExercise(sessions), [sessions]);
  const journalsByExercise = useMemo(() => entriesByExercise(journals), [journals]);
  const routinesByExercise = useMemo(() => entriesByExercise(routines), [routines]);

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
    setShowComposer(true);
  };

  const openEdit = (exercise) => {
    setForm({
      name: exercise.name || "",
      tags: [...(exercise.tags || [])],
      text: exercise.text || "",
      prescription: exercise.prescription || "",
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
  const trimmedName = form.name.trim();
  const isDuplicateName =
    trimmedName !== "" && exercises.some((e) => e.id !== editingId && e.name.trim().toLowerCase() === trimmedName.toLowerCase());

  const saveExercise = () => {
    const name = form.name.trim();
    if (!name || isDuplicateName) return;
    if (editingId) {
      setExercises((prev) => prev.map((e) => (e.id === editingId ? { ...e, ...form, name } : e)));
    } else {
      setExercises((prev) => [{ id: uid(), ...form, name }, ...prev]);
    }
    setShowComposer(false);
    resetForm();
  };

  const deleteExercise = (id) => {
    const sessionCount = (sessionsByExercise.get(id) || []).length;
    const journalCount = (journalsByExercise.get(id) || []).length;
    const routineCount = (routinesByExercise.get(id) || []).length;
    const parts = [];
    if (sessionCount > 0) parts.push(`${sessionCount} session${sessionCount === 1 ? "" : "s"}`);
    if (journalCount > 0) parts.push(`${journalCount} journal entr${journalCount === 1 ? "y" : "ies"}`);
    if (routineCount > 0) parts.push(`${routineCount} routine${routineCount === 1 ? "" : "s"}`);
    const list = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0];
    const warning = parts.length > 0 ? ` Used in ${list}.` : "";
    if (!window.confirm(`Delete this exercise?${warning} This can't be undone.`)) return;
    setExercises((prev) => prev.filter((e) => e.id !== id));
  };

  const toggleTagFilter = (t) => setActiveTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  return (
    <>
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
                onDelete={() => deleteExercise(e.id)}
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
