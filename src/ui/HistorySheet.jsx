import { useState } from "react";
import { ChevronDown, ChevronUp, History } from "lucide-react";
import { formatDate } from "../lib/id.js";
import { entryHistory } from "../lib/links.js";
import { ENTRY_TYPES } from "../lib/entryTypes.js";
import TagChip from "./TagChip.jsx";
import BottomSheet, { SheetHeader } from "./BottomSheet.jsx";
import EmptyState from "./EmptyState.jsx";
import SheetActions from "./SheetActions.jsx";
import { useSheets } from "../lib/SheetStack.js";
import { cardStyle, ghostLinkStyle, labelStyle, noteTextStyle, clamp, eyebrowStyle, chipRowStyle } from "./styles.js";

// entryHistory's kinds, with their settings from ENTRY_TYPES and the log
// each lives in.
const KIND_META = { session: ENTRY_TYPES.sessions, journal: ENTRY_TYPES.journals, roll: ENTRY_TYPES.rolls };
const KIND_SOURCE = { session: "sessions", journal: "journals", roll: "rolls" };

// Read-only bottom sheet for something that dated entries link to (a Library
// exercise, a routine): `eyebrow`, `title` and `meta` at the top (see
// SheetHeader) with Edit and Delete, then `header` (tags, positions),
// `children` for anything in between, then every session and journal entry
// that links it as one newest-first timeline. `detail(entry)` renders what's
// specific to this kind of link under each entry's title (e.g. the sets
// logged for an exercise); `emptyLabel` shows when nothing links it yet.
// `onEdit`/`onDelete` add those buttons under the header.
// Tapping an entry in the timeline opens its full summary on top (see
// SheetStack), where it can be edited too. `onBack` adds a Back button when
// this sheet is itself on top of another.
export default function HistorySheet({ eyebrow, accent, title, meta, header, sessions = [], journals = [], rolls = [], detail, emptyLabel, onEdit, onDelete, onBack, onClose, children }) {
  const history = entryHistory(sessions, journals, rolls);
  const sheets = useSheets();

  return (
    <BottomSheet
      onClose={onClose}
      header={
        <SheetHeader eyebrow={eyebrow} accent={accent} title={title} meta={meta} onBack={onBack} onClose={onClose}>
          <SheetActions onEdit={onEdit} onDelete={onDelete} />
        </SheetHeader>
      }
    >
      {header}

      {children}

      <div>
        <span style={{ ...labelStyle, marginBottom: 10 }}>
          History{history.length > 0 && <span style={{ fontWeight: 500 }}> · {history.length} {history.length === 1 ? "entry" : "entries"}</span>}
        </span>
        {history.length === 0 ? (
          <div style={{ ...cardStyle, padding: 0, borderStyle: "dashed" }}>
            <EmptyState icon={History} compact>
              {emptyLabel}
            </EmptyState>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {history.map(({ kind, entry }) => (
              <HistoryEntry
                key={`${kind}-${entry.id}`}
                kind={kind}
                entry={entry}
                detail={detail}
                onOpen={sheets ? () => sheets.open({ kind: "entry", source: KIND_SOURCE[kind], id: entry.id }) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

// One read-only entry in the timeline: date, a Session/Journal label in that
// type's colour, title, `detail(entry, accent)`, tags and text (long text
// clamps to 5 lines, like the entry cards elsewhere). Tapping it anywhere but
// Show more calls onOpen.
function HistoryEntry({ kind, entry, detail, onOpen }) {
  const [open, setOpen] = useState(false);
  const meta = KIND_META[kind];
  const isLong = (entry.text || "").length > 220;
  return (
    <div
      onClick={(ev) => {
        if (onOpen && !ev.target.closest("button")) onOpen();
      }}
      className="card-click"
      style={{ ...cardStyle, padding: 14 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ ...eyebrowStyle, fontSize: 10, color: `var(${meta.accent})`, background: `var(${meta.accent}-dim)`, borderRadius: 999, padding: "2px 8px" }}>{meta.singular}</span>
        <span style={{ fontSize: 12, color: "var(--text-dim)" }}>{formatDate(entry.date)}</span>
      </div>
      {entry.title && <div style={{ fontWeight: 600, fontSize: 15, marginTop: 6 }}>{entry.title}</div>}
      {detail && detail(entry, meta.accent)}
      {entry.tags && entry.tags.length > 0 && (
        <div style={{ ...chipRowStyle, marginTop: 8 }}>
          {entry.tags.map((t) => (
            <TagChip key={t} label={t} small accent={meta.accent} />
          ))}
        </div>
      )}
      {entry.text && (
        <p style={{ ...noteTextStyle, fontSize: 13, color: "var(--text-dim)", marginTop: 8, ...clamp(open || !isLong) }}>{entry.text}</p>
      )}
      {isLong && (
        <button onClick={() => setOpen((v) => !v)} style={{ ...ghostLinkStyle, fontSize: 12, marginTop: 6, color: "var(--text-dim)" }}>
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
