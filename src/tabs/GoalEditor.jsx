import { useState, useMemo } from "react";
import { Minus, Plus } from "lucide-react";
import { todayISO, formatDate } from "../lib/id.js";
import { newRecord, editById } from "../lib/records.js";
import { tagUsage, addTagsFromDraft } from "../lib/tags.js";
import { cleanFields } from "../lib/text.js";
import { useLog } from "../lib/LogContext.js";
import { GOAL_PERIODS, hasCriteria, goalMatches } from "../lib/goals.js";
import BottomSheet, { SheetHeader } from "../ui/BottomSheet.jsx";
import TagsField from "../ui/TagsField.jsx";
import SegmentedToggle from "../ui/SegmentedToggle.jsx";
import { NameField, ExercisesField } from "../ui/ComposerFields.jsx";
import { labelStyle, metaStyle, primaryBtnStyle, secondaryBtnStyle } from "../ui/styles.js";

export const GOAL_ACCENT = "--accent2";

// The new/edit form for a Plan goal: what counts (tags, all or any of them,
// and/or Library exercises) and how often (a number of days a week or a
// month). Pass `goal` to edit it, or leave it out to add one. Under the
// fields, a live count of how much of your log it matches, so you can tell
// the criteria are right before saving.
export default function GoalEditor({ goal, onClose }) {
  const { goals, setGoals, sessions, rolls, exercises, exerciseUsage } = useLog();
  const [form, setForm] = useState(() => ({
    name: goal?.name || "",
    tags: [...(goal?.tags || [])],
    tagMatch: goal?.tagMatch || "all",
    exerciseIds: [...(goal?.exerciseIds || [])],
    target: goal?.target || 1,
    period: goal?.period || "week",
  }));
  const [tagDraft, setTagDraft] = useState("");
  // Tags from everything a goal can match on: sessions, their exercises and
  // mat sessions.
  const tagSuggestions = useMemo(() => tagUsage([...sessions, ...rolls, ...exercises], todayISO()), [sessions, rolls, exercises]);
  const exerciseById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const matches = useMemo(() => goalMatches(form, { sessions, rolls }, exerciseById), [form, sessions, rolls, exerciseById]);
  const canSave = hasCriteria(form) && form.target >= 1;

  const setTarget = (n) => setForm((f) => ({ ...f, target: Math.max(1, Math.min(31, n || 1)) }));

  const save = () => {
    if (!canSave) return;
    const fields = cleanFields(form);
    if (goal) setGoals((prev) => editById(prev, goal.id, fields));
    else setGoals((prev) => [...prev, newRecord(fields)]);
    onClose();
  };

  return (
    <BottomSheet
      onClose={onClose}
      gap={18}
      header={<SheetHeader title={goal ? "Edit goal" : "New goal"} onClose={onClose} />}
      footer={
        <button
          onClick={save}
          disabled={!canSave}
          style={{ ...primaryBtnStyle, background: `var(${GOAL_ACCENT})`, width: "100%", minHeight: 46, fontSize: 15, opacity: canSave ? 1 : 0.4 }}
        >
          {goal ? "Save changes" : "Add goal"}
        </button>
      }
    >
      <div>
        <TagsField
          form={form}
          setForm={setForm}
          tagDraft={tagDraft}
          setTagDraft={setTagDraft}
          onAddTag={() => {
            setForm((f) => ({ ...f, tags: addTagsFromDraft(f.tags, tagDraft) }));
            setTagDraft("");
          }}
          onRemoveTag={(t) => setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }))}
          tagSuggestions={tagSuggestions}
          accentVar={GOAL_ACCENT}
        />
        {form.tags.length > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
            <SegmentedToggle
              options={[
                { key: "all", label: "All of these" },
                { key: "any", label: "Any of these" },
              ]}
              value={form.tagMatch}
              setValue={(tagMatch) => setForm((f) => ({ ...f, tagMatch }))}
              accent={GOAL_ACCENT}
            />
          </div>
        )}
        <div style={{ ...metaStyle, marginTop: 8, lineHeight: 1.45 }}>
          A tag counts when it's on the session or mat session, or on an exercise done in it.
        </div>
      </div>

      <ExercisesField form={form} setForm={setForm} exercises={exercises} accentVar={GOAL_ACCENT} usage={exerciseUsage} />
      {form.tags.length > 0 && form.exerciseIds.length > 0 && (
        <div style={{ ...metaStyle, marginTop: -10 }}>Counts a session with any of these exercises, or one matching the tags.</div>
      )}

      <div>
        <label style={labelStyle}>How often</label>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={() => setTarget(form.target - 1)} aria-label="Fewer" disabled={form.target <= 1} style={{ ...secondaryBtnStyle, padding: 0, width: 40, minHeight: 40, opacity: form.target <= 1 ? 0.4 : 1 }}>
              <Minus size={16} />
            </button>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={31}
              value={form.target}
              onChange={(e) => setTarget(Number(e.target.value))}
              aria-label="Days"
              style={{ width: 56, textAlign: "center", background: "var(--surface-2)", border: "1px solid var(--border-strong)", borderRadius: 10, padding: "8px 4px", color: "var(--text)", fontSize: 16, fontWeight: 700 }}
            />
            <button onClick={() => setTarget(form.target + 1)} aria-label="More" style={{ ...secondaryBtnStyle, padding: 0, width: 40, minHeight: 40 }}>
              <Plus size={16} />
            </button>
          </div>
          <span style={{ fontSize: 14, color: "var(--text-dim)" }}>{form.target === 1 ? "day" : "days"}</span>
          <SegmentedToggle
            options={Object.entries(GOAL_PERIODS).map(([key, p]) => ({ key, label: `a ${p.label}` }))}
            value={form.period}
            setValue={(period) => setForm((f) => ({ ...f, period }))}
            accent={GOAL_ACCENT}
          />
        </div>
        <div style={{ ...metaStyle, marginTop: 8 }}>Weeks run Monday to Sunday. Two sessions on the same day count once.</div>
      </div>

      <NameField form={form} setForm={setForm} nameField="name" nameLabel="Name (optional)" namePlaceholder="Leave blank to name it after what it counts" />

      {hasCriteria(form) && (
        <div style={{ ...metaStyle, background: "var(--surface-2)", borderRadius: 10, padding: "10px 12px" }}>
          {matches.length === 0
            ? "Nothing in your log matches this yet."
            : `Matches ${matches.length} ${matches.length === 1 ? "entry" : "entries"} in your log, most recently ${formatDate(matches[0].entry.date)}.`}
        </div>
      )}
    </BottomSheet>
  );
}
