import { Folder, Pencil, Trash2, ChevronDown, ChevronUp, MoveRight, Shirt, Star } from "lucide-react";
import { formatDate } from "../lib/id.js";
import TagChip from "../ui/TagChip.jsx";
import IconBtn from "../ui/IconBtn.jsx";
import AddButton from "../ui/AddButton.jsx";
import { cardStyle, ghostLinkStyle } from "../ui/styles.js";

export default function LibraryItemCard({
  item,
  pathLabel,
  isOpen,
  onToggle,
  onEdit,
  onDelete,
  onJump,
  onTagClick,
  activeTags,
  onToggleStar,
  accent = "--accent2",
  // Optional usageSummary output (see lib/links.js) — "8 sessions · last …" —
  // shown under the text, for routines.
  usage,
  // Optional: tapping anywhere on the card that isn't one of its buttons
  // (edit, delete, star, folder, a tag chip, show more) calls this, e.g. to
  // open a routine's history sheet.
  onOpen,
  // When the page is opened for picking (see PagePicker): an Add button,
  // shown as "Added" once `added`, which onRemove takes back out. Leave
  // onDelete out to hide Delete.
  onAdd,
  added,
  onRemove,
}) {
  const isLong = (item.text || "").length > 220;
  return (
    <div
      onClick={
        onOpen
          ? (ev) => {
              if (!ev.target.closest("button")) onOpen();
            }
          : undefined
      }
      style={{ ...cardStyle, cursor: onOpen ? "pointer" : undefined }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{item.name}</div>
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
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {onAdd && <AddButton added={added} onAdd={onAdd} onRemove={onRemove} accent={accent} />}
          {onToggleStar && (
            <IconBtn onClick={onToggleStar} active={!!item.starred} label={item.starred ? "Unstar" : "Star as go-to"}>
              <Star size={14} fill={item.starred ? "currentColor" : "none"} />
            </IconBtn>
          )}
          <IconBtn onClick={onEdit} label="Edit">
            <Pencil size={14} />
          </IconBtn>
          {onDelete && (
            <IconBtn onClick={onDelete} danger label="Delete">
              <Trash2 size={14} />
            </IconBtn>
          )}
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

      {usage && usage.text && (
        <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-dim)", fontWeight: 600 }}>
          {usage.text}
          {usage.lastDate && <span style={{ fontWeight: 500 }}> · last {formatDate(usage.lastDate)}</span>}
        </div>
      )}
    </div>
  );
}
