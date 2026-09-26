import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { todayISO } from "../lib/id.js";
import { useSheets } from "../lib/SheetStack.js";
import { newRecord, editById } from "../lib/records.js";
import { matchesTags } from "../lib/activity.js";
import { matchesSearch, entrySearchFields, exerciseNameMap, nameMap } from "../lib/search.js";
import EntrySheet from "../ui/EntrySheet.jsx";
import TagFilter from "../ui/TagFilter.jsx";
import SearchBox from "../ui/SearchBox.jsx";
import EntryCard from "../ui/EntryCard.jsx";
import { primaryBtnStyle } from "../ui/styles.js";

// Sessions, journals and rolls are each just a flat, most-recent-first list of
// dated entries with tags — no folders. All three tabs are thin wrappers
// around this. `type` is that kind's entry in ENTRY_TYPES (lib/entryTypes.js)
// — its wording, colour and which form fields it has — shared with Home so
// the two can't drift apart. Adding and editing goes through EntrySheet and
// cards are EntryCard, both the same as on Home, with this page's one type
// (so no Session/Roll switch). Tapping a card opens its summary on the app's
// sheet stack (see SheetStack); `source` is which log this page shows
// ("sessions", "journals" or "rolls"), so the sheet can find it.
export default function SimpleEntryTab({
  entries,
  setEntries,
  source,
  type,
  exercises = [],
  // How much each exercise is used in sessions (exerciseUsageCounts), to rank
  // the Exercises picker. Always session-based, even on the Journals tab.
  exerciseUsage,
  routines = [],
  // How much each routine is used in sessions (routineUsageCounts), to rank
  // the Routines picker.
  routineUsage,
  folders = [],
}) {
  const [search, setSearch] = useState("");
  const [searchMatchMode, setSearchMatchMode] = useState("all"); // "all" or "any" of the typed words
  const [activeTags, setActiveTags] = useState([]);
  const [tagMatchMode, setTagMatchMode] = useState("all"); // "all" (AND) or "any" (OR)
  // null when closed; otherwise {} to add, { entry } to edit, { redo } to redo.
  const [composer, setComposer] = useState(null);
  const sheets = useSheets();

  const { accent, canRedo, page } = type;
  // EntrySheet's single type for this page.
  const types = useMemo(() => ({ entry: type }), [type]);
  const entriesByType = useMemo(() => ({ entry: entries }), [entries]);

  const exerciseNameById = useMemo(() => exerciseNameMap(exercises), [exercises]);
  const routineNameById = useMemo(() => nameMap(routines), [routines]);

  const filtered = useMemo(() => {
    return entries
      .filter(
        (s) =>
          matchesSearch(entrySearchFields(s, exerciseNameById, routineNameById), search, searchMatchMode) &&
          matchesTags(s.tags, activeTags, tagMatchMode)
      )
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [entries, search, searchMatchMode, exerciseNameById, routineNameById, activeTags, tagMatchMode]);

  const saveEntry = (_type, fields) => {
    const editing = composer.entry;
    if (editing) {
      setEntries((prev) => editById(prev, editing.id, fields));
    } else {
      setEntries((prev) => [newRecord(fields), ...prev]);
    }
    setComposer(null);
  };

  // Returns whether it was deleted (the confirmation can be cancelled).
  const deleteEntry = (id) => {
    if (!window.confirm("Delete this entry? This can't be undone.")) return false;
    setEntries((prev) => prev.filter((s) => s.id !== id));
    return true;
  };

  const toggleTagFilter = (t) => setActiveTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  return (
    <>
      <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 0.3 }}>{page.eyebrow}</div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 0.2 }}>{page.heading}</div>
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
          placeholder={page.searchPlaceholder}
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
            {entries.length === 0 ? page.emptyLabel : "Nothing matches that search or tag filter."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((s) => (
              <EntryCard
                key={s.id}
                entry={s}
                accent={accent}
                showDate
                onEdit={() => setComposer({ entry: s })}
                onDelete={() => deleteEntry(s.id)}
                onRedo={canRedo ? () => setComposer({ redo: s }) : undefined}
                activeTags={activeTags}
                onTagClick={toggleTagFilter}
                exerciseNameById={exerciseNameById}
                routineNameById={routineNameById}
                onOpen={() => sheets.open({ kind: "entry", source, id: s.id })}
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
          routineUsage={routineUsage}
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
