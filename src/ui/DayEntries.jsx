import { CalendarPlus, Plus, Filter } from "lucide-react";
import { formatDate } from "../lib/id.js";
import EntryCard from "./EntryCard.jsx";
import EmptyState from "./EmptyState.jsx";
import { cardStyle, secondaryBtnStyle, metaStyle } from "./styles.js";

// The entries logged on one day, as the same EntryCard the list pages use —
// labelled with each entry's kind, since a day can mix sessions and rolls.
// `hiddenCount` is how many more exist that the current filters are hiding,
// so a filtered view never quietly lies about a day. `sourceMeta` maps each
// entry's `source` to its ENTRY_TYPES entry. `onLog` logs a new entry on this
// day. The other handlers receive the entry.
export default function DayEntries({
  iso,
  isToday = false,
  entries,
  hiddenCount,
  sourceMeta,
  activeTags,
  onToggleTag,
  onLog,
  onEdit,
  onRedo,
  onDelete,
  onOpen,
  exerciseNameById = new Map(),
  routineNameById = new Map(),
}) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "0 2px" }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 600, fontSize: 16, letterSpacing: "-0.01em" }}>{isToday ? "Today" : formatDate(iso)}</h2>
          <div style={metaStyle}>
            {isToday ? `${formatDate(iso)} · ` : ""}
            {entries.length === 0 ? "Nothing logged" : `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`}
          </div>
        </div>
        {entries.length > 0 && onLog && (
          <button onClick={onLog} style={{ ...secondaryBtnStyle, background: "transparent" }}>
            <Plus size={15} /> Add
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <div style={{ ...cardStyle, padding: 0, borderStyle: "dashed", background: "transparent" }}>
          {hiddenCount > 0 ? (
            <EmptyState icon={Filter} compact>
              Nothing here matches the current filters.
            </EmptyState>
          ) : (
            <EmptyState
              icon={CalendarPlus}
              compact
              action={
                onLog && (
                  <button onClick={onLog} style={secondaryBtnStyle}>
                    <Plus size={15} /> Log {isToday ? "today" : "this day"}
                  </button>
                )
              }
            >
              Nothing logged {isToday ? "today" : "this day"} yet.
            </EmptyState>
          )}
        </div>
      ) : (
        entries.map((e) => {
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
        })
      )}

      {hiddenCount > 0 && (
        <div style={{ ...metaStyle, padding: "0 2px" }}>
          {hiddenCount} more {hiddenCount === 1 ? "entry" : "entries"} hidden by filters.
        </div>
      )}
    </section>
  );
}
