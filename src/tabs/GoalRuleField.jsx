import { useState } from "react";
import { X } from "lucide-react";
import { addTagsFromDraft } from "../lib/tags.js";
import SegmentedToggle from "../ui/SegmentedToggle.jsx";
import { GOAL_SCOPES, hasRoutines } from "../lib/goals.js";
import { GoalChip, ruleChips, chipKey, GOAL_ACCENT } from "./GoalParts.jsx";
import GoalChipPicker, { BrowseButtons } from "./GoalChipPicker.jsx";
import { metaStyle, pillRemoveStyle, chipRowStyle, insetStyle } from "../ui/styles.js";

// One rule of a goal in the editor: Any of / None of, where it has to hold
// (on one exercise, or anywhere in the session — always the latter once it
// has a routine, which belongs to the whole session), its chips (tags,
// Library exercises and routines, each with an X), and one box to add more
// (see GoalChipPicker). Browse opens the Library or the Routines page to
// pick from.
//   rule       { kind, scope, tags, exerciseIds, routineIds }
//   onUpdate   (rule => rule) => void, applied to the latest rule
//   onRemove   removes the rule (left out when it's the only one)
//   first      the first rule (the others read "and …")
//   tagSuggestions  tagUsage output, most used first
//   nameById   names exercises and routines
const FIELD = { exercises: "exerciseIds", routines: "routineIds" };

export default function GoalRuleField({ rule, onUpdate, onRemove, first, tagSuggestions, nameById }) {
  const [browsing, setBrowsing] = useState(null);
  const chips = ruleChips(rule);
  const routineWide = hasRoutines(rule);

  const addTags = (text) => onUpdate((r) => ({ ...r, tags: addTagsFromDraft(r.tags, text) }));
  const add = (kind, id) => onUpdate((r) => (r[FIELD[kind]].includes(id) ? r : { ...r, [FIELD[kind]]: [...r[FIELD[kind]], id] }));
  const remove = (kind, id) => onUpdate((r) => ({ ...r, [FIELD[kind]]: r[FIELD[kind]].filter((x) => x !== id) }));
  const removeChip = (chip) =>
    chip.tag ? onUpdate((r) => ({ ...r, tags: r.tags.filter((x) => x !== chip.tag) })) : remove(chip.routineId ? "routines" : "exercises", chip.exerciseId || chip.routineId);

  return (
    <div style={{ ...insetStyle, display: "flex", flexDirection: "column", gap: 10, borderColor: rule.kind === "none" ? "color-mix(in srgb, var(--danger) 35%, var(--border))" : "var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
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
        <BrowseButtons onBrowse={setBrowsing} />
        {onRemove && (
          <button onClick={onRemove} aria-label="Remove rule" title="Remove rule" className="icon-btn" style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", display: "flex", padding: 4, borderRadius: 8 }}>
            <X size={16} />
          </button>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={metaStyle}>Where</span>
        {routineWide ? (
          <span style={{ ...metaStyle, color: "var(--text)" }}>anywhere in the session — a routine counts for the whole session</span>
        ) : (
          <SegmentedToggle
            options={Object.entries(GOAL_SCOPES).map(([key, sc]) => ({ key, label: sc.label.toLowerCase() }))}
            value={rule.scope === "session" ? "session" : "exercise"}
            setValue={(scope) => onUpdate((r) => ({ ...r, scope }))}
            accent={GOAL_ACCENT}
          />
        )}
      </div>

      {chips.length > 0 && (
        <div style={chipRowStyle}>
          {chips.map((chip) => (
            <GoalChip key={chipKey(chip)} chip={chip} kind={rule.kind} nameById={nameById}>
              <button onClick={() => removeChip(chip)} aria-label={`Remove ${chip.tag || nameById.get(chip.exerciseId || chip.routineId) || "it"}`} style={pillRemoveStyle}>
                <X size={13} />
              </button>
            </GoalChip>
          ))}
        </div>
      )}

      <GoalChipPicker
        added={rule}
        onAddTags={addTags}
        onAdd={add}
        onRemove={remove}
        tagSuggestions={tagSuggestions}
        empty={chips.length === 0}
        browsing={browsing}
        onDoneBrowsing={() => setBrowsing(null)}
      />
    </div>
  );
}
