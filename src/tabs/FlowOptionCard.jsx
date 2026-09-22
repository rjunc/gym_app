import { ChevronRight, Flag, Shirt, Star } from "lucide-react";
import { normalizePosition } from "../lib/positions.js";
import TagChip from "../ui/TagChip.jsx";
import IconBtn from "../ui/IconBtn.jsx";
import { cardStyle, primaryBtnStyle } from "../ui/styles.js";

export default function FlowOptionCard({ technique, accent, isOpen, onToggle, onGoTo, onToggleStar, activeTags, onTagClick }) {
  const t = technique;
  const hasNext = normalizePosition(t.toPosition) !== "";
  return (
    <div style={cardStyle}>
      <div
        onClick={onToggle}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, cursor: "pointer" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{t.name}</div>
          {t.giOnly && (
            <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, color: "var(--danger)" }}>
              <Shirt size={11} /> GI ONLY
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {t.tags && t.tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, justifyContent: "flex-end" }}>
              {t.tags.slice(0, 3).map((tag) => (
                <TagChip
                  key={tag}
                  label={tag}
                  small
                  accent={accent}
                  active={activeTags.includes(tag)}
                  // Stop the click from bubbling to the card header's
                  // onClick, which would also toggle this card open/closed
                  // at the same time.
                  onClick={(e) => {
                    e.stopPropagation();
                    onTagClick(tag);
                  }}
                />
              ))}
            </div>
          )}
          <IconBtn
            onClick={(e) => {
              e.stopPropagation();
              onToggleStar();
            }}
            active={!!t.starred}
            label={t.starred ? "Unstar" : "Star as go-to"}
          >
            <Star size={13} fill={t.starred ? "currentColor" : "none"} />
          </IconBtn>
        </div>
      </div>

      {isOpen && t.text && (
        <p
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 13,
            lineHeight: 1.55,
            color: "var(--text)",
            marginTop: 8,
            marginBottom: 0,
            whiteSpace: "pre-wrap",
          }}
        >
          {t.text}
        </p>
      )}

      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
        {hasNext ? (
          <button onClick={onGoTo} style={{ ...primaryBtnStyle, background: `var(${accent})`, flex: 1, justifyContent: "center" }}>
            Go to "{t.toPosition}" <ChevronRight size={14} />
          </button>
        ) : (
          <div
            style={{
              ...primaryBtnStyle,
              background: "var(--surface-2)",
              color: "var(--text-dim)",
              flex: 1,
              justifyContent: "center",
              cursor: "default",
            }}
          >
            <Flag size={13} /> Finish (no next position set)
          </div>
        )}
      </div>
    </div>
  );
}
