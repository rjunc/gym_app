import { useState } from "react";
import { X, LayoutGrid } from "lucide-react";
import { uid } from "../lib/id.js";
import { addTagsFromDraft } from "../lib/tags.js";
import { itemLabel } from "../lib/goals.js";
import { RuleChip, Stepper, GOAL_ACCENT } from "./GoalParts.jsx";
import GoalChipPicker from "./GoalChipPicker.jsx";
import { metaStyle, ghostLinkStyle, pillRemoveStyle, insetStyle } from "../ui/styles.js";

// A checklist goal's items in the editor: a row per item (a tag or a Library
// exercise, with an X) and how many sessions it has to be done in, then one
// box to add more (see GoalChipPicker). Browse opens the Library to pick
// exercises from.
//   items      [{ key, tag, target } | { key, exerciseId, target }]; `key` is
//              for React and isn't saved
//   onUpdate   (items => items) => void, applied to the latest items
export default function GoalChecklistField({ items, onUpdate, tagSuggestions, exercises, usage }) {
  const [browsing, setBrowsing] = useState(false);
  const exerciseNameById = new Map(exercises.map((e) => [e.id, e.name]));
  const tags = items.filter((it) => it.tag).map((it) => it.tag);
  const exerciseIds = items.filter((it) => it.exerciseId).map((it) => it.exerciseId);

  const addTags = (text) =>
    onUpdate((list) => {
      const have = list.filter((it) => it.tag).map((it) => it.tag);
      const added = addTagsFromDraft(have, text).slice(have.length);
      return [...list, ...added.map((tag) => ({ key: uid(), tag, target: 1 }))];
    });
  const addExercise = (id) => onUpdate((list) => (list.some((it) => it.exerciseId === id) ? list : [...list, { key: uid(), exerciseId: id, target: 1 }]));
  const removeExercise = (id) => onUpdate((list) => list.filter((it) => it.exerciseId !== id));
  const removeItem = (key) => onUpdate((list) => list.filter((it) => it.key !== key));
  const setTarget = (key, n) => onUpdate((list) => list.map((it) => (it.key === key ? { ...it, target: Math.max(1, Math.round(n) || 1) } : it)));

  return (
    <div style={{ ...insetStyle, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ ...metaStyle, fontWeight: 600 }}>Each of</span>
        <span style={{ flex: 1 }} />
        <button onClick={() => setBrowsing(true)} style={{ ...ghostLinkStyle, fontSize: 12, color: `var(${GOAL_ACCENT})` }}>
          <LayoutGrid size={13} /> Browse
        </button>
      </div>

      {items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((it) => {
            const label = itemLabel(it, exerciseNameById);
            return (
              <div key={it.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <RuleChip label={label} kind="any" exercise={!it.tag}>
                    <button onClick={() => removeItem(it.key)} aria-label={`Remove ${label}`} style={pillRemoveStyle}>
                      <X size={13} />
                    </button>
                  </RuleChip>
                </div>
                <Stepper compact value={it.target} setValue={(n) => setTarget(it.key, n)} label={`Times for ${label}`} />
                <span style={{ ...metaStyle, width: 34 }}>{it.target === 1 ? "time" : "times"}</span>
              </div>
            );
          })}
        </div>
      )}

      <GoalChipPicker
        addedTags={tags}
        addedExerciseIds={exerciseIds}
        onAddTags={addTags}
        onAddExercise={addExercise}
        onRemoveExercise={removeExercise}
        tagSuggestions={tagSuggestions}
        exercises={exercises}
        usage={usage}
        empty={items.length === 0}
        browsing={browsing}
        onDoneBrowsing={() => setBrowsing(false)}
      />
    </div>
  );
}
