import { useState } from "react";
import { Pencil, Trash2, Repeat, ChevronDown, ChevronUp } from "lucide-react";
import { formatDate } from "../lib/id.js";
import TagChip from "./TagChip.jsx";
import IconBtn from "./IconBtn.jsx";
import SetsSummary from "./SetsSummary.jsx";
import { MatSummary } from "./MatDetail.jsx";
import RoutineLinks from "./RoutineLinks.jsx";
import { cardStyle, ghostLinkStyle, eyebrowStyle, metaStyle, noteTextStyle, clamp, chipRowStyle } from "./styles.js";

// One dated entry (session, journal entry or mat session) as a card — the
// same card on Home's day list and on the Sessions/Journals/Mat sessions
// pages. Shows the title, the routines it was built from, logged sets or a
// mat session's drills and rounds in brief, text (long text clamps to 4
// lines with Show more) and tags.
//
// The two places differ only through props:
//   kindLabel  Home passes the entry's kind ("Session") — shown above the
//              title in its colour — since its list mixes kinds.
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
  const isLong = (entry.text || "").length > 200;
  // Without a title, the list pages lead with the date instead.
  const heading = entry.title || (showDate ? formatDate(entry.date) : "");
  return (
    <div
      onClick={(ev) => {
        if (onOpen && !ev.target.closest("button")) onOpen();
      }}
      className={onOpen ? "card-click" : undefined}
      style={cardStyle}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0, paddingTop: 2 }}>
          {kindLabel && (
            <span style={{ ...eyebrowStyle, display: "inline-flex", alignItems: "center", gap: 6, color: `var(${accent})` }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: `var(${accent})` }} />
              {kindLabel}
            </span>
          )}
          {heading && <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.35 }}>{heading}</div>}
          {showDate && entry.title && <div style={metaStyle}>{formatDate(entry.date)}</div>}
          <RoutineLinks entry={entry} routineNameById={routineNameById} style={{ marginTop: 2 }} />
        </div>
        <div style={{ display: "flex", gap: 0, flexShrink: 0, margin: "-4px -6px 0 0" }}>
          {onRedo && (
            <IconBtn onClick={onRedo} label="Redo">
              <Repeat size={16} />
            </IconBtn>
          )}
          <IconBtn onClick={onEdit} label="Edit">
            <Pencil size={16} />
          </IconBtn>
          <IconBtn onClick={onDelete} danger label="Delete">
            <Trash2 size={16} />
          </IconBtn>
        </div>
      </div>

      <SetsSummary entry={entry} exerciseNameById={exerciseNameById} accent={accent} style={{ marginTop: 10 }} />
      <MatSummary entry={entry} accent={accent} style={{ marginTop: 10 }} />

      {entry.text && <p style={{ ...noteTextStyle, fontSize: 13, color: "var(--text-dim)", marginTop: 10, ...clamp(open || !isLong, 4) }}>{entry.text}</p>}

      {isLong && (
        <button onClick={() => setOpen((v) => !v)} style={{ ...ghostLinkStyle, fontSize: 12, color: "var(--text-dim)", marginTop: 6 }}>
          {open ? (
            <>
              Show less <ChevronUp size={14} />
            </>
          ) : (
            <>
              Show more <ChevronDown size={14} />
            </>
          )}
        </button>
      )}

      {entry.tags && entry.tags.length > 0 && (
        <div style={{ ...chipRowStyle, gap: 5, marginTop: 12 }}>
          {entry.tags.map((t) => (
            <TagChip key={t} label={t} small accent={accent} onClick={onTagClick ? () => onTagClick(t) : undefined} active={activeTags.includes(t)} />
          ))}
        </div>
      )}
    </div>
  );
}
