import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { uid } from "../lib/id.js";
import { newRecord, editRecord } from "../lib/records.js";

import { cleanFields } from "../lib/text.js";
import { nameMap } from "../lib/search.js";
import { useLog } from "../lib/LogContext.js";
import { GOAL_PERIODS, GOAL_MODES, MAX_GOAL_DAYS, hasCriteria, isChecklist, goalMatches, perLabel, nextGoalOrder, withoutCriteria, scopeOf } from "../lib/goals.js";
import BottomSheet, { SheetHeader } from "../ui/BottomSheet.jsx";
import SegmentedToggle from "../ui/SegmentedToggle.jsx";
import { NameField, ActiveField } from "../ui/ComposerFields.jsx";
import GoalRuleField from "./GoalRuleField.jsx";
import GoalChecklistField from "./GoalChecklistField.jsx";
import { MatchCard, Stepper, GOAL_ACCENT } from "./GoalParts.jsx";
import { labelStyle, metaStyle, primaryBtnStyle, ghostLinkStyle } from "../ui/styles.js";
import useTagSuggestions from "../lib/useTagSuggestions.js";

// How many matching sessions the preview lists.
const PREVIEW = 3;

const blankRule = (kind = "any") => ({ key: uid(), kind, scope: "exercise", tags: [], exerciseIds: [], routineIds: [] });

