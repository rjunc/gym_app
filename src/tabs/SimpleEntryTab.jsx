import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { uid, todayISO } from "../lib/id.js";
import { matchesTags, redoFields } from "../lib/activity.js";
import { tagCounts, addTagsFromDraft } from "../lib/tags.js";
import { recentExerciseCounts } from "../lib/exercises.js";
import { routineOptions } from "../lib/routines.js";
import { matchesSearch, entrySearchFields, exerciseNameMap } from "../lib/search.js";
import EntryComposer from "../ui/EntryComposer.jsx";
import TagFilter from "../ui/TagFilter.jsx";
import SearchBox from "../ui/SearchBox.jsx";
import SimpleEntryCard from "./SimpleEntryCard.jsx";
import { primaryBtnStyle } from "../ui/styles.js";

// Sessions and journals are both just a flat, most-recent-first list of dated
// entries with tags — no folders. Both tabs are thin wrappers around this.
export default function SimpleEntryTab({
  entries,
  setEntries,
  eyebrow,
  heading,
  searchPlaceholder,
  emptyLabel,
  textLabel,
  textPlaceholder,
  accent = "--accent",
  // Adds a "Redo" button to each entry that starts a new one from it, dated today.
  canRedo = false,
  // Links an entry to Library exercises (Sessions and Journals — Rolls don't
  // get this field at all, not even an empty one).
  showExercises = false,
  exercises = [],
  // Offers a picker that copies routines into the entry (Sessions and Journals).
  showRoutines = false,
  routines = [],
  folders = [],
}) {
  const [search, setSearch] = useState("");
  const [searchMatchMode, setSearchMatchMode] = useState("all"); // "all" or "any" of the typed words
  const [activeTags, setActiveTags] = useState([]);
  const [tagMatchMode, setTagMatchMode] = useState("all"); // "all" (AND) or "any" (OR)
  const [expanded, setExpanded] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [isRedo, setIsRedo] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [form, setForm] = useState({ date: todayISO(), title: "", tags: [], text: "", ...(showExercises ? { exerciseIds: [] } : {}) });
  const [tagDraft, setTagDraft] = useState("");

  const tagSuggestions = useMemo(() => tagCounts(entries), [entries]);
  // Only meaningful with showExercises; ranks the Exercises picker by what's
  // actually been linked in this tab's entries in the last 30 days.
  const exerciseRecentCounts = useMemo(
    () => (showExercises ? recentExerciseCounts(entries, todayISO()) : undefined),
    [entries, showExercises]
  );

  const routineChoices = useMemo(() => (showRoutines ? routineOptions(routines, folders) : []), [showRoutines, routines, folders]);

  const exerciseNameById = useMemo(() => exerciseNameMap(exercises), [exercises]);

  const filtered = useMemo(() => {
    return entries
      .filter(
        (s) =>
          matchesSearch(entrySearchFields(s, exerciseNameById), search, searchMatchMode) &&
          matchesTags(s.tags, activeTags, tagMatchMode)
      )
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [entries, search, searchMatchMode, exerciseNameById, activeTags, tagMatchMode]);

  const resetForm = () => {
    setForm({ date: todayISO(), title: "", tags: [], text: "", ...(showExercises ? { exerciseIds: [] } : {}) });
    setTagDraft("");
    setEditingId(null);
    setIsRedo(false);
  };

  const openNewComposer = () => {
    resetForm();
    setShowComposer(true);
  };

  const openEdit = (entry) => {
    setForm({
      date: entry.date,
      title: entry.title || "",
      tags: [...(entry.tags || [])],
      text: entry.text || "",
      ...(showExercises ? { exerciseIds: [...(entry.exerciseIds || [])] } : {}),
    });
    setEditingId(entry.id);
    setShowComposer(true);
    setTagDraft("");
  };

  const openRedo = (entry) => {
    setForm(redoFields(entry, todayISO()));
    setEditingId(null);
    setIsRedo(true);
    setShowComposer(true);
    setTagDraft("");
  };

  const addTagFromDraft = () => {
    setForm((f) => ({ ...f, tags: addTagsFromDraft(f.tags, tagDraft) }));
    setTagDraft("");
  };

  const removeFormTag = (t) => setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }));

  const saveEntry = () => {
    if (!form.text.trim()) return;
    if (editingId) {
      setEntries((prev) => prev.map((s) => (s.id === editingId ? { ...s, ...form } : s)));
    } else {
      setEntries((prev) => [{ id: uid(), ...form }, ...prev]);
    }
    setShowComposer(false);
    resetForm();
  };

  const deleteEntry = (id) => {
    if (!window.confirm("Delete this entry? This can't be undone.")) return;
    setEntries((prev) => prev.filter((s) => s.id !== id));
  };

  const toggleTagFilter = (t) => setActiveTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  return (
    <>
      <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 0.3 }}>{eyebrow}</div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 0.2 }}>{heading}</div>
          </div>
          <button onClick={openNewComposer} style={{ ...primaryBtnStyle, background: `var(${accent})` }}>
            <Plus size={15} /> New entry
          </button>
        </div>

        <SearchBox
          value={search}
          setValue={setSearch}
          matchMode={searchMatchMode}
          setMatchMode={setSearchMatchMode}
          placeholder={searchPlaceholder}
          accent={accent}
        />

        <TagFilter
          entries={entries}
          activeTags={activeTags}
          onToggle={toggleTagFilter}
          matchMode={tagMatchMode}
          setMatchMode={setTagMatchMode}
          accent={accent}
        />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 18px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-dim)", padding: "36px 10px", fontSize: 13 }}>
            {entries.length === 0 ? emptyLabel : "Nothing matches that search or tag filter."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((s) => (
              <SimpleEntryCard
                key={s.id}
                entry={s}
                accent={accent}
                isOpen={expanded === s.id}
                onToggle={() => setExpanded(expanded === s.id ? null : s.id)}
                onEdit={() => openEdit(s)}
                onDelete={() => deleteEntry(s.id)}
                onRedo={canRedo ? () => openRedo(s) : undefined}
                activeTags={activeTags}
                onTagClick={toggleTagFilter}
              />
            ))}
          </div>
        )}
      </div>

      {showComposer && (
        <EntryComposer
          title={editingId ? "Edit entry" : isRedo ? "Redo entry" : "New entry"}
          form={form}
          setForm={setForm}
          tagDraft={tagDraft}
          setTagDraft={setTagDraft}
          onAddTag={addTagFromDraft}
          onRemoveTag={removeFormTag}
          onSave={saveEntry}
          onClose={() => {
            setShowComposer(false);
            resetForm();
          }}
          showDate
          showName
          nameField="title"
          nameLabel="Title"
          namePlaceholder="Optional title…"
          showRoutines={showRoutines}
          routines={routines}
          routineOptions={routineChoices}
          showExercises={showExercises}
          exerciseOptions={exercises}
          exerciseRecentCounts={exerciseRecentCounts}
          textLabel={textLabel}
          textPlaceholder={textPlaceholder}
          saveLabel={editingId ? "Save changes" : "Save entry"}
          tagSuggestions={tagSuggestions}
          accent={accent}
        />
      )}
    </>
  );
}
