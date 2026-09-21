import { useState, useMemo, useRef } from "react";
import { todayISO, uid } from "../lib/id.js";
import { matchesTags, groupByDate, shiftMonth } from "../lib/activity.js";
import TagChip from "../ui/TagChip.jsx";
import TagFilter from "../ui/TagFilter.jsx";
import ActivityCalendar from "../ui/ActivityCalendar.jsx";
import DayEntries from "../ui/DayEntries.jsx";
import AddEntrySheet from "../ui/AddEntrySheet.jsx";
import { cardStyle, labelStyle } from "../ui/styles.js";

// Every kind of dated log the calendar can draw from. Order here is the order
// entries are listed within a day. Routines and techniques have no dates, so
// they can't appear on a calendar.
const SOURCE_META = {
  sessions: {
    label: "Sessions",
    singular: "Session",
    accent: "--accent",
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

export default function HomeTab({ sessions, rolls, setSessions, setRolls }) {
  const today = todayISO();
  const [shown, setShown] = useState(SOURCE_KEYS);
  const [activeTags, setActiveTags] = useState([]);
  const [tagMatchMode, setTagMatchMode] = useState("all");
  const [selected, setSelected] = useState(today);
  const [view, setView] = useState(() => ({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1 }));
  const [composerOpen, setComposerOpen] = useState(false);
  const detailRef = useRef(null);

  const bySource = { sessions, rolls };

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

  // Saves a new entry into the right log, then makes sure it's actually
  // visible: turn its type back on if it was hidden, and jump to its day.
  const addEntry = (type, entry) => {
    const setEntries = type === "sessions" ? setSessions : setRolls;
    setEntries((prev) => [{ id: uid(), ...entry }, ...prev]);
    setShown((prev) => (prev.includes(type) ? prev : [...prev, type]));
    setView({ year: Number(entry.date.slice(0, 4)), month: Number(entry.date.slice(5, 7)) - 1 });
    setSelected(entry.date);
    setComposerOpen(false);
  };

  const selectDay = (iso) => {
    setSelected(iso);
    // The list sits below the fold on a phone; bring it into view.
    requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={cardStyle}>
        <span style={labelStyle}>Show</span>
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
          onAdd={() => setComposerOpen(true)}
        />
      </div>

      {composerOpen && (
        <AddEntrySheet
          types={SOURCE_META}
          // With one type filtered on, that's almost certainly what's being logged.
          initialType={shown.length === 1 ? shown[0] : "sessions"}
          initialDate={selected}
          onSave={addEntry}
          onClose={() => setComposerOpen(false)}
        />
      )}
    </div>
  );
}
