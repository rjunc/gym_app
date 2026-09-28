import { useState, useMemo, Fragment } from "react";
import { Plus, ClipboardList, NotebookPen, SearchX } from "lucide-react";
import { todayISO } from "../lib/id.js";
import { useSheets } from "../lib/SheetStack.js";
import { newRecord, editById } from "../lib/records.js";
import { matchesTags } from "../lib/activity.js";
import { matchesSearch, entrySearchFields, exerciseNameMap, nameMap } from "../lib/search.js";
import { useLog } from "../lib/LogContext.js";
import EntrySheet from "../ui/EntrySheet.jsx";
import TagFilter from "../ui/TagFilter.jsx";
import SearchBox, { TagsToggle } from "../ui/SearchBox.jsx";
import { PageHeader, PageBody } from "../ui/Page.jsx";
import EmptyState from "../ui/EmptyState.jsx";
import EntryCard from "../ui/EntryCard.jsx";
import { primaryBtnStyle, secondaryBtnStyle, eyebrowStyle } from "../ui/styles.js";

// "September 2026", the heading above each month of entries.
const monthLabel = (iso) => {
  const d = new Date(`${iso.slice(0, 7)}-01T00:00:00`);
  return isNaN(d) ? iso : d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
};

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
  const [tagsOpen, setTagsOpen] = useState(false);
  // null when closed; otherwise {} to add, { entry } to edit, { redo } to redo.
  const [composer, setComposer] = useState(null);
  const sheets = useSheets();

  const { accent, canRedo, page } = type;
  // EntrySheet's single type for this page.
  const types = useMemo(() => ({ entry: type }), [type]);
  const entriesByType = useMemo(() => ({ entry: entries }), [entries]);

  const exerciseNameById = useMemo(() => exerciseNameMap(exercises), [exercises]);
  const routineNameById = useMemo(() => nameMap(routines), [routines]);
  // Mat sessions search their techniques by name too.
  const log = useLog();
  const techniques = (log && log.techniques) || [];
  const techniqueNameById = useMemo(() => nameMap(techniques), [techniques]);

  const filtered = useMemo(() => {
    return entries
      .filter(
        (s) =>
          matchesSearch(entrySearchFields(s, exerciseNameById, routineNameById, techniqueNameById), search, searchMatchMode) &&
          matchesTags(s.tags, activeTags, tagMatchMode)
      )
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [entries, search, searchMatchMode, exerciseNameById, routineNameById, techniqueNameById, activeTags, tagMatchMode]);

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

  const newButton = (
    <button onClick={() => setComposer({})} aria-label={page.newLabel} style={{ ...primaryBtnStyle, background: `var(${accent})` }}>
      <Plus size={16} /> {page.newShort}
    </button>
  );
  const hasTags = entries.some((e) => (e.tags || []).length > 0);

  return (
    <>
      <PageHeader eyebrow={page.eyebrow} title={page.heading} actions={entries.length > 0 && newButton}>
        {entries.length > 0 && (
          <>
            <SearchBox
              value={search}
              setValue={setSearch}
              matchMode={searchMatchMode}
              setMatchMode={setSearchMatchMode}
              placeholder={page.searchPlaceholder}
              accent={accent}
              trailing={hasTags && <TagsToggle open={tagsOpen} count={activeTags.length} onClick={() => setTagsOpen((v) => !v)} accent={accent} />}
            />
            <TagFilter
              entries={entries}
              activeTags={activeTags}
              onToggle={toggleTagFilter}
              matchMode={tagMatchMode}
              setMatchMode={setTagMatchMode}
              accent={accent}
              collapsed={!tagsOpen}
            />
          </>
        )}
      </PageHeader>

      <PageBody>
        {entries.length === 0 ? (
          <EmptyState
            icon={source === "journals" ? NotebookPen : ClipboardList}
            title={page.emptyTitle}
            action={
              <button onClick={() => setComposer({})} style={{ ...primaryBtnStyle, background: `var(${accent})` }}>
                <Plus size={16} /> {page.newLabel}
              </button>
            }
          >
            {page.emptyLabel}
          </EmptyState>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No matches"
            action={
              <button
                onClick={() => {
                  setSearch("");
                  setActiveTags([]);
                }}
                style={secondaryBtnStyle}
              >
                Clear search and tags
              </button>
            }
          >
            Nothing matches that search or tag filter.
          </EmptyState>
        ) : (
          filtered.map((s, i) => (
            <Fragment key={s.id}>
              {(i === 0 || s.date.slice(0, 7) !== filtered[i - 1].date.slice(0, 7)) && (
                <div style={{ ...eyebrowStyle, color: "var(--text-dim)", padding: i === 0 ? "0 2px" : "12px 2px 0" }}>{monthLabel(s.date)}</div>
              )}
              <EntryCard
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
            </Fragment>
          ))
        )}
      </PageBody>

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
          newTitle={page.newLabel}
          onSave={saveEntry}
          onClose={() => setComposer(null)}
        />
      )}
    </>
  );
}
