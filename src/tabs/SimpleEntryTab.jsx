import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { todayISO } from "../lib/id.js";
import { newRecord, editById } from "../lib/records.js";
import { matchesTags } from "../lib/activity.js";
import { matchesSearch, entrySearchFields, exerciseNameMap } from "../lib/search.js";
import EntrySheet from "../ui/EntrySheet.jsx";
import TagFilter from "../ui/TagFilter.jsx";
import SearchBox from "../ui/SearchBox.jsx";
import SimpleEntryCard from "./SimpleEntryCard.jsx";
import { primaryBtnStyle } from "../ui/styles.js";

// Sessions, journals and rolls are each just a flat, most-recent-first list of
// dated entries with tags — no folders. All three tabs are thin wrappers
// around this. Adding and editing goes through EntrySheet, the same form Home
// uses, with this page's one type (so no Session/Roll switch).
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
  // Per-set numbers for each linked exercise (Sessions only).
  showSets = false,
  exercises = [],
  // How much each exercise is used in sessions (exerciseUsageCounts), to rank
  // the Exercises picker. Always session-based, even on the Journals tab.
  exerciseUsage,
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
  // null when closed; otherwise {} to add, { entry } to edit, { redo } to redo.
  const [composer, setComposer] = useState(null);

  // EntrySheet's single type for this page.
  const types = useMemo(
    () => ({ entry: { singular: heading, accent, textLabel, textPlaceholder, showRoutines, showExercises, showSets } }),
    [heading, accent, textLabel, textPlaceholder, showRoutines, showExercises, showSets]
  );
  const entriesByType = useMemo(() => ({ entry: entries }), [entries]);

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

  const saveEntry = (_type, fields) => {
    const editing = composer.entry;
    if (editing) {
      setEntries((prev) => editById(prev, editing.id, fields));
    } else {
      setEntries((prev) => [newRecord(fields), ...prev]);
    }
    setComposer(null);
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
          <button onClick={() => setComposer({})} style={{ ...primaryBtnStyle, background: `var(${accent})` }}>
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
                onEdit={() => setComposer({ entry: s })}
                onDelete={() => deleteEntry(s.id)}
                onRedo={canRedo ? () => setComposer({ redo: s }) : undefined}
                activeTags={activeTags}
                onTagClick={toggleTagFilter}
                exerciseNameById={exerciseNameById}
              />
            ))}
          </div>
        )}
      </div>

      {composer && (
        <EntrySheet
          types={types}
          entriesByType={entriesByType}
          routines={routines}
          folders={folders}
          exercises={exercises}
          exerciseUsage={exerciseUsage}
          entry={composer.entry}
          redo={composer.redo}
          initialType="entry"
          // New entries and redos are dated today.
          initialDate={todayISO()}
          newTitle="New entry"
          onSave={saveEntry}
          onClose={() => setComposer(null)}
        />
      )}
    </>
  );
}
