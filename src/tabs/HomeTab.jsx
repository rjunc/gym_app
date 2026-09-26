import { useState, useMemo, useRef } from "react";
import { Plus } from "lucide-react";
import { todayISO } from "../lib/id.js";
import { newRecord, editById, editRecord } from "../lib/records.js";
import { matchesTags, groupByDate, shiftMonth } from "../lib/activity.js";
import { exerciseNameMap, nameMap } from "../lib/search.js";
import TagChip from "../ui/TagChip.jsx";
import TagFilter from "../ui/TagFilter.jsx";
import ActivityCalendar from "../ui/ActivityCalendar.jsx";
import DayEntries from "../ui/DayEntries.jsx";
import EntrySheet from "../ui/EntrySheet.jsx";
import EntryDetailSheet from "../ui/EntryDetailSheet.jsx";
import { cardStyle, labelStyle, primaryBtnStyle } from "../ui/styles.js";

// Every kind of dated log the calendar can draw from. Order here is the order
// entries are listed within a day. Routines and techniques have no dates, so
// they can't appear on a calendar.
const SOURCE_META = {
  sessions: {
    label: "Sessions",
    singular: "Session",
    accent: "--accent",
    showRoutines: true, // routines are lifting templates; rolls have no equivalent
    showExercises: true, // links to the exercise Library; rolls have no equivalent
    showSets: true, // per-set numbers for those exercises
    textLabel: "What did you do?",
    textPlaceholder: "Warmed up with 10 min bike, then did 5x5 back squat working up to 225, superset with...",
  },
  rolls: {
    label: "Rolls",
    singular: "Roll",
    accent: "--accent4",
    textLabel: "What did you work on?",
    textPlaceholder: "Gi class, drilled scissor sweep to knee-on-belly, rolled 5 rounds, caught a triangle from closed guard...",
  },
};
const SOURCE_KEYS = Object.keys(SOURCE_META);

