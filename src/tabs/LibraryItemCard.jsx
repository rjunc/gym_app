import { Folder, Pencil, Trash2, ChevronDown, ChevronUp, MoveRight, Shirt, Star } from "lucide-react";
import { formatDate } from "../lib/id.js";
import TagChip from "../ui/TagChip.jsx";
import IconBtn from "../ui/IconBtn.jsx";
import AddButton from "../ui/AddButton.jsx";
import { cardStyle, ghostLinkStyle, noteTextStyle, clamp, metaStyle, chipRowStyle } from "../ui/styles.js";

// The "Gi only" mark on a technique.
export function GiOnlyBadge() {
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "var(--danger)", background: "var(--danger-dim)", borderRadius: 999, padding: "2px 8px", whiteSpace: "nowrap" }}
    >
      <Shirt size={12} /> Gi only
    </span>
  );
}

// A card's action buttons, top right: Add when picking, then star, edit and
// delete (each only when it applies).
export function CardActions({ onAdd, added, onRemove, accent, starred, onToggleStar, onEdit, onDelete }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, flexShrink: 0, margin: "-4px -6px 0 0" }}>
      {onAdd && (
        <div style={{ marginRight: 4 }}>
          <AddButton added={added} onAdd={onAdd} onRemove={onRemove} accent={accent} />
        </div>
      )}
      {onToggleStar && (
        <IconBtn onClick={onToggleStar} active={!!starred} label={starred ? "Unstar" : "Star as go-to"}>
          <Star size={16} fill={starred ? "currentColor" : "none"} />
        </IconBtn>
      )}
      {onEdit && (
        <IconBtn onClick={onEdit} label="Edit">
          <Pencil size={16} />
        </IconBtn>
      )}
      {onDelete && (
        <IconBtn onClick={onDelete} danger label="Delete">
          <Trash2 size={16} />
        </IconBtn>
      )}
    </div>
  );
}

// "8 sessions · last Sep 11, 2026", under a card.
export function UsageLine({ usage }) {
  if (!usage || !usage.text) return null;
  return (
    <div style={{ ...metaStyle, marginTop: 12 }}>
      <span style={{ fontWeight: 600 }}>{usage.text}</span>
      {usage.lastDate && <span> · last {formatDate(usage.lastDate)}</span>}
    </div>
  );
}

// Show more / Show less under a clamped note.
export function ShowMore({ open, onToggle }) {
  return (
    <button onClick={onToggle} style={{ ...ghostLinkStyle, fontSize: 12, color: "var(--text-dim)", marginTop: 6 }}>
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
  );
}

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
  // Optional content shown under the title, above the text (a routine's plan
  // in brief).
  summary,
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
  const isLong = (item.text || "").length > 200;
  return (
    <div
      onClick={
        onOpen
          ? (ev) => {
              if (!ev.target.closest("button")) onOpen();
            }
          : undefined
      }
      className={onOpen ? "card-click" : undefined}
      style={cardStyle}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, paddingTop: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.35 }}>{item.name}</div>
            {item.giOnly && <GiOnlyBadge />}
          </div>
          {(item.position || item.toPosition) && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: `var(${accent})` }}>
              <span>{item.position || "?"}</span>
              <MoveRight size={13} style={{ flexShrink: 0 }} />
              <span>{item.toPosition || "?"}</span>
            </div>
          )}
          {pathLabel && (
            <button onClick={onJump} title="Go to this folder" style={{ ...ghostLinkStyle, fontSize: 12, fontWeight: 500, color: "var(--text-dim)", alignSelf: "flex-start" }}>
              <Folder size={12} /> {pathLabel}
            </button>
          )}
        </div>
        <CardActions
          onAdd={onAdd}
          added={added}
          onRemove={onRemove}
          accent={accent}
          starred={item.starred}
          onToggleStar={onToggleStar}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>

      {summary}

      {item.text && <p style={{ ...noteTextStyle, fontSize: 13, color: "var(--text-dim)", marginTop: 10, ...clamp(isOpen || !isLong, 4) }}>{item.text}</p>}
      {isLong && <ShowMore open={isOpen} onToggle={onToggle} />}

      {item.tags && item.tags.length > 0 && (
        <div style={{ ...chipRowStyle, gap: 5, marginTop: 12 }}>
          {item.tags.map((t) => (
            <TagChip key={t} label={t} small accent={accent} onClick={() => onTagClick(t)} active={activeTags.includes(t)} />
          ))}
        </div>
      )}

      <UsageLine usage={usage} />
    </div>
  );
}
