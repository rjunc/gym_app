import { useState, useMemo } from "react";
import { exercisePickerView } from "../lib/exercises.js";
import { MEASURES, measureOf, lastSetsFor, formatSets } from "../lib/sets.js";
import BottomSheet from "./BottomSheet.jsx";
import TagFilter from "./TagFilter.jsx";
import PickerCard from "./PickerCard.jsx";
import { inputStyle, labelStyle, primaryBtnStyle } from "./styles.js";

// Browse the Library to add exercises to an entry, over the entry form: every
// exercise as a card (active ones first, most used first), narrowed by a
// search box and tag filter — the Library has no folders, tags are its
// categories. Tap a card to preview its notes; Add links it (onAdd). Stays
// open so several can be added; Done (or tapping outside) closes it.
// `addedIds` are the exercises already in the form; `usage` is
// exerciseUsageCounts. With `history` (sessions, when logging sets), each card
// also shows the last sets logged for it before `date`, skipping `entryId`.
export default function ExercisePicker({ exercises, usage = new Map(), addedIds = [], history, date, entryId, onAdd, onClose, accent = "--accent" }) {
  const [query, setQuery] = useState("");
  const [tags, setTags] = useState([]);
  const [tagMode, setTagMode] = useState("all");

  const items = useMemo(() => exercisePickerView({ exercises, query, tags, tagMode, usage }), [exercises, query, tags, tagMode, usage]);
  const hasTags = exercises.some((e) => (e.tags || []).length > 0);

  return (
    <BottomSheet onClose={onClose} gap={12}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>Browse exercises</div>
        <button onClick={onClose} style={{ ...primaryBtnStyle, background: `var(${accent})`, padding: "7px 14px" }}>
          Done
        </button>
      </div>

      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search exercises, notes, prescriptions…" style={inputStyle} />
      {hasTags && (
        <TagFilter
          entries={exercises}
          activeTags={tags}
          onToggle={(t) => setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))}
          matchMode={tagMode}
          setMatchMode={setTagMode}
          accent={accent}
        />
      )}

      {exercises.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--text-dim)", padding: "12px 0" }}>No exercises yet. Add some on the Library page.</div>
      ) : (
        <div>
          <span style={labelStyle}>
            {query.trim() || tags.length > 0 ? `${items.length} match${items.length === 1 ? "" : "es"}` : "Most used first"}
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map((e) => {
              const uses = (usage.get(e.id) || { total: 0 }).total;
              const last = history ? lastSetsFor(history, e.id, { excludeId: entryId, onOrBefore: date }) : null;
              return (
                <PickerCard
                  key={e.id}
                  title={e.active === false ? `${e.name} (inactive)` : e.name}
                  subtitle={[MEASURES[measureOf(e)].label, e.prescription].filter(Boolean).join(" · ")}
                  tags={e.tags || []}
                  meta={[last ? `Last: ${formatSets(last.sets)}` : "", uses > 0 ? `Used in ${uses} session${uses === 1 ? "" : "s"}` : ""].filter(Boolean).join(" · ")}
                  accent={accent}
                  added={addedIds.includes(e.id)}
                  onAdd={() => onAdd(e.id)}
                  preview={
                    e.text ? (
                      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, lineHeight: 1.55, margin: 0, whiteSpace: "pre-wrap" }}>{e.text}</p>
                    ) : undefined
                  }
                />
              );
            })}
            {items.length === 0 && <div style={{ fontSize: 13, color: "var(--text-dim)", padding: "8px 0" }}>No exercises match.</div>}
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
