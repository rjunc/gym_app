import { useState } from "react";
import { Pencil, Trash2, Repeat, ChevronDown, ChevronUp } from "lucide-react";
import { formatDate } from "../lib/id.js";
import TagChip from "./TagChip.jsx";
import IconBtn from "./IconBtn.jsx";
import SetsSummary from "./SetsSummary.jsx";
import RoutineLinks from "./RoutineLinks.jsx";
import { cardStyle, ghostLinkStyle } from "./styles.js";

// One dated entry (session, journal entry or roll) as a card — the same card
// on Home's day list and on the Sessions/Journals/Rolls pages. Shows the
// title, the routines it was built from, tags, logged sets and text (long
// text clamps to 5 lines with Show more).
//
// The two places differ only through props:
//   kindLabel  Home passes the entry's kind ("Session") — shown above the
//              title, with a coloured left edge — since its list mixes kinds.
//   showDate   the list pages show the date; Home's list sits under the day's
//              own heading, so it doesn't.
// Tapping anywhere that isn't a button (redo, edit, delete, a tag chip, show
// more) calls onOpen, which opens the entry's summary. onRedo is optional.
export default function EntryCard({
  entry,
  accent = "--accent",
  kindLabel,
  showDate = false,
  exerciseNameById = new Map(),
  routineNameById = new Map(),
  activeTags = [],
  onTagClick,
  onOpen,
  onEdit,
  onRedo,
  onDelete,
}) {
  const [open, setOpen] = useState(false);
  const isLong = (entry.text || "").length > 220;
  // Without a title, the list pages lead with the date instead.
  const heading = entry.title || (showDate ? formatDate(entry.date) : "");
  return (
    <div
      onClick={(ev) => {
        if (onOpen && !ev.target.closest("button")) onOpen();
      }}
      style={{
        ...cardStyle,
        ...(kindLabel ? { borderLeft: `3px solid var(${accent})` } : {}),
        cursor: onOpen ? "pointer" : undefined,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          {kindLabel && (
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: `var(${accent})` }}>{kindLabel}</span>
          )}
          {heading && <div style={{ fontWeight: 700, fontSize: 13 }}>{heading}</div>}
          {showDate && entry.title && <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{formatDate(entry.date)}</div>}
          <RoutineLinks entry={entry} routineNameById={routineNameById} />
          {entry.tags && entry.tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {entry.tags.map((t) => (
                <TagChip key={t} label={t} small accent={accent} onClick={onTagClick ? () => onTagClick(t) : undefined} active={activeTags.includes(t)} />
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {onRedo && (
            <IconBtn onClick={onRedo} label="Redo">
              <Repeat size={14} />
            </IconBtn>
          )}
          <IconBtn onClick={onEdit} label="Edit">
            <Pencil size={14} />
          </IconBtn>
          <IconBtn onClick={onDelete} danger label="Delete">
            <Trash2 size={14} />
          </IconBtn>
        </div>
      </div>

      <SetsSummary entry={entry} exerciseNameById={exerciseNameById} accent={accent} style={{ marginTop: 8 }} />

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
