import { useState } from "react";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { formatDate } from "../lib/id.js";
import { entryHistory } from "../lib/links.js";
import { ENTRY_TYPES } from "../lib/entryTypes.js";
import TagChip from "./TagChip.jsx";
import BottomSheet from "./BottomSheet.jsx";
import SheetActions from "./SheetActions.jsx";
import { useSheets } from "../lib/SheetStack.js";
import { BackButton } from "./SheetNav.jsx";
import { cardStyle, ghostLinkStyle, labelStyle } from "./styles.js";

// entryHistory's kinds, with their settings from ENTRY_TYPES and the log
// each lives in.
const KIND_META = { session: ENTRY_TYPES.sessions, journal: ENTRY_TYPES.journals };
const KIND_SOURCE = { session: "sessions", journal: "journals" };

// Read-only bottom sheet for something that dated entries link to (a Library
// exercise, a routine): `header` at the top next to the close button,
// `children` for anything in between, then every session and journal entry
// that links it as one newest-first timeline. `detail(entry)` renders what's
// specific to this kind of link under each entry's title (e.g. the sets
// logged for an exercise); `emptyLabel` shows when nothing links it yet.
// `onEdit`/`onDelete` add those buttons under the header.
// Tapping an entry in the timeline opens its full summary on top (see
// SheetStack), where it can be edited too. `onBack` adds a Back button when
// this sheet is itself on top of another.
export default function HistorySheet({ header, sessions, journals, detail, emptyLabel, onEdit, onDelete, onBack, onClose, children }) {
  const history = entryHistory(sessions, journals);
  const sheets = useSheets();

  return (
    <>
      <BottomSheet onClose={onClose}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
            {onBack && <BackButton onBack={onBack} />}
            {header}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", flexShrink: 0 }}>
            <X size={18} />
          </button>
        </div>

        <SheetActions onEdit={onEdit} onDelete={onDelete} />

        {children}

        <div>
          <span style={labelStyle}>
            {history.length === 0 ? "History" : `History · ${history.length} ${history.length === 1 ? "entry" : "entries"}`}
          </span>
          {history.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-dim)", padding: "8px 0" }}>{emptyLabel}</div>
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

    </>
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
      style={{ ...cardStyle, background: "var(--surface-2)", cursor: "pointer" }}
    >
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
          {meta.singular.toUpperCase()}
        </span>
      </div>
      {entry.title && <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>{entry.title}</div>}
      {detail && detail(entry, meta.accent)}
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
