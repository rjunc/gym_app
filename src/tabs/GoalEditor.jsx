import { useState, useMemo } from "react";
import { Minus, Plus } from "lucide-react";
import { todayISO, uid } from "../lib/id.js";
import { newRecord, editById } from "../lib/records.js";
import { tagUsage } from "../lib/tags.js";
import { cleanFields } from "../lib/text.js";
import { nameMap } from "../lib/search.js";
import { useLog } from "../lib/LogContext.js";
import { GOAL_PERIODS, GOAL_SCOPES, hasCriteria, goalMatches } from "../lib/goals.js";
import BottomSheet, { SheetHeader } from "../ui/BottomSheet.jsx";
import SegmentedToggle from "../ui/SegmentedToggle.jsx";
import { NameField, ActiveField } from "../ui/ComposerFields.jsx";
import GoalRuleField from "./GoalRuleField.jsx";
import { MatchCard, GOAL_ACCENT } from "./GoalParts.jsx";
import { labelStyle, metaStyle, primaryBtnStyle, secondaryBtnStyle, ghostLinkStyle } from "../ui/styles.js";

// How many matching sessions the preview lists.
const PREVIEW = 3;

const blankRule = (kind = "any") => ({ key: uid(), kind, tags: [], exerciseIds: [] });

// The new/edit form for a Plan goal: its rules (each "Any of" or "None of"
// some tags and Library exercises, all of which must hold), whether they
// have to hold on one exercise or across the session, and how often (a
// number of sessions in a rolling week or month). Pass `goal` to edit it, or
// leave it out to add one. Under the fields, a live preview of the latest
// sessions it matches, so you can tell the rules are right before saving.
export default function GoalEditor({ goal, onClose }) {
  const { setGoals, sessions, exercises, exerciseUsage } = useLog();
  const [form, setForm] = useState(() => ({
    name: goal?.name || "",
    active: goal ? goal.active !== false : true,
    scope: goal?.scope || "exercise",
    // Each rule gets a key while it's being edited, for React; it isn't saved.
    rules: goal?.rules?.length ? goal.rules.map((r) => ({ ...r, key: uid(), tags: [...r.tags], exerciseIds: [...r.exerciseIds] })) : [blankRule()],
    target: goal?.target || 1,
    period: goal?.period || "week",
  }));
  // Tags from everything a goal can match on: sessions and their exercises.
  const tagSuggestions = useMemo(() => tagUsage([...sessions, ...exercises], todayISO()), [sessions, exercises]);
  const exerciseById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const exerciseNameById = useMemo(() => nameMap(exercises), [exercises]);
  const matches = useMemo(() => goalMatches(form, sessions, exerciseById), [form, sessions, exerciseById]);
  const canSave = hasCriteria(form) && form.target >= 1;

  const updateRule = (key) => (fn) => setForm((f) => ({ ...f, rules: f.rules.map((r) => (r.key === key ? fn(r) : r)) }));
  const removeRule = (key) => setForm((f) => ({ ...f, rules: f.rules.filter((r) => r.key !== key) }));
  const addRule = (kind) => setForm((f) => ({ ...f, rules: [...f.rules, blankRule(kind)] }));

  const setTarget = (n) => setForm((f) => ({ ...f, target: Math.max(1, Math.min(31, n || 1)) }));

  const save = () => {
    if (!canSave) return;
    // Empty rules are dropped, and the editing keys with them.
    const fields = cleanFields({
      ...form,
      rules: form.rules.filter((r) => r.tags.length + r.exerciseIds.length > 0).map(({ kind, tags, exerciseIds }) => ({ kind, tags, exerciseIds })),
    });
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
        <label style={labelStyle}>Counts</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {form.rules.map((r, i) => (
            <GoalRuleField
              key={r.key}
              rule={r}
              first={i === 0}
              onUpdate={updateRule(r.key)}
              onRemove={form.rules.length > 1 ? () => removeRule(r.key) : undefined}
              tagSuggestions={tagSuggestions}
              exercises={exercises}
              usage={exerciseUsage}
            />
          ))}
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

      <div>
        <label style={labelStyle}>Where the rules have to hold</label>
        <SegmentedToggle
          options={Object.entries(GOAL_SCOPES).map(([key, s]) => ({ key, label: s.label }))}
          value={form.scope}
          setValue={(scope) => setForm((f) => ({ ...f, scope }))}
          accent={GOAL_ACCENT}
        />
        <div style={{ ...metaStyle, marginTop: 8, lineHeight: 1.45 }}>{GOAL_SCOPES[form.scope].hint}</div>
      </div>

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
              aria-label="Sessions"
              style={{ width: 56, textAlign: "center", background: "var(--surface-2)", border: "1px solid var(--border-strong)", borderRadius: 10, padding: "8px 4px", color: "var(--text)", fontSize: 16, fontWeight: 700 }}
            />
            <button onClick={() => setTarget(form.target + 1)} aria-label="More" style={{ ...secondaryBtnStyle, padding: 0, width: 40, minHeight: 40 }}>
              <Plus size={16} />
            </button>
          </div>
          <span style={{ fontSize: 14, color: "var(--text-dim)" }}>{form.target === 1 ? "session" : "sessions"}</span>
          <SegmentedToggle
            options={Object.entries(GOAL_PERIODS).map(([key, p]) => ({ key, label: `a ${p.label}` }))}
            value={form.period}
            setValue={(period) => setForm((f) => ({ ...f, period }))}
            accent={GOAL_ACCENT}
          />
        </div>
        <div style={{ ...metaStyle, marginTop: 8 }}>Counted over the last 7 days (or 30 for a month), rolling: every session counts, even two on one day.</div>
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
                <MatchCard key={m.entry.id} match={m} exerciseNameById={exerciseNameById} />
              ))}
            </div>
          )}
        </div>
      )}
    </BottomSheet>
  );
}
