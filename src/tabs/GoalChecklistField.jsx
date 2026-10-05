import { useState } from "react";
import { X } from "lucide-react";
import { uid } from "../lib/id.js";
import { addTagsFromDraft } from "../lib/tags.js";
import { itemLabel } from "../lib/goals.js";
import { GoalChip, Stepper } from "./GoalParts.jsx";
import GoalChipPicker, { BrowseButtons } from "./GoalChipPicker.jsx";
import { metaStyle, pillRemoveStyle, insetStyle } from "../ui/styles.js";

// A checklist goal's items in the editor: a row per item (a tag, a Library
// exercise or a routine, with an X) and how many sessions it has to be done
// in, then one box to add more (see GoalChipPicker). Browse opens the
// Library or the Routines page to pick from.
//   items      [{ key, tag | exerciseId | routineId, target }]; `key` is for
//              React and isn't saved
//   onUpdate   (items => items) => void, applied to the latest items
//   nameById   names exercises and routines
const FIELD = { exercises: "exerciseId", routines: "routineId" };

export default function GoalChecklistField({ items, onUpdate, tagSuggestions, nameById }) {
  const [browsing, setBrowsing] = useState(null);
  const added = {
    tags: items.filter((it) => it.tag).map((it) => it.tag),
    exerciseIds: items.filter((it) => it.exerciseId).map((it) => it.exerciseId),
    routineIds: items.filter((it) => it.routineId).map((it) => it.routineId),
  };

  const addTags = (text) =>
    onUpdate((list) => {
      const have = list.filter((it) => it.tag).map((it) => it.tag);
      const fresh = addTagsFromDraft(have, text).slice(have.length);
      return [...list, ...fresh.map((tag) => ({ key: uid(), tag, target: 1 }))];
    });
  const add = (kind, id) => onUpdate((list) => (list.some((it) => it[FIELD[kind]] === id) ? list : [...list, { key: uid(), [FIELD[kind]]: id, target: 1 }]));
  const remove = (kind, id) => onUpdate((list) => list.filter((it) => it[FIELD[kind]] !== id));
  const removeItem = (key) => onUpdate((list) => list.filter((it) => it.key !== key));
  const setTarget = (key, n) => onUpdate((list) => list.map((it) => (it.key === key ? { ...it, target: Math.max(1, Math.round(n) || 1) } : it)));

  return (
    <div style={{ ...insetStyle, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ ...metaStyle, fontWeight: 600 }}>Each of</span>
        <span style={{ flex: 1 }} />
        <BrowseButtons onBrowse={setBrowsing} />
      </div>

      {items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((it) => {
            const label = itemLabel(it, nameById);
            return (
              <div key={it.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <GoalChip chip={it} nameById={nameById}>
                    <button onClick={() => removeItem(it.key)} aria-label={`Remove ${label}`} style={pillRemoveStyle}>
                      <X size={13} />
                    </button>
                  </GoalChip>
                </div>
                <Stepper compact value={it.target} setValue={(n) => setTarget(it.key, n)} label={`Times for ${label}`} />
                <span style={{ ...metaStyle, width: 34 }}>{it.target === 1 ? "time" : "times"}</span>
              </div>
            );
          })}
        </div>
      )}

      <GoalChipPicker
        added={added}
        onAddTags={addTags}
        onAdd={add}
        onRemove={remove}
        tagSuggestions={tagSuggestions}
        empty={items.length === 0}
        browsing={browsing}
        onDoneBrowsing={() => setBrowsing(null)}
      />
    </div>
  );
}
