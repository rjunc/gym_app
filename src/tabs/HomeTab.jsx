import { useState, useMemo, useRef } from "react";
import { todayISO } from "../lib/id.js";
import { matchesTags, groupByDate, shiftMonth } from "../lib/activity.js";
import TagChip from "../ui/TagChip.jsx";
import SegmentedToggle from "../ui/SegmentedToggle.jsx";
import ActivityCalendar from "../ui/ActivityCalendar.jsx";
import DayEntries from "../ui/DayEntries.jsx";
import { cardStyle, labelStyle } from "../ui/styles.js";

// Every kind of dated log the calendar can draw from. Order here is the order
// entries are listed within a day. Routines and techniques have no dates, so
// they can't appear on a calendar.
const SOURCE_META = {
  sessions: { label: "Sessions", singular: "Session", accent: "--accent" },
  rolls: { label: "Rolls", singular: "Roll", accent: "--accent4" },
  journals: { label: "Journals", singular: "Journal", accent: "--accent3" },
};
const SOURCE_KEYS = Object.keys(SOURCE_META);
const SOURCE_ACCENT = Object.fromEntries(SOURCE_KEYS.map((k) => [k, SOURCE_META[k].accent]));

export default function HomeTab({ sessions, rolls, journals }) {
  const today = todayISO();
  const [shown, setShown] = useState(["sessions", "rolls"]); // journals are opt-in: they aren't training
  const [activeTags, setActiveTags] = useState([]);
  const [tagMatchMode, setTagMatchMode] = useState("all");
  const [selected, setSelected] = useState(today);
  const [view, setView] = useState(() => ({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1 }));
  const detailRef = useRef(null);

  const bySource = { sessions, rolls, journals };

  // Everything, regardless of filters — only used to say how much a day's
  // list is being narrowed.
  const unfilteredByDate = useMemo(
    () => groupByDate(SOURCE_KEYS.flatMap((k) => bySource[k].map((e) => ({ ...e, source: k })))),
    [sessions, rolls, journals]
  );

  const inScope = useMemo(
    () => SOURCE_KEYS.filter((k) => shown.includes(k)).flatMap((k) => bySource[k].map((e) => ({ ...e, source: k }))),
    [sessions, rolls, journals, shown]
  );

  const allTags = useMemo(() => {
    const set = new Set();
    inScope.forEach((e) => (e.tags || []).forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [inScope]);

  // A selected tag can vanish from the list when its source is switched off;
  // drop it from the filter rather than let an invisible chip empty the calendar.
  const tagsInEffect = activeTags.filter((t) => allTags.includes(t));

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

  const selectDay = (iso) => {
    setSelected(iso);
    // The list sits below the fold on a phone; bring it into view.
    requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={cardStyle}>
        <span style={labelStyle}>Show</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: allTags.length > 0 ? 12 : 0 }}>
          {SOURCE_KEYS.map((k) => (
            <TagChip key={k} label={SOURCE_META[k].label} accent={SOURCE_META[k].accent} active={shown.includes(k)} onClick={() => toggleSource(k)} />
          ))}
        </div>

        {allTags.length > 0 && (
          <>
            <span style={labelStyle}>Tags</span>
            {/* Capped and independently scrollable, same as the list tabs, so a
                big tag vocabulary can't push the calendar off screen. */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 88, overflowY: "auto" }}>
              {allTags.map((t) => (
                <TagChip key={t} label={t} active={tagsInEffect.includes(t)} onClick={() => toggleTag(t)} />
              ))}
            </div>
          </>
        )}

        {tagsInEffect.length > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
            <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Match:</span>
            <SegmentedToggle
              options={[
                { key: "all", label: "All tags" },
                { key: "any", label: "Any tag" },
              ]}
              value={tagMatchMode}
              setValue={setTagMatchMode}
            />
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <ActivityCalendar
          year={view.year}
          month={view.month}
          byDate={byDate}
          sourceAccent={SOURCE_ACCENT}
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
        />
      </div>
    </div>
  );
}
