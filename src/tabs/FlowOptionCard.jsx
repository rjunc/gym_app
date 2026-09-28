import { ArrowRight, Flag, ChevronDown, ChevronUp, Star } from "lucide-react";
import { normalizePosition } from "../lib/positions.js";
import TagChip from "../ui/TagChip.jsx";
import IconBtn from "../ui/IconBtn.jsx";
import { GiOnlyBadge } from "./LibraryItemCard.jsx";
import { cardStyle, primaryBtnStyle, noteTextStyle, chipRowStyle } from "../ui/styles.js";

// One move from the current position on the Flow page: its name, go-to star,
// tags, notes (tap the card to show them) and the button that follows it to
// the position it leads to.
export default function FlowOptionCard({ technique, accent, isOpen, onToggle, onGoTo, onToggleStar, activeTags, onTagClick }) {
  const t = technique;
  const hasNext = normalizePosition(t.toPosition) !== "";
  return (
    <div style={cardStyle}>
      <div
        onClick={(ev) => t.text && !ev.target.closest("button") && onToggle()}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, cursor: t.text ? "pointer" : undefined }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0, paddingTop: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{t.name}</div>
            {t.giOnly && <GiOnlyBadge />}
          </div>
          {t.tags && t.tags.length > 0 && (
            <div style={{ ...chipRowStyle, gap: 5 }}>
              {t.tags.map((tag) => (
                <TagChip key={tag} label={tag} small accent={accent} active={activeTags.includes(tag)} onClick={() => onTagClick(tag)} />
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", flexShrink: 0, margin: "-2px -6px 0 0" }}>
          {t.text && (
            <IconBtn onClick={onToggle} label={isOpen ? "Hide notes" : "Show notes"}>
              {isOpen ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
            </IconBtn>
          )}
          <IconBtn onClick={onToggleStar} active={!!t.starred} label={t.starred ? "Unstar" : "Star as go-to"}>
            <Star size={16} fill={t.starred ? "currentColor" : "none"} />
          </IconBtn>
        </div>
      </div>

      {isOpen && t.text && <p style={{ ...noteTextStyle, fontSize: 13, color: "var(--text-dim)", marginTop: 12 }}>{t.text}</p>}

      <div style={{ marginTop: 14 }}>
        {hasNext ? (
          <button onClick={onGoTo} style={{ ...primaryBtnStyle, background: `var(${accent})`, width: "100%", justifyContent: "space-between", whiteSpace: "normal", textAlign: "left" }}>
            <span>
              <span style={{ fontWeight: 500, opacity: 0.75 }}>Leads to </span>
              {t.toPosition}
            </span>
            <ArrowRight size={17} style={{ flexShrink: 0 }} />
          </button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-dim)", background: "var(--surface-2)", borderRadius: 10, padding: "9px 12px" }}>
            <Flag size={14} /> Finish · no next position set
          </div>
        )}
      </div>
    </div>
  );
}
