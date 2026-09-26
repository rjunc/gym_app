import { useState } from "react";
import { Plus, Check, ChevronDown, ChevronUp } from "lucide-react";
import TagChip from "./TagChip.jsx";
import { cardStyle, primaryBtnStyle, secondaryBtnStyle } from "./styles.js";

// One choice in a picker (RoutinePicker, ExercisePicker): a summary — title,
// `subtitle`, tags and a `meta` line — with an Add button, and a fuller
// `preview` that tapping the card reveals, so you can check what you're
// adding first. Once `added`, the button shows "Added" and does nothing
// (take it back off in the form itself).
export default function PickerCard({ title, subtitle, tags = [], meta, preview, added, onAdd, accent = "--accent" }) {
  const [open, setOpen] = useState(false);
  const Chevron = open ? ChevronUp : ChevronDown;
  return (
    <div
      onClick={(ev) => {
        if (preview && !ev.target.closest("button")) setOpen((v) => !v);
      }}
      style={{ ...cardStyle, background: "var(--surface-2)", padding: 12, cursor: preview ? "pointer" : undefined }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 700, fontSize: 13 }}>
            {title}
            {preview && <Chevron size={13} color="var(--text-dim)" style={{ flexShrink: 0 }} />}
          </div>
          {subtitle && <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{subtitle}</div>}
          {tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {tags.map((t) => (
                <TagChip key={t} label={t} small accent={accent} />
              ))}
            </div>
          )}
          {meta && <div style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 600 }}>{meta}</div>}
        </div>
        {added ? (
          <button disabled style={{ ...secondaryBtnStyle, color: `var(${accent})`, cursor: "default", flexShrink: 0 }}>
            <Check size={13} /> Added
          </button>
        ) : (
          <button onClick={onAdd} style={{ ...primaryBtnStyle, background: `var(${accent})`, padding: "7px 12px", flexShrink: 0 }}>
            <Plus size={13} /> Add
          </button>
        )}
      </div>
      {open && preview && <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>{preview}</div>}
    </div>
  );
}
