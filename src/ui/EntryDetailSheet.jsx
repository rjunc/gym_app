import { X, BookOpen, CornerDownRight } from "lucide-react";
import { formatDate, formatDateTime, wasEdited } from "../lib/id.js";
import { formatSet } from "../lib/sets.js";
import { layoutBlocks, GROUP_KINDS } from "../lib/groups.js";
import TagChip from "./TagChip.jsx";
import BottomSheet from "./BottomSheet.jsx";
import SheetActions from "./SheetActions.jsx";
import { BackButton, SheetLink } from "./SheetNav.jsx";
import { labelStyle } from "./styles.js";

// Read-only summary of one dated entry (session, journal entry or roll),
// opened by tapping its card: everything the edit form holds, laid out to
// read — the routines it was built from, what was done in order (a session's
// blocks, numbered, with supersets/circuits bracketed together and every set
// listed, drops marked ↳; a journal's linked exercises), tags, the full text
// (never clamped), and when it was logged and last edited. Edit, Redo and Delete act on it from here; pass only the ones
// that apply (e.g. no onRedo for journals).
// Its routines and exercises are links that open their own sheets on top
// (see SheetStack); `onBack` adds a Back button when this sheet is itself on
// top of another.
export default function EntryDetailSheet({ entry, kindLabel, accent = "--accent", exerciseNameById = new Map(), routineNameById = new Map(), onEdit, onRedo, onDelete, onBack, onClose }) {
  const routineIds = (entry.routineIds || []).filter((id) => routineNameById.has(id));
  // A session's blocks in order (numbered, since the order is what was done),
  // or a journal's linked exercises. A deleted Library exercise is only kept
  // when there's something logged under it.
  const isSession = Array.isArray(entry.blocks);
  const blocks = (isSession ? entry.blocks : (entry.exerciseIds || []).map((exerciseId) => ({ id: exerciseId, exerciseId, sets: [] }))).filter(
    (b) => exerciseNameById.has(b.exerciseId) || (b.sets || []).length > 0 || b.note
  );
  const items = layoutBlocks(blocks, isSession ? entry.groups : []);

  const blockCard = (b, label) => {
    const list = b.sets || [];
    let setNumber = 0;
    return (
      <div key={b.id} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 10px" }}>
        <div style={{ display: "flex", gap: 6, fontWeight: 700, fontSize: 13, color: `var(${accent})` }}>
          {isSession && <span style={{ color: "var(--text-dim)", minWidth: 14, flexShrink: 0 }}>{label}</span>}
          {exerciseNameById.has(b.exerciseId) ? <SheetLink sheet={{ kind: "exercise", id: b.exerciseId }}>{exerciseNameById.get(b.exerciseId)}</SheetLink> : "Deleted exercise"}
        </div>
        {list.length === 0 ? (
          isSession && !b.note && <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>No sets logged</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
            {list.map((set, i) => {
              const isDrop = set.drop && i > 0;
              if (!isDrop) setNumber += 1;
              return (
                <div key={i} style={{ display: "flex", gap: 8, fontSize: 13 }}>
                  <span style={{ color: "var(--text-dim)", width: 14, textAlign: "right", flexShrink: 0 }}>{isDrop ? <CornerDownRight size={11} /> : setNumber}</span>
                  <span>{formatSet(set)}</span>
                </div>
              );
            })}
          </div>
        )}
        {b.note && <div style={{ fontSize: 12, color: "var(--text-dim)", fontStyle: "italic", marginTop: 4 }}>{b.note}</div>}
      </div>
    );
  };
  const logged = formatDateTime(entry.createdAt);

  return (
    <BottomSheet onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          {onBack && <BackButton onBack={onBack} />}
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: `var(${accent})` }}>{kindLabel}</span>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{entry.title || formatDate(entry.date)}</div>
          {entry.title && <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{formatDate(entry.date)}</div>}
        </div>
        <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", flexShrink: 0 }}>
          <X size={18} />
        </button>
      </div>

      <SheetActions onEdit={onEdit} onRedo={onRedo} onDelete={onDelete} />

      {routineIds.length > 0 && (
        <div>
          <span style={labelStyle}>Built from</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {routineIds.map((id) => (
              <div key={id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--accent2)", fontWeight: 600 }}>
                <BookOpen size={12} /> <SheetLink sheet={{ kind: "routine", id }}>{routineNameById.get(id)}</SheetLink>
              </div>
            ))}
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div>
          <span style={labelStyle}>Exercises</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map((item) =>
              item.type === "block" ? (
                blockCard(item.block, item.label)
              ) : (
                <div key={item.group.id} style={{ borderLeft: `3px solid var(${accent})`, paddingLeft: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: `var(${accent})` }}>
                    <span style={{ color: "var(--text-dim)", marginRight: 6 }}>{item.number}</span>
                    {GROUP_KINDS[item.group.kind]}
                  </div>
                  {item.members.map((m) => blockCard(m.block, m.label))}
                </div>
              )
            )}
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
