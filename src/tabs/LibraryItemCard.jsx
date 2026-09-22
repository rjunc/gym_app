import { Folder, Pencil, Trash2, ChevronDown, ChevronUp, MoveRight, Shirt } from "lucide-react";
import TagChip from "../ui/TagChip.jsx";
import IconBtn from "../ui/IconBtn.jsx";
import { cardStyle, ghostLinkStyle } from "../ui/styles.js";

export default function LibraryItemCard({ item, pathLabel, isOpen, onToggle, onEdit, onDelete, onJump, onTagClick, activeTags, accent = "--accent2" }) {
  const isLong = (item.text || "").length > 220;
  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{item.name}</div>
            {item.role && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 0.3,
                  color: `var(${accent})`,
                  background: `var(${accent}-dim)`,
                  borderRadius: 5,
                  padding: "2px 6px",
                }}
              >
                {item.role.toUpperCase()}
              </span>
            )}
            {item.giOnly && (
              <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, color: "var(--danger)" }}>
                <Shirt size={11} /> GI ONLY
              </span>
            )}
          </div>
          {(item.position || item.toPosition) && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: `var(${accent})` }}>
              <span>{item.position || "?"}</span>
              <MoveRight size={11} />
              <span>{item.toPosition || "?"}</span>
            </div>
          )}
          {pathLabel && (
            <button onClick={onJump} style={{ ...ghostLinkStyle, fontSize: 11 }}>
              <Folder size={11} /> {pathLabel}
            </button>
          )}
          {item.tags && item.tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {item.tags.map((t) => (
                <TagChip key={t} label={t} small accent={accent} onClick={() => onTagClick(t)} active={activeTags.includes(t)} />
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

      {item.text && (
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
          {item.text}
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
