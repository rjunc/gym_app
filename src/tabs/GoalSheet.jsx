import { useState, useMemo } from "react";
import { History, Check } from "lucide-react";
import { todayISO, formatDate } from "../lib/id.js";
import { nameMap } from "../lib/search.js";
import { ENTRY_TYPES } from "../lib/entryTypes.js";
import { useSheets } from "../lib/SheetStack.js";
import { GOAL_PERIODS, goalLabel, frequencyLabel, goalStatus, recentPeriods, periodOf, periodLabel, shiftPeriod, progressText, daysIn } from "../lib/goals.js";
import BottomSheet, { SheetHeader } from "../ui/BottomSheet.jsx";
import SheetActions from "../ui/SheetActions.jsx";
import EmptyState from "../ui/EmptyState.jsx";
import TagChip from "../ui/TagChip.jsx";
import SetsSummary from "../ui/SetsSummary.jsx";
import { SheetLink } from "../ui/SheetNav.jsx";
import { StatusPill, PeriodStrip } from "./GoalParts.jsx";
import { GOAL_ACCENT } from "./GoalEditor.jsx";
import { cardStyle, labelStyle, metaStyle, eyebrowStyle, chipRowStyle, ghostLinkStyle } from "../ui/styles.js";

// How many earlier weeks/months of history show before "Show earlier".
const EARLIER_PAGE = 12;

