import { formatDate } from "../lib/id.js";
import EntryCard from "./EntryCard.jsx";

// The entries logged on one day, as the same EntryCard the list pages use —
// labelled with each entry's kind, since a day can mix sessions and rolls.
// `hiddenCount` is how many more exist that the current filters are hiding,
// so a filtered view never quietly lies about a day. `sourceMeta` maps each
// entry's `source` to its ENTRY_TYPES entry. Handlers receive the entry.
export default function DayEntries({
  iso,
  entries,
  hiddenCount,
  sourceMeta,
  activeTags,
  onToggleTag,
  onEdit,
  onRedo,
  onDelete,
  onOpen,
  exerciseNameById = new Map(),
  routineNameById = new Map(),
}) {
  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>{formatDate(iso)}</div>

      {entries.length === 0 ? (
        <div style={{ color: "var(--text-dim)", fontSize: 13, padding: "14px 0" }}>
          {hiddenCount > 0 ? "Nothing matches the current filters." : "Nothing logged this day."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {entries.map((e) => {
            const meta = sourceMeta[e.source];
            return (
              <EntryCard
                key={`${e.source}-${e.id}`}
                entry={e}
                kindLabel={meta.singular}
                accent={meta.accent}
                activeTags={activeTags}
                onTagClick={onToggleTag}
                onEdit={() => onEdit(e)}
                onRedo={meta.canRedo ? () => onRedo(e) : undefined}
                onDelete={() => onDelete(e)}
                onOpen={() => onOpen(e)}
                exerciseNameById={exerciseNameById}
                routineNameById={routineNameById}
              />
            );
          })}
        </div>
      )}

      {hiddenCount > 0 && (
        <div style={{ color: "var(--text-dim)", fontSize: 12, marginTop: 10 }}>
          {hiddenCount} more {hiddenCount === 1 ? "entry" : "entries"} hidden by filters.
        </div>
      )}
    </div>
  );
}
