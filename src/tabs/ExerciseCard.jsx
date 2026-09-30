import { Folder } from "lucide-react";
import { usageSummary } from "../lib/links.js";
import TagChip from "../ui/TagChip.jsx";
import { CardActions, UsageLine, ShowMore } from "./LibraryItemCard.jsx";
import { cardStyle, noteTextStyle, clamp, chipRowStyle, ghostLinkStyle } from "../ui/styles.js";

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
  // In search results: the exercise's folder path, which onJump goes to.
  pathLabel,
  onJump,
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
  const isLong = (e.text || "").length > 200;
  const inactive = e.active === false;
  const usage = usageSummary({ sessions: usedInSessions, journals: usedInJournals, routines: usedInRoutines });
  return (
    <div
      onClick={(ev) => {
        if (!ev.target.closest("button")) onOpen();
      }}
      className="card-click"
      style={cardStyle}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, paddingTop: 2, opacity: inactive ? 0.65 : 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.35 }}>{e.name}</div>
            {inactive && (
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-dim)", background: "var(--surface-3)", borderRadius: 999, padding: "2px 8px" }}>Inactive</span>
            )}
          </div>
          {e.prescription && <div style={{ fontSize: 13, color: `var(${accent})`, fontWeight: 500 }}>{e.prescription}</div>}
          {pathLabel && (
            <button onClick={onJump} title="Go to this folder" style={{ ...ghostLinkStyle, fontSize: 12, fontWeight: 500, color: "var(--text-dim)", alignSelf: "flex-start" }}>
              <Folder size={12} /> {pathLabel}
            </button>
          )}
        </div>
        <CardActions onAdd={onAdd} added={added} onRemove={onRemove} accent={accent} onEdit={onEdit} onDelete={onDelete} />
      </div>

      {e.text && <p style={{ ...noteTextStyle, fontSize: 13, color: "var(--text-dim)", marginTop: 10, ...clamp(isOpen || !isLong, 4) }}>{e.text}</p>}
      {isLong && <ShowMore open={isOpen} onToggle={onToggle} />}

      {e.tags && e.tags.length > 0 && (
        <div style={{ ...chipRowStyle, gap: 5, marginTop: 12 }}>
          {e.tags.map((t) => (
            <TagChip key={t} label={t} small accent={accent} onClick={() => onTagClick(t)} active={activeTags.includes(t)} />
          ))}
        </div>
      )}

      <UsageLine usage={usage} />
    </div>
  );
}
