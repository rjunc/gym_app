import { Pencil, Trash2, Repeat, ChevronDown, ChevronUp } from "lucide-react";
import { formatDate } from "../lib/id.js";
import TagChip from "../ui/TagChip.jsx";
import IconBtn from "../ui/IconBtn.jsx";
import { cardStyle, ghostLinkStyle } from "../ui/styles.js";
import SetsSummary from "../ui/SetsSummary.jsx";
import RoutineLinks from "../ui/RoutineLinks.jsx";

export default function SimpleEntryCard({ entry, accent, isOpen, onToggle, onEdit, onDelete, onRedo, activeTags, onTagClick, exerciseNameById = new Map(), routineNameById = new Map() }) {
  const s = entry;
  const isLong = (s.text || "").length > 220;
  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {s.title ? (
            <>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{s.title}</div>
              <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{formatDate(s.date)}</div>
            </>
          ) : (
            <div style={{ fontWeight: 700, fontSize: 13 }}>{formatDate(s.date)}</div>
          )}
          <RoutineLinks entry={s} routineNameById={routineNameById} />
          {s.tags && s.tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {s.tags.map((t) => (
                <TagChip key={t} label={t} small accent={accent} onClick={() => onTagClick(t)} active={activeTags.includes(t)} />
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

      <SetsSummary entry={s} exerciseNameById={exerciseNameById} accent={accent} style={{ marginTop: 8 }} />

      {s.text && (
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
            WebkitLineClamp: isOpen || !isLong ? "unset" : 5,
            WebkitBoxOrient: "vertical",
            overflow: isOpen || !isLong ? "visible" : "hidden",
          }}
        >
          {s.text}
        </p>
      )}

      {isLong && (
        <button onClick={onToggle} style={{ ...ghostLinkStyle, marginTop: 6 }}>
          {isOpen ? (
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