// The new/edit form for a Plan goal, of either kind (see GOAL_MODES):
// sessions, with its rules (each "Any of" or "None of" some tags and Library
// exercises, on one exercise or anywhere in the session, all of which must
// hold) and how many sessions; or a checklist, with its items (tags and
// Library exercises) and how many sessions each has to be done in. Then
// the rolling window, of any number of days, with a week, two weeks and a
// month as quick picks. Switching kinds keeps what was filled in for the
// other until saving, which keeps only the chosen kind's. Pass `goal` to edit it, or
// leave it out to add one. Under the fields, a live preview of the latest
// sessions it matches, so you can tell the rules are right before saving.
export default function GoalEditor({ goal, onClose }) {
  const { setGoals, sessions, exercises, routines } = useLog();
  const [form, setForm] = useState(() => ({
    name: goal?.name || "",
    active: goal ? goal.active !== false : true,
    // Each rule gets a key while it's being edited, for React; it isn't saved.
    mode: goal && isChecklist(goal) ? "checklist" : "sessions",
    rules: goal?.rules?.length ? goal.rules.map((r) => ({ ...r, key: uid(), tags: [...r.tags], exerciseIds: [...r.exerciseIds], routineIds: [...(r.routineIds || [])] })) : [blankRule()],
    target: goal?.target || 1,
    items: (goal?.items || []).map((it) => ({ ...it, key: uid() })),
    days: goal?.days || 7,
  }));
  // Tags from what a goal can match on first (sessions and their exercises),
  // then the rest of the app's.
  const matchable = useMemo(() => [...sessions, ...exercises], [sessions, exercises]);
  const tagSuggestions = useTagSuggestions(matchable);
  const exerciseById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const nameById = useMemo(() => nameMap([...exercises, ...routines]), [exercises, routines]);
  const matches = useMemo(() => goalMatches(form, sessions, exerciseById), [form, sessions, exerciseById]);
  const checklist = isChecklist(form);
  const canSave = hasCriteria(form) && form.target >= 1 && form.days >= 1;

  const updateRule = (key) => (fn) => setForm((f) => ({ ...f, rules: f.rules.map((r) => (r.key === key ? fn(r) : r)) }));
  const removeRule = (key) => setForm((f) => ({ ...f, rules: f.rules.filter((r) => r.key !== key) }));
  const addRule = (kind) => setForm((f) => ({ ...f, rules: [...f.rules, blankRule(kind)] }));
  const updateItems = (fn) => setForm((f) => ({ ...f, items: fn(f.items) }));

  const setTarget = (n) => setForm((f) => ({ ...f, target: Math.max(1, Math.min(MAX_GOAL_DAYS, n || 1)) }));
  const setDays = (n) => setForm((f) => ({ ...f, days: Math.max(1, Math.min(MAX_GOAL_DAYS, n || 1)) }));

  const save = () => {
    if (!canSave) return;
    // Only the chosen kind's criteria are kept: empty rules are dropped, and
    // the editing keys with them.
    const { name, active, days } = form;
    const criteria = checklist
      ? { mode: "checklist", items: form.items.map(({ tag, exerciseId, routineId, target }) => (tag ? { tag, target } : exerciseId ? { exerciseId, target } : { routineId, target })) }
      : {
          mode: "sessions",
          // A rule with a routine is saved as anywhere in the session, which
          // is what it means (see scopeOf).
          rules: form.rules
            .filter((r) => r.tags.length + r.exerciseIds.length + r.routineIds.length > 0)
            .map(({ kind, scope, tags, exerciseIds, routineIds }) => ({ kind, scope: scopeOf({ scope, routineIds }), tags, exerciseIds, routineIds })),
          target: form.target,
        };
    const fields = cleanFields({ name, active, ...criteria, days });
    // An edit replaces the old criteria outright, in case the kind changed.
    if (goal) setGoals((prev) => prev.map((g) => (g.id === goal.id ? editRecord(withoutCriteria(g), fields) : g)));
    else setGoals((prev) => [...prev, newRecord({ ...fields, order: nextGoalOrder(prev) })]);
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
        <label style={labelStyle}>Counts</label>
        <SegmentedToggle
          options={Object.entries(GOAL_MODES).map(([key, m]) => ({ key, label: m.label }))}
          value={form.mode}
          setValue={(mode) => setForm((f) => ({ ...f, mode }))}
          accent={GOAL_ACCENT}
        />
        <div style={{ ...metaStyle, marginTop: 6 }}>{GOAL_MODES[form.mode].hint}</div>
      </div>

      {checklist ? (
        <div>
          <label style={labelStyle}>Items</label>
          <GoalChecklistField items={form.items} onUpdate={updateItems} tagSuggestions={tagSuggestions} nameById={nameById} />
          <div style={{ ...metaStyle, marginTop: 8, lineHeight: 1.45 }}>
            Each item has to be done in its number of sessions; one session can tick off several. A tag counts on the session or any exercise in it; a routine, when it was added to the session.
          </div>
        </div>
      ) : (
        <div>
          <label style={labelStyle}>Rules</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {form.rules.map((r, i) => (
              <GoalRuleField
                key={r.key}
                rule={r}
                first={i === 0}
                onUpdate={updateRule(r.key)}
                onRemove={form.rules.length > 1 ? () => removeRule(r.key) : undefined}
                tagSuggestions={tagSuggestions}
                nameById={nameById}
              />
            ))}
          </div>
          <div style={{ ...metaStyle, marginTop: 8, lineHeight: 1.45 }}>
            Every rule has to hold. Rules on <b>one exercise</b> must all be met by the same exercise, by its own tags; rules <b>anywhere in the session</b> can each be met by the session's tags, any exercise in it, or a routine added to it.
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
            <button onClick={() => addRule("any")} style={{ ...ghostLinkStyle, color: `var(${GOAL_ACCENT})` }}>
              <Plus size={14} /> And any of…
            </button>
            <button onClick={() => addRule("none")} style={{ ...ghostLinkStyle, color: "var(--danger)" }}>
              <Plus size={14} /> And none of…
            </button>
          </div>
        </div>
      )}

      <div>
        <label style={labelStyle}>How often</label>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {checklist ? (
            <span style={{ fontSize: 14, color: "var(--text-dim)" }}>Every</span>
          ) : (
            <>
              <Stepper value={form.target} setValue={setTarget} label="Sessions" />
              <span style={{ fontSize: 14, color: "var(--text-dim)" }}>{form.target === 1 ? "session" : "sessions"} every</span>
            </>
          )}
          <Stepper value={form.days} setValue={setDays} label="Days" />
          <span style={{ fontSize: 14, color: "var(--text-dim)" }}>{form.days === 1 ? "day" : "days"}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
          <SegmentedToggle
            options={GOAL_PERIODS.map((p) => ({ key: p.days, label: p.label }))}
            value={form.days}
            setValue={setDays}
            accent={GOAL_ACCENT}
          />
        </div>
        <div style={{ ...metaStyle, marginTop: 8 }}>
          {checklist ? "Each item" : form.target === 1 ? "Once" : `${form.target} sessions`} {perLabel(form)}, counted over the last {form.days === 1 ? "day" : `${form.days} days`}, rolling: every session counts, even two on one day.
        </div>
      </div>

      <NameField form={form} setForm={setForm} nameField="name" nameLabel="Name (optional)" namePlaceholder="Leave blank to name it after what it counts" />

      <ActiveField form={form} setForm={setForm} accentVar={GOAL_ACCENT} activeLabel="Active — track it, and warn on Home when it slips" />

      {hasCriteria(form) && (
        <div>
          <label style={labelStyle}>
            {matches.length === 0 ? "Matches" : `Matches ${matches.length} ${matches.length === 1 ? "session" : "sessions"}`}
            {matches.length > PREVIEW && <span style={{ fontWeight: 500 }}> · latest {PREVIEW}</span>}
          </label>
          {matches.length === 0 ? (
            <div style={{ ...metaStyle, padding: "10px 12px", border: "1px dashed var(--border-strong)", borderRadius: 12 }}>No sessions match this yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {matches.slice(0, PREVIEW).map((m) => (
                <MatchCard key={m.entry.id} match={m} nameById={nameById} />
              ))}
            </div>
          )}
        </div>
      )}
    </BottomSheet>
  );
}
