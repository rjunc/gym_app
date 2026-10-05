import { useState, useMemo } from "react";
import { History, Check, Pause, Play } from "lucide-react";
import { todayISO, formatDate } from "../lib/id.js";
import { nameMap } from "../lib/search.js";
import { useLog } from "../lib/LogContext.js";
import { useSheets } from "../lib/SheetStack.js";
import { isActive, isChecklist, goalLabel, frequencyLabel, goalStatus, recentWindows, windowEnding, windowLabel, windowName, matchesIn, progressText } from "../lib/goals.js";
import BottomSheet, { SheetHeader } from "../ui/BottomSheet.jsx";
import SheetActions, { sheetActionBtnStyle } from "../ui/SheetActions.jsx";
import EmptyState from "../ui/EmptyState.jsx";
import { StatusPill, PeriodStrip, MatchCard, RulesSummary, ChecklistSummary, GOAL_ACCENT } from "./GoalParts.jsx";
import { cardStyle, labelStyle, metaStyle, eyebrowStyle, ghostLinkStyle } from "../ui/styles.js";

// How many earlier months of history show before "Show earlier".
const EARLIER_PAGE = 6;

// Read-only summary of a Plan goal, opened on the sheet stack, with Edit,
// Make active/inactive and Delete: where it
// stands over its rolling window (the last 7 or 30 days), the windows before
// that at a glance, what it counts (a checklist's items, each with how it's
// going in the window), then every session that matched it —
// the ones inside the window first, set apart, then earlier ones grouped by
// month. Under each session, just the exercises that made it count. Tapping
// one opens it on top. `matches` is goalMatches output.
export default function GoalSheet({ goal, matches, exercises, onEdit, onToggleActive, onDelete, onBack, onClose }) {
  const today = todayISO();
  const sheets = useSheets();
  const [shownEarlier, setShownEarlier] = useState(EARLIER_PAGE);
  const { routines } = useLog();
  // Names for the goal's exercises and routines (see goalLabel).
  const nameById = useMemo(() => nameMap([...exercises, ...routines]), [exercises, routines]);
  const state = goalStatus(goal, matches, today);
  const strip = recentWindows(goal, matches, today, 8);
  const previous = strip[strip.length - 2];
  // A checklist's windows count items done, not sessions.
  const unit = isChecklist(goal) ? " items" : "";

  const window = windowEnding(goal, today);
  const inWindow = matchesIn(matches, window);
  const later = matches.filter((m) => m.entry.date > window.end); // dated in the future
  // Earlier sessions grouped by calendar month, newest first.
  const earlierGroups = useMemo(() => {
    const groups = [];
    matches
      .filter((m) => m.entry.date < window.start)
      .forEach((m) => {
        const month = m.entry.date.slice(0, 7);
        const last = groups[groups.length - 1];
        if (last && last.month === month) last.matches.push(m);
        else groups.push({ month, matches: [m] });
      });
    return groups;
  }, [matches, window.start]);

  return (
    <BottomSheet
      onClose={onClose}
      header={
        <SheetHeader eyebrow="Goal" accent={GOAL_ACCENT} title={goalLabel(goal, nameById)} meta={frequencyLabel(goal)} onBack={onBack} onClose={onClose}>
          <SheetActions onEdit={onEdit} onDelete={onDelete}>
            {onToggleActive && (
              <button onClick={onToggleActive} style={sheetActionBtnStyle}>
                {isActive(goal) ? <Pause size={14} /> : <Play size={14} />} {isActive(goal) ? "Make inactive" : "Make active"}
              </button>
            )}
          </SheetActions>
        </SheetHeader>
      }
    >
      <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{progressText(goal, state, today, nameById)}</div>
            <div style={{ ...metaStyle, marginTop: 2 }}>
              {windowLabel(previous.window)}: {previous.count} of {state.target}
              {unit}
              {previous.met ? " · met" : " · missed"}
            </div>
          </div>
          <StatusPill status={isActive(goal) ? state.status : "inactive"} />
        </div>
        <PeriodStrip rows={strip} target={state.target} labels />
        {!isActive(goal) && <div style={metaStyle}>Inactive: kept with its history, but not tracked on Home.</div>}
      </div>

      <div>
        <span style={labelStyle}>{isChecklist(goal) ? `Each of · ${windowName(goal).toLowerCase()}` : "Counts"}</span>
        {isChecklist(goal) ? <ChecklistSummary items={state.items} nameById={nameById} /> : <RulesSummary goal={goal} nameById={nameById} />}
      </div>

      <div>
        <span style={{ ...labelStyle, marginBottom: 10 }}>
          History{matches.length > 0 && <span style={{ fontWeight: 500 }}> · {matches.length} {matches.length === 1 ? "session" : "sessions"}</span>}
        </span>
        {matches.length === 0 ? (
          <div style={{ ...cardStyle, padding: 0, borderStyle: "dashed" }}>
            <EmptyState icon={History} compact>
              No sessions match this goal yet.
            </EmptyState>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {later.length > 0 && <MatchGroup title="Coming up" matches={later} nameById={nameById} sheets={sheets} />}
            <MatchGroup
              title={windowName(goal)}
              sub={windowLabel(window)}
              count={state.count}
              target={state.target}
              unit={unit}
              current
              matches={inWindow}
              emptyText={`Nothing in the ${windowName(goal).toLowerCase()}.`}
              nameById={nameById}
              sheets={sheets}
            />
            {earlierGroups.length > 0 && (
              <div style={{ ...eyebrowStyle, color: "var(--text-faint)", display: "flex", alignItems: "center", gap: 8 }}>
                Earlier
                <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
              </div>
            )}
            {earlierGroups.slice(0, shownEarlier).map((g) => (
              <MatchGroup
                key={g.month}
                title={new Date(`${g.month}-01T00:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                sub={`${g.matches.length} ${g.matches.length === 1 ? "session" : "sessions"}`}
                matches={g.matches}
                nameById={nameById}
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

// A run of a goal's history: a title (the window, or a month), how many
// sessions of the target it holds (a checklist: items done, with `unit`) (the window only, with a tick once met),
// then its sessions. The window's are outlined in the goal's colour and the
// earlier ones are quieter, so what counts right now stands out.
function MatchGroup({ title, sub, count, target, unit = "", current = false, matches, emptyText, nameById, sheets }) {
  const met = count >= target;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: current ? `var(${GOAL_ACCENT})` : "var(--text)" }}>{title}</span>
        {sub && <span style={metaStyle}>{sub}</span>}
        {count !== undefined && (
          <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: met ? "var(--accent2)" : "var(--danger)", whiteSpace: "nowrap" }}>
            {met && <Check size={13} />}
            {count} of {target}
            {unit}
          </span>
        )}
      </div>
      {matches.length === 0 && emptyText ? (
        <div style={{ ...metaStyle, padding: "10px 12px", border: "1px dashed var(--border-strong)", borderRadius: 12 }}>{emptyText}</div>
      ) : (
        matches.map((m) => (
          <MatchCard key={m.entry.id} match={m} current={current} nameById={nameById} onOpen={sheets ? () => sheets.open({ kind: "entry", source: "sessions", id: m.entry.id }) : undefined} />
        ))
      )}
    </div>
  );
}
