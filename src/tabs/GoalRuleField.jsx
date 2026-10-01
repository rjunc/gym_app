import { useState } from "react";
import { X, Plus, LayoutGrid, Dumbbell } from "lucide-react";
import { searchTags, addTagsFromDraft } from "../lib/tags.js";
import { compareByUsage } from "../lib/links.js";
import { prefixMatchesFirst } from "../lib/search.js";
import SegmentedToggle from "../ui/SegmentedToggle.jsx";
import TagChip from "../ui/TagChip.jsx";
import PagePicker from "../ui/PagePicker.jsx";
import { RuleChip, GOAL_ACCENT } from "./GoalParts.jsx";
import { inputStyle, labelStyle, secondaryBtnStyle, ghostLinkStyle, pillRemoveStyle, chipRowStyle, insetStyle } from "../ui/styles.js";

// One rule of a goal in the editor: Any of / None of, its chips (tags and
// Library exercises, each with an X), and one box to add more. Typing
// suggests matching tags and exercises; Enter adds what's typed as a tag
// (commas add several). Browse opens the Library to pick exercises from.
//   rule       { kind, tags, exerciseIds }
//   onUpdate   (rule => rule) => void, applied to the latest rule
//   onRemove   removes the rule (left out when it's the only one)
//   first      the first rule (the others read "and …")
//   tagSuggestions  tagUsage output, most used first
export default function GoalRuleField({ rule, onUpdate, onRemove, first, tagSuggestions, exercises, usage }) {
  const [query, setQuery] = useState("");
  const [browsing, setBrowsing] = useState(false);
  const exerciseById = new Map(exercises.map((e) => [e.id, e]));
  const q = query.trim().toLowerCase();
  const empty = rule.tags.length + rule.exerciseIds.length === 0;

  const unusedTags = tagSuggestions.filter((s) => !rule.tags.includes(s.tag));
  // Most-used tags to start an empty rule from; matching ones once typing.
  const tagHits = q ? searchTags(unusedTags, q).slice(0, 6) : empty ? unusedTags.slice(0, 8) : [];
  const exerciseHits = q
    ? prefixMatchesFirst(
        exercises.filter((e) => !rule.exerciseIds.includes(e.id) && e.name.toLowerCase().includes(q)).sort(compareByUsage(usage || new Map())),
        q,
        (e) => [e.name]
      ).slice(0, 6)
    : [];

  const addTags = (text) => {
    onUpdate((r) => ({ ...r, tags: addTagsFromDraft(r.tags, text) }));
    setQuery("");
  };
  const addExercise = (id) => {
    onUpdate((r) => (r.exerciseIds.includes(id) ? r : { ...r, exerciseIds: [...r.exerciseIds, id] }));
    setQuery("");
  };
  const removeExercise = (id) => onUpdate((r) => ({ ...r, exerciseIds: r.exerciseIds.filter((x) => x !== id) }));

  return (
    <div style={{ ...insetStyle, display: "flex", flexDirection: "column", gap: 10, borderColor: rule.kind === "none" ? "color-mix(in srgb, var(--danger) 35%, var(--border))" : "var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {!first && <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)" }}>AND</span>}
        <SegmentedToggle
          options={[
            { key: "any", label: "Any of" },
            { key: "none", label: "None of", accent: "--danger" },
          ]}
          value={rule.kind}
          setValue={(kind) => onUpdate((r) => ({ ...r, kind }))}
          accent={GOAL_ACCENT}
        />
        <span style={{ flex: 1 }} />
        <button onClick={() => setBrowsing(true)} style={{ ...ghostLinkStyle, fontSize: 12, color: `var(${GOAL_ACCENT})` }}>
          <LayoutGrid size={13} /> Browse
        </button>
        {onRemove && (
          <button onClick={onRemove} aria-label="Remove rule" title="Remove rule" className="icon-btn" style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", display: "flex", padding: 4, borderRadius: 8 }}>
            <X size={16} />
          </button>
        )}
      </div>

      {!empty && (
        <div style={chipRowStyle}>
          {rule.tags.map((t) => (
            <RuleChip key={t} label={t} kind={rule.kind}>
              <button onClick={() => onUpdate((r) => ({ ...r, tags: r.tags.filter((x) => x !== t) }))} aria-label={`Remove ${t}`} style={pillRemoveStyle}>
                <X size={13} />
              </button>
            </RuleChip>
          ))}
          {rule.exerciseIds.map((id) => {
            const name = exerciseById.get(id)?.name || "Deleted exercise";
            return (
              <RuleChip key={id} label={name} kind={rule.kind} exercise>
                <button onClick={() => removeExercise(id)} aria-label={`Remove ${name}`} style={pillRemoveStyle}>
                  <X size={13} />
                </button>
              </RuleChip>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === ",") && q) {
              e.preventDefault();
              addTags(query);
            }
          }}
          placeholder={empty ? "Add a tag or exercise…" : "Add another…"}
          style={{ ...inputStyle, flex: 1 }}
        />
        <button onClick={() => q && addTags(query)} disabled={!q} style={{ ...secondaryBtnStyle, minHeight: 44, padding: "0 14px", opacity: q ? 1 : 0.5 }}>
          <Plus size={15} /> Tag
        </button>
      </div>

      {(tagHits.length > 0 || exerciseHits.length > 0) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tagHits.length > 0 && (
            <div>
              <span style={{ ...labelStyle, fontWeight: 500, marginBottom: 6 }}>{q ? "Tags" : "Most used tags"}</span>
              <div style={chipRowStyle}>
                {tagHits.map(({ tag }) => (
                  <TagChip key={tag} small accent={GOAL_ACCENT} label={tag} onClick={() => addTags(tag)} />
                ))}
              </div>
            </div>
          )}
          {exerciseHits.length > 0 && (
            <div>
              <span style={{ ...labelStyle, fontWeight: 500, marginBottom: 6 }}>Exercises</span>
              <div style={chipRowStyle}>
                {exerciseHits.map((e) => (
                  <TagChip key={e.id} small accent={GOAL_ACCENT} label={<><Dumbbell size={11} /> {e.name}</>} onClick={() => addExercise(e.id)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {browsing && (
        <PagePicker
          kind="exercises"
          addedIds={rule.exerciseIds}
          onAdd={(exercise) => addExercise(exercise.id)}
          onRemove={removeExercise}
          onDone={() => setBrowsing(false)}
          initialQuery={query.trim()}
        />
      )}
    </div>
  );
}
