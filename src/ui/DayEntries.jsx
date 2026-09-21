import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { formatDate } from "../lib/id.js";
import TagChip from "./TagChip.jsx";
import { cardStyle, ghostLinkStyle } from "./styles.js";

function Entry({ entry, sourceLabel, accent, activeTags, onToggleTag }) {
  const [open, setOpen] = useState(false);
  const isLong = (entry.text || "").length > 220;
  return (
    <div style={{ ...cardStyle, borderLeft: `3px solid var(${accent})` }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: `var(${accent})` }}>
          {sourceLabel}
        </span>
        {entry.title && <span style={{ fontWeight: 700, fontSize: 13 }}>{entry.title}</span>}
      </div>

      {entry.tags && entry.tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
          {entry.tags.map((t) => (
            <TagChip key={t} label={t} small accent={accent} active={activeTags.includes(t)} onClick={() => onToggleTag(t)} />
          ))}
        </div>
      )}

      <p
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 13,
          lineHeight: 1.55,
          margin: 0,
          whiteSpace: "pre-wrap",
          display: "-webkit-box",
          WebkitLineClamp: open || !isLong ? "unset" : 5,
          WebkitBoxOrient: "vertical",
          overflow: open || !isLong ? "visible" : "hidden",
        }}
      >
        {entry.text}
      </p>

      {isLong && (
        <button onClick={() => setOpen(!open)} style={{ ...ghostLinkStyle, marginTop: 6 }}>
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

// The entries logged on one day. `hiddenCount` is how many more exist that the
// current filters are hiding, so a filtered view never quietly lies about a day.
export default function DayEntries({ iso, entries, hiddenCount, sourceMeta, activeTags, onToggleTag }) {
  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>{formatDate(iso)}</div>

      {entries.length === 0 ? (
        <div style={{ color: "var(--text-dim)", fontSize: 13, padding: "14px 0" }}>
          {hiddenCount > 0 ? "Nothing matches the current filters." : "Nothing logged this day."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {entries.map((e) => (
            <Entry
              key={`${e.source}-${e.id}`}
              entry={e}
              sourceLabel={sourceMeta[e.source].singular}
              accent={sourceMeta[e.source].accent}
              activeTags={activeTags}
              onToggleTag={onToggleTag}
            />
          ))}
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
