import { Folder, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import TagChip from "../ui/TagChip.jsx";
import IconBtn from "../ui/IconBtn.jsx";
import { cardStyle, ghostLinkStyle } from "../ui/styles.js";

export default function RoutineCard({ routine, pathLabel, isOpen, onToggle, onEdit, onDelete, onJump, onTagClick, activeTags }) {
  const isLong = (routine.text || "").length > 220;
  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{routine.name}</div>
          {pathLabel && (
            <button onClick={onJump} style={{ ...ghostLinkStyle, fontSize: 11 }}>
              <Folder size={11} /> {pathLabel}
            </button>
          )}
          {routine.tags && routine.tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {routine.tags.map((t) => (
                <TagChip key={t} label={t} small accent="--accent2" onClick={() => onTagClick(t)} active={activeTags.includes(t)} />
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <IconBtn onClick={onEdit}>
            <Pencil size={14} />
          </IconBtn>
          <IconBtn onClick={onDelete} danger>
            <Trash2 size={14} />
          </IconBtn>
        </div>
      </div>

      {routine.text && (
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
          {routine.text}
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
