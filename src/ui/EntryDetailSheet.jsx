import { X, BookOpen } from "lucide-react";
import { formatDate, formatDateTime, wasEdited } from "../lib/id.js";
import { formatSet, exerciseNoteOf } from "../lib/sets.js";
import TagChip from "./TagChip.jsx";
import BottomSheet from "./BottomSheet.jsx";
import SheetActions from "./SheetActions.jsx";
import { labelStyle } from "./styles.js";

// Read-only summary of one dated entry (session, journal entry or roll),
// opened by tapping its card: everything the edit form holds, laid out to
// read — the routines it was built from, each linked exercise with every set
// numbered, tags, the full text (never clamped), and when it was logged and
// last edited. Edit, Redo and Delete act on it from here; pass only the ones
// that apply (e.g. no onRedo for journals).
export default function EntryDetailSheet({ entry, kindLabel, accent = "--accent", exerciseNameById = new Map(), routineNameById = new Map(), onEdit, onRedo, onDelete, onClose }) {
  const routineNames = (entry.routineIds || []).map((id) => routineNameById.get(id)).filter(Boolean);
  const sets = entry.sets || {};
  // Linked exercises in their order, then any with sets whose link was since
  // removed (so logged numbers are never hidden). Deleted Library exercises
  // are only kept when they have sets to show.
  const exerciseIds = [...(entry.exerciseIds || []), ...Object.keys(sets).filter((id) => !(entry.exerciseIds || []).includes(id))].filter(
    (id) => exerciseNameById.has(id) || (sets[id] || []).length > 0 || exerciseNoteOf(entry, id)
  );
  const logged = formatDateTime(entry.createdAt);

  return (
    <BottomSheet onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: `var(${accent})` }}>{kindLabel}</span>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{entry.title || formatDate(entry.date)}</div>
          {entry.title && <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{formatDate(entry.date)}</div>}
        </div>
        <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", flexShrink: 0 }}>
          <X size={18} />
        </button>
      </div>

      <SheetActions onEdit={onEdit} onRedo={onRedo} onDelete={onDelete} />

      {routineNames.length > 0 && (
        <div>
          <span style={labelStyle}>Built from</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {routineNames.map((name, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--accent2)", fontWeight: 600 }}>
                <BookOpen size={12} /> {name}
              </div>
            ))}
          </div>
        </div>
      )}

      {exerciseIds.length > 0 && (
        <div>
          <span style={labelStyle}>Exercises</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {exerciseIds.map((id) => {
              const list = sets[id] || [];
              const note = exerciseNoteOf(entry, id);
              return (
                <div key={id} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 10px" }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: `var(${accent})` }}>{exerciseNameById.get(id) || "Deleted exercise"}</div>
                  {list.length === 0 ? (
                    !note && <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>No sets logged</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
                      {list.map((set, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, fontSize: 13 }}>
                          <span style={{ color: "var(--text-dim)", width: 14, textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
                          <span>{formatSet(set)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {note && <div style={{ fontSize: 12, color: "var(--text-dim)", fontStyle: "italic", marginTop: 4 }}>{note}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {entry.tags && entry.tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {entry.tags.map((t) => (
            <TagChip key={t} label={t} small accent={accent} />
          ))}
        </div>
      )}

      {entry.text && (
        <p
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 13,
            lineHeight: 1.55,
            color: "var(--text)",
            margin: 0,
            whiteSpace: "pre-wrap",
          }}
        >
          {entry.text}
        </p>
      )}

      {logged && (
        <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
          Logged {logged}
          {wasEdited(entry) && ` · Edited ${formatDateTime(entry.updatedAt)}`}
        </div>
      )}
    </BottomSheet>
  );
}
