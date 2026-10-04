import { useState } from "react";
import { X, LayoutGrid } from "lucide-react";
import { addTagsFromDraft } from "../lib/tags.js";
import SegmentedToggle from "../ui/SegmentedToggle.jsx";
import { GOAL_SCOPES } from "../lib/goals.js";
import { RuleChip, GOAL_ACCENT } from "./GoalParts.jsx";
import GoalChipPicker from "./GoalChipPicker.jsx";
import { metaStyle, ghostLinkStyle, pillRemoveStyle, chipRowStyle, insetStyle } from "../ui/styles.js";

// One rule of a goal in the editor: Any of / None of, where it has to hold
// (on one exercise, or anywhere in the session), its chips (tags and
// Library exercises, each with an X), and one box to add more (see
// GoalChipPicker). Browse opens the Library to pick exercises from.
//   rule       { kind, scope, tags, exerciseIds }
//   onUpdate   (rule => rule) => void, applied to the latest rule
//   onRemove   removes the rule (left out when it's the only one)
//   first      the first rule (the others read "and …")
//   tagSuggestions  tagUsage output, most used first
export default function GoalRuleField({ rule, onUpdate, onRemove, first, tagSuggestions, exercises, usage }) {
  const [browsing, setBrowsing] = useState(false);
  const exerciseById = new Map(exercises.map((e) => [e.id, e]));
  const empty = rule.tags.length + rule.exerciseIds.length === 0;

  const addTags = (text) => onUpdate((r) => ({ ...r, tags: addTagsFromDraft(r.tags, text) }));
  const addExercise = (id) => onUpdate((r) => (r.exerciseIds.includes(id) ? r : { ...r, exerciseIds: [...r.exerciseIds, id] }));
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

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={metaStyle}>Where</span>
        <SegmentedToggle
          options={Object.entries(GOAL_SCOPES).map(([key, sc]) => ({ key, label: sc.label.toLowerCase() }))}
          value={rule.scope === "session" ? "session" : "exercise"}
          setValue={(scope) => onUpdate((r) => ({ ...r, scope }))}
          accent={GOAL_ACCENT}
        />
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

      <GoalChipPicker
        addedTags={rule.tags}
        addedExerciseIds={rule.exerciseIds}
        onAddTags={addTags}
        onAddExercise={addExercise}
        onRemoveExercise={removeExercise}
        tagSuggestions={tagSuggestions}
        exercises={exercises}
        usage={usage}
        empty={empty}
        browsing={browsing}
        onDoneBrowsing={() => setBrowsing(false)}
      />
    </div>
  );
}