export default function HomeTab({ sessions, rolls, setSessions, setRolls, routines, folders, exercises, exerciseUsage, routineUsage }) {
  const today = todayISO();
  const [shown, setShown] = useState(SOURCE_KEYS);
  const [activeTags, setActiveTags] = useState([]);
  const [tagMatchMode, setTagMatchMode] = useState("all");
  const [selected, setSelected] = useState(today);
  const [view, setView] = useState(() => ({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1 }));
  // null when closed; { entry: null } to add, { entry } to edit that entry, or
  // { entry: null, redo } to add a new one copied from `redo`.
  const [composer, setComposer] = useState(null);
  // The entry whose read-only summary is open, as { source, id } so it stays
  // current after an edit elsewhere.
  const [viewing, setViewing] = useState(null);
  const detailRef = useRef(null);

  const bySource = useMemo(() => ({ sessions, rolls }), [sessions, rolls]);
  const exerciseNameById = useMemo(() => exerciseNameMap(exercises), [exercises]);
  const routineNameById = useMemo(() => nameMap(routines), [routines]);
  const setters = { sessions: setSessions, rolls: setRolls };

  // Everything, regardless of filters — only used to say how much a day's
  // list is being narrowed.
  const unfilteredByDate = useMemo(
    () => groupByDate(SOURCE_KEYS.flatMap((k) => bySource[k].map((e) => ({ ...e, source: k })))),
    [sessions, rolls]
  );

  const inScope = useMemo(
    () => SOURCE_KEYS.filter((k) => shown.includes(k)).flatMap((k) => bySource[k].map((e) => ({ ...e, source: k }))),
    [sessions, rolls, shown]
  );

  const hasTags = useMemo(() => inScope.some((e) => (e.tags || []).length > 0), [inScope]);

  // A selected tag can vanish from the vocabulary when its source is switched
  // off; drop it from the filter rather than let a stale tag empty the calendar.
  const tagsInEffect = activeTags.filter((t) => inScope.some((e) => (e.tags || []).includes(t)));

  const byDate = useMemo(
    () => groupByDate(inScope.filter((e) => matchesTags(e.tags, tagsInEffect, tagMatchMode))),
    [inScope, tagsInEffect.join("\u0000"), tagMatchMode]
  );

  const monthPrefix = `${view.year}-${String(view.month + 1).padStart(2, "0")}-`;
  let activeDays = 0;
  let monthEntries = 0;
  byDate.forEach((list, iso) => {
    if (iso.startsWith(monthPrefix)) {
      activeDays += 1;
      monthEntries += list.length;
    }
  });

  const dayEntries = byDate.get(selected) || [];
  const hiddenCount = (unfilteredByDate.get(selected) || []).length - dayEntries.length;

  const toggleSource = (key) =>
    setShown((prev) => {
      if (!prev.includes(key)) return [...prev, key];
      return prev.length === 1 ? prev : prev.filter((k) => k !== key); // keep at least one on
    });

  const toggleTag = (t) => setActiveTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  // Saves the composer's entry into the right log (adding it, or updating the
  // one being edited — moving it across logs if its type was changed), then
  // makes sure it's actually visible: turn its type back on if it was hidden,
  // and jump to its day.
  const saveEntry = (type, fields) => {
    const editing = composer.entry;
    if (!editing) {
      setters[type]((prev) => [newRecord(fields), ...prev]);
    } else if (editing.source === type) {
      setters[type]((prev) => editById(prev, editing.id, fields));
    } else {
      setters[editing.source]((prev) => prev.filter((e) => e.id !== editing.id));
      // Only the id and createdAt carry over — a roll doesn't take a
      // session's exercise links, and vice versa.
      setters[type]((prev) => [editRecord({ id: editing.id, ...(editing.createdAt ? { createdAt: editing.createdAt } : {}) }, fields), ...prev]);
    }
    setShown((prev) => (prev.includes(type) ? prev : [...prev, type]));
    setView({ year: Number(fields.date.slice(0, 4)), month: Number(fields.date.slice(5, 7)) - 1 });
    setSelected(fields.date);
    setComposer(null);
  };

  // Returns whether it was deleted (the confirmation can be cancelled).
  const deleteEntry = (entry) => {
    if (!window.confirm("Delete this entry? This can't be undone.")) return false;
    setters[entry.source]((prev) => prev.filter((e) => e.id !== entry.id));
    return true;
  };

  const viewedRecord = viewing && bySource[viewing.source].find((e) => e.id === viewing.id);
  const viewedEntry = viewedRecord && { ...viewedRecord, source: viewing.source };

  const selectDay = (iso) => {
    setSelected(iso);
    // The list sits below the fold on a phone; bring it into view.
    requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ ...labelStyle, marginBottom: 0 }}>Show</span>
          {/* Logs onto whichever day is selected in the calendar below. */}
          <button onClick={() => setComposer({ entry: null })} style={{ ...primaryBtnStyle, padding: "6px 12px" }}>
            <Plus size={14} /> Add
          </button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: hasTags ? 12 : 0 }}>
          {SOURCE_KEYS.map((k) => (
            <TagChip key={k} label={SOURCE_META[k].label} accent={SOURCE_META[k].accent} active={shown.includes(k)} onClick={() => toggleSource(k)} />
          ))}
        </div>

        {hasTags && (
          <>
            <span style={labelStyle}>Tags</span>
            <TagFilter
              entries={inScope}
              activeTags={tagsInEffect}
              onToggle={toggleTag}
              matchMode={tagMatchMode}
              setMatchMode={setTagMatchMode}
            />
          </>
        )}
      </div>

      <div style={cardStyle}>
        <ActivityCalendar
          year={view.year}
          month={view.month}
          byDate={byDate}
          sources={SOURCE_KEYS.filter((k) => shown.includes(k)).map((k) => ({ key: k, ...SOURCE_META[k] }))}
          todayISO={today}
          selected={selected}
          onSelect={selectDay}
          onShift={(delta) => setView((v) => shiftMonth(v, delta))}
          onToday={() => {
            setView({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1 });
            setSelected(today);
          }}
        />
        <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 12, textAlign: "center" }}>
          {activeDays === 0
            ? "No matching entries this month"
            : `${activeDays} active ${activeDays === 1 ? "day" : "days"} · ${monthEntries} ${monthEntries === 1 ? "entry" : "entries"} this month`}
        </div>
      </div>

      <div ref={detailRef} style={{ scrollMarginBottom: 12 }}>
        <DayEntries
          iso={selected}
          entries={dayEntries}
          hiddenCount={hiddenCount}
          sourceMeta={SOURCE_META}
          activeTags={tagsInEffect}
          onToggleTag={toggleTag}
          onEdit={(entry) => setComposer({ entry })}
          onRedo={(redo) => setComposer({ entry: null, redo })}
          onDelete={deleteEntry}
          onOpen={(entry) => setViewing({ source: entry.source, id: entry.id })}
          exerciseNameById={exerciseNameById}
          routineNameById={routineNameById}
        />
      </div>

      {viewedEntry && (
        <EntryDetailSheet
          entry={viewedEntry}
          kindLabel={SOURCE_META[viewedEntry.source].singular}
          accent={SOURCE_META[viewedEntry.source].accent}
          exerciseNameById={exerciseNameById}
          routineNameById={routineNameById}
          onEdit={() => {
            setViewing(null);
            setComposer({ entry: viewedEntry });
          }}
          onRedo={() => {
            setViewing(null);
            setComposer({ entry: null, redo: viewedEntry });
          }}
          onDelete={() => {
            if (deleteEntry(viewedEntry)) setViewing(null);
          }}
          onClose={() => setViewing(null)}
        />
      )}

      {composer && (
        <EntrySheet
          types={SOURCE_META}
          entriesByType={bySource}
          routines={routines}
          folders={folders}
          exercises={exercises}
          exerciseUsage={exerciseUsage}
          routineUsage={routineUsage}
          entry={composer.entry}
          redo={composer.redo}
          // With one type filtered on, that's almost certainly what's being logged.
          initialType={shown.length === 1 ? shown[0] : "sessions"}
          // A redo is dated today; a fresh add goes on whichever day is selected.
          initialDate={composer.redo ? today : selected}
          onSave={saveEntry}
          onClose={() => setComposer(null)}
        />
      )}
    </div>
  );
}
