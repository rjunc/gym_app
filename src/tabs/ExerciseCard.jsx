import { Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { formatDate } from "../lib/id.js";
import { usageSummary } from "../lib/links.js";
import TagChip from "../ui/TagChip.jsx";
import IconBtn from "../ui/IconBtn.jsx";
import AddButton from "../ui/AddButton.jsx";
import { cardStyle, ghostLinkStyle } from "../ui/styles.js";

export default function ExerciseCard({
  exercise,
  accent,
  isOpen,
  onToggle,
  onEdit,
  onDelete,
  activeTags,
  onTagClick,
  // Tapping anywhere on the card that isn't one of its buttons (edit, delete,
  // a tag chip, show more) opens the exercise's history sheet.
  onOpen,
  // When the Library is opened for picking (see PagePicker): an Add button,
  // shown as "Added" once `added`, which onRemove takes back out. Leave
  // onDelete out to hide Delete.
  onAdd,
  added,
  onRemove,
  usedInSessions = [],
  usedInJournals = [],
  usedInRoutines = [],
}) {
  const e = exercise;
  const isLong = (e.text || "").length > 220;
  const inactive = e.active === false;
  const usage = usageSummary({ sessions: usedInSessions, journals: usedInJournals, routines: usedInRoutines });
  return (
    <div
      onClick={(ev) => {
        if (!ev.target.closest("button")) onOpen();
      }}
      style={{ ...cardStyle, opacity: inactive ? 0.6 : 1, cursor: "pointer" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{e.name}</div>
            {inactive && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 0.3,
                  color: "var(--text-dim)",
                  border: "1px solid var(--border)",
                  borderRadius: 999,
                  padding: "1px 7px",
                }}
              >
                INACTIVE
              </span>
            )}
          </div>
          {e.prescription && <div style={{ fontSize: 12, color: `var(${accent})`, fontWeight: 600 }}>{e.prescription}</div>}
          {e.tags && e.tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {e.tags.map((t) => (
                <TagChip key={t} label={t} small accent={accent} onClick={() => onTagClick(t)} active={activeTags.includes(t)} />
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {onAdd && <AddButton added={added} onAdd={onAdd} onRemove={onRemove} accent={accent} />}
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

      {e.text && (
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
          {e.text}
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

      {usage.text && (
        <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-dim)", fontWeight: 600 }}>
          {usage.text}
          {usage.lastDate && <span style={{ fontWeight: 500 }}> · last {formatDate(usage.lastDate)}</span>}
        </div>
      )}
    </div>
  );
}