// Read-only summary of a Plan goal, opened on the sheet stack: where it
// stands this week or month, the last few periods at a glance, what it
// counts, then every session and mat session that matched it — this
// period's first, set apart, then earlier ones grouped by week or month,
// each marked met or missed. Under each entry, just the exercises that made
// it count. Tapping an entry opens it on top. `matches` is goalMatches
// output.
export default function GoalSheet({ goal, matches, exercises, onEdit, onDelete, onBack, onClose }) {
  const today = todayISO();
  const sheets = useSheets();
  const [shownEarlier, setShownEarlier] = useState(EARLIER_PAGE);
  const exerciseNameById = useMemo(() => nameMap(exercises), [exercises]);
  const state = goalStatus(goal, matches, today);
  const strip = recentPeriods(goal, matches, today, 8);
  const periodMeta = GOAL_PERIODS[goal.period];

  // Earlier matches grouped by the week/month they fell in, newest first.
  const current = periodOf(today, goal.period);
  const thisPeriod = matches.filter((m) => m.entry.date >= current.start && m.entry.date <= current.end);
  const earlierGroups = useMemo(() => {
    const groups = [];
    matches
      .filter((m) => m.entry.date < current.start)
      .forEach((m) => {
        const last = groups[groups.length - 1];
        if (last && m.entry.date >= last.period.start) last.matches.push(m);
        else groups.push({ period: periodOf(m.entry.date, goal.period), matches: [m] });
      });
    return groups;
  }, [matches, current.start, goal.period]);
  const later = matches.filter((m) => m.entry.date > current.end); // dated in the future

  const lastPeriod = shiftPeriod(current, goal.period, -1);

  return (
    <BottomSheet
      onClose={onClose}
      header={
        <SheetHeader eyebrow="Goal" accent={GOAL_ACCENT} title={goalLabel(goal, exerciseNameById)} meta={frequencyLabel(goal)} onBack={onBack} onClose={onClose}>
          <SheetActions onEdit={onEdit} onDelete={onDelete} />
        </SheetHeader>
      }
    >
      <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{progressText(goal, state)}</div>
            <div style={{ ...metaStyle, marginTop: 2 }}>
              {periodMeta.lastLabel}: {state.lastCount} of {state.target}
              {state.lastCount >= state.target ? " · met" : " · missed"}
            </div>
          </div>
          <StatusPill status={state.status} />
        </div>
        <PeriodStrip rows={strip} period={goal.period} target={state.target} labels />
      </div>

      <div>
        <span style={labelStyle}>Counts</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(goal.tags || []).length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={metaStyle}>{goal.tags.length > 1 ? (goal.tagMatch === "any" ? "Any of" : "All of") : "Tagged"}</span>
              <div style={chipRowStyle}>
                {goal.tags.map((t) => (
                  <TagChip key={t} label={t} small active accent={GOAL_ACCENT} />
                ))}
              </div>
            </div>
          )}
          {(goal.exerciseIds || []).length > 0 && (
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", fontSize: 14 }}>
              <span style={metaStyle}>{(goal.tags || []).length > 0 ? "Or any of" : "Any of"}</span>
              {goal.exerciseIds.map((id, i) => (
                <span key={id} style={{ fontWeight: 600, color: `var(${GOAL_ACCENT})` }}>
                  <SheetLink sheet={exerciseNameById.has(id) ? { kind: "exercise", id } : null}>{exerciseNameById.get(id) || "Deleted exercise"}</SheetLink>
                  {i < goal.exerciseIds.length - 1 ? "," : ""}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <span style={{ ...labelStyle, marginBottom: 10 }}>
          History{matches.length > 0 && <span style={{ fontWeight: 500 }}> · {matches.length} {matches.length === 1 ? "entry" : "entries"}</span>}
        </span>
        {matches.length === 0 ? (
          <div style={{ ...cardStyle, padding: 0, borderStyle: "dashed" }}>
            <EmptyState icon={History} compact>
              Nothing in your log matches this goal yet.
            </EmptyState>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {later.length > 0 && <PeriodGroup title="Coming up" matches={later} exerciseNameById={exerciseNameById} sheets={sheets} />}
            <PeriodGroup
              title={periodMeta.thisLabel}
              sub={periodLabel(current, goal.period)}
              count={state.count}
              target={state.target}
              current
              matches={thisPeriod}
              emptyText={`Nothing yet ${periodMeta.thisLabel.toLowerCase()}.`}
              exerciseNameById={exerciseNameById}
              sheets={sheets}
            />
            {earlierGroups.length > 0 && (
              <div style={{ ...eyebrowStyle, color: "var(--text-faint)", display: "flex", alignItems: "center", gap: 8 }}>
                Earlier
                <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
              </div>
            )}
            {earlierGroups.slice(0, shownEarlier).map((g) => (
              <PeriodGroup
                key={g.period.start}
                title={g.period.start === lastPeriod.start ? periodMeta.lastLabel : periodLabel(g.period, goal.period)}
                sub={g.period.start === lastPeriod.start ? periodLabel(g.period, goal.period) : undefined}
                count={daysIn(g.matches, g.period)}
                target={state.target}
                matches={g.matches}
                exerciseNameById={exerciseNameById}
                sheets={sheets}
              />
            ))}
            {earlierGroups.length > shownEarlier && (
              <button onClick={() => setShownEarlier((n) => n + EARLIER_PAGE)} style={{ ...ghostLinkStyle, alignSelf: "center" }}>
                Show earlier
              </button>
            )}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

// One week or month of a goal's history: its name, how many days of the
// target it got (with a tick once met), then its matching entries. The
// current one is tinted, and earlier ones are quieter, so "now" stands out.
function PeriodGroup({ title, sub, count, target, current = false, matches, emptyText, exerciseNameById, sheets }) {
  const met = count >= target;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: current ? `var(${GOAL_ACCENT})` : "var(--text)" }}>{title}</span>
        {sub && <span style={metaStyle}>{sub}</span>}
        {count !== undefined && (
          <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: met ? "var(--accent2)" : current ? "var(--text-dim)" : "var(--danger)", whiteSpace: "nowrap" }}>
            {met && <Check size={13} />}
            {count} of {target}
          </span>
        )}
      </div>
      {matches.length === 0 && emptyText ? (
        <div style={{ ...metaStyle, padding: "10px 12px", border: "1px dashed var(--border-strong)", borderRadius: 12 }}>{emptyText}</div>
      ) : (
        matches.map((m) => (
          <MatchCard key={`${m.source}-${m.entry.id}`} match={m} current={current} exerciseNameById={exerciseNameById} onOpen={sheets ? () => sheets.open({ kind: "entry", source: m.source, id: m.entry.id }) : undefined} />
        ))
      )}
    </div>
  );
}

// One matching session or mat session: its kind, date and title, then only
// the exercises that made it count (or a note that its tags did).
function MatchCard({ match, current, exerciseNameById, onOpen }) {
  const { entry, source, blocks } = match;
  const meta = ENTRY_TYPES[source];
  return (
    <div
      onClick={onOpen}
      className={onOpen ? "card-click" : undefined}
      style={{ ...cardStyle, padding: 12, ...(current ? { borderColor: `color-mix(in srgb, var(${GOAL_ACCENT}) 45%, var(--border))` } : { background: "var(--surface-2)" }) }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ ...eyebrowStyle, fontSize: 10, color: `var(${meta.accent})`, background: `var(${meta.accent}-dim)`, borderRadius: 999, padding: "2px 8px" }}>{meta.singular}</span>
        <span style={{ fontSize: 12, color: "var(--text-dim)" }}>{formatDate(entry.date)}</span>
      </div>
      {entry.title && <div style={{ fontWeight: 600, fontSize: 14, marginTop: 6 }}>{entry.title}</div>}
      {blocks.length > 0 ? (
        <SetsSummary entry={{ blocks, groups: [] }} exerciseNameById={exerciseNameById} accent={meta.accent} includeEmpty style={{ marginTop: 6 }} />
      ) : (
        <div style={{ ...metaStyle, marginTop: 6 }}>Counted by its tags: {(entry.tags || []).join(", ")}</div>
      )}
    </div>
  );
}
