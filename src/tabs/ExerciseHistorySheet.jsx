import { useState } from "react";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { formatDate } from "../lib/id.js";
import { exerciseHistory } from "../lib/exercises.js";
import { MEASURES, measureOf, formatSets } from "../lib/sets.js";
import TagChip from "../ui/TagChip.jsx";
import { cardStyle, ghostLinkStyle, labelStyle } from "../ui/styles.js";

const KIND_META = {
  session: { label: "Session", accent: "--accent" },
  journal: { label: "Journal", accent: "--accent3" },
};

// Read-only bottom sheet opened by tapping an exercise in the Library: the
// routines that include it, then every session and journal entry that links
// it as one newest-first timeline, so you can see what you actually did with
// it each time. `routines` arrive as { id, label } with the folder path
// already in the label (see routineOptions).
export default function ExerciseHistorySheet({ exercise, accent, sessions, journals, routines, onClose }) {
  const history = exerciseHistory(sessions, journals);

  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", zIndex: 10 }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          borderTop: "1px solid var(--border)",
          borderRadius: "16px 16px 0 0",
          width: "100%",
          maxHeight: "88%",
          display: "flex",
          flexDirection: "column",
          padding: 18,
          gap: 14,
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{exercise.name}</div>
            {exercise.prescription && <div style={{ fontSize: 12, color: `var(${accent})`, fontWeight: 600 }}>{exercise.prescription}</div>}
            <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Logged as {MEASURES[measureOf(exercise)].label.toLowerCase()}</div>
            {exercise.tags && exercise.tags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {exercise.tags.map((t) => (
                  <TagChip key={t} label={t} small accent={accent} />
                ))}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", flexShrink: 0 }}>
            <X size={18} />
          </button>
        </div>

        {routines.length > 0 && (
          <div>
            <span style={labelStyle}>In {routines.length === 1 ? "1 routine" : `${routines.length} routines`}</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {routines.map((r) => (
                <div key={r.id} style={{ fontSize: 13 }}>
                  {r.label}
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <span style={labelStyle}>
            {history.length === 0 ? "History" : `History · ${history.length} ${history.length === 1 ? "entry" : "entries"}`}
          </span>
          {history.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-dim)", padding: "8px 0" }}>Not used in any sessions or journal entries yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {history.map(({ kind, entry }) => (
                <HistoryEntry key={`${kind}-${entry.id}`} kind={kind} entry={entry} exerciseId={exercise.id} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// One read-only entry in the timeline: date, a Session/Journal label in that
// type's colour, title, the sets logged for this exercise (sessions only),
// tags and text (long text clamps to 5 lines, like the entry cards elsewhere).
function HistoryEntry({ kind, entry, exerciseId }) {
  const [open, setOpen] = useState(false);
  const meta = KIND_META[kind];
  const isLong = (entry.text || "").length > 220;
  return (
    <div style={{ ...cardStyle, background: "var(--surface-2)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{formatDate(entry.date)}</span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 0.3,
            color: `var(${meta.accent})`,
            background: `var(${meta.accent}-dim)`,
            borderRadius: 999,
            padding: "1px 7px",
          }}
        >
          {meta.label.toUpperCase()}
        </span>
      </div>
      {entry.title && <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>{entry.title}</div>}
      {entry.sets && (entry.sets[exerciseId] || []).length > 0 && (
        <div style={{ fontSize: 13, fontWeight: 700, color: `var(${meta.accent})`, marginTop: 4 }}>{formatSets(entry.sets[exerciseId])}</div>
      )}
      {entry.tags && entry.tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
          {entry.tags.map((t) => (
            <TagChip key={t} label={t} small accent={meta.accent} />
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
            marginTop: 8,
            marginBottom: 0,
            whiteSpace: "pre-wrap",
            display: "-webkit-box",
            WebkitLineClamp: open || !isLong ? "unset" : 5,
            WebkitBoxOrient: "vertical",
            overflow: open || !isLong ? "visible" : "hidden",
          }}
        >
          {entry.text}
        </p>
      )}
      {isLong && (
        <button onClick={() => setOpen((v) => !v)} style={{ ...ghostLinkStyle, marginTop: 6 }}>
          {open ? (
            <>
              Show less <ChevronUp size={13} />
            </>
          ) : (
            <>
              Show more <ChevronDown size={13} />
            </>
          )}
        </button>
      )}
    </div>
  );
}
