import { useMemo, Fragment } from "react";
import { useLog } from "../lib/LogContext.js";
import { GI_KINDS, RESULTS, roundParts, roundTechniques } from "../lib/mat.js";
import { RESULT_COLORS } from "./MatFields.jsx";
import { SheetLink } from "./SheetNav.jsx";
import { labelStyle } from "./styles.js";

// Technique id -> name, from the log.
function useTechniqueNames() {
  const log = useLog();
  const techniques = (log && log.techniques) || [];
  return useMemo(() => new Map(techniques.map((t) => [t.id, t.name])), [techniques]);
}

const hasMat = (entry) => GI_KINDS[entry.gi] || (entry.drilledIds || []).length > 0 || (entry.rounds || []).length > 0;

// A mat session laid out to read, on its summary sheet: Gi/No-Gi, what was
// taught or drilled, then each round — partner, every technique with how it
// went (hit, attempted, caught by) and the round's note. A round restarted
// after a tap shows each part under "Part 1", "Part 2 · restarted"… Technique names are
// links to their own sheets (see SheetStack). Renders nothing for an entry
// with none of it.
export default function MatDetail({ entry, accent }) {
  const names = useTechniqueNames();
  if (!hasMat(entry)) return null;
  const link = (id) => (names.has(id) ? <SheetLink sheet={{ kind: "technique", id }}>{names.get(id)}</SheetLink> : "Deleted technique");
  const rounds = entry.rounds || [];
  return (
    <>
      {GI_KINDS[entry.gi] && (
        <div style={{ fontSize: 12, fontWeight: 700, color: `var(${accent})` }}>{GI_KINDS[entry.gi]}</div>
      )}
      {(entry.drilledIds || []).length > 0 && (
        <div>
          <span style={labelStyle}>Taught / drilled</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {entry.drilledIds.map((id) => (
              <div key={id} style={{ fontSize: 13, fontWeight: 600, color: `var(${accent})` }}>
                {link(id)}
              </div>
            ))}
          </div>
        </div>
      )}
      {rounds.length > 0 && (
        <div>
          <span style={labelStyle}>{rounds.length === 1 ? "1 round" : `${rounds.length} rounds`}</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rounds.map((r, i) => (
              <div key={r.id} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 10px" }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>
                  <span style={{ color: "var(--text-dim)", marginRight: 6 }}>{i + 1}</span>
                  {r.partner || <span style={{ color: "var(--text-dim)", fontWeight: 500 }}>Round {i + 1}</span>}
                </div>
                {roundParts(r).map((part, p, all) =>
                  all.length === 1 && (part.techniques || []).length === 0 ? null : (
                    <div key={part.id || p} style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
                      {all.length > 1 && (
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)" }}>{p === 0 ? "Part 1" : `Part ${p + 1} · restarted`}</div>
                      )}
                      {(part.techniques || []).map((t, k) => (
                        <div key={k} style={{ display: "flex", gap: 8, fontSize: 13 }}>
                          <span style={{ color: `var(${RESULT_COLORS[t.result]})`, fontWeight: 700, minWidth: 74, flexShrink: 0 }}>{RESULTS[t.result]}</span>
                          <span style={{ color: `var(${accent})`, fontWeight: 600 }}>{link(t.techniqueId)}</span>
                        </div>
                      ))}
                    </div>
                  )
                )}
                {r.note && <div style={{ fontSize: 12, color: "var(--text-dim)", fontStyle: "italic", marginTop: 4 }}>{r.note}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// A mat session in brief, for its card: "No-Gi · Drilled: Scissor sweep,
// Armbar", then "4 rounds · 2 restarts · Hit: Triangle ×2 · Caught by:
// Kimura" (each technique once per result, counted across rounds and their
// parts). Renders nothing for an
// entry with none of it.
export function MatSummary({ entry, accent, style }) {
  const names = useTechniqueNames();
  if (!hasMat(entry)) return null;
  const nameOf = (id) => names.get(id) || "Deleted technique";
  const rounds = entry.rounds || [];
  const restarts = rounds.reduce((n, r) => n + roundParts(r).length - 1, 0);
  const firstLine = [GI_KINDS[entry.gi], (entry.drilledIds || []).length ? `Drilled: ${entry.drilledIds.map(nameOf).join(", ")}` : ""].filter(Boolean).join(" · ");
  const byResult = Object.keys(RESULTS)
    .map((result) => {
      const counts = new Map();
      rounds.forEach((r) => roundTechniques(r).forEach((t) => t.result === result && counts.set(t.techniqueId, (counts.get(t.techniqueId) || 0) + 1)));
      return { result, items: [...counts].map(([id, n]) => (n > 1 ? `${nameOf(id)} ×${n}` : nameOf(id))) };
    })
    .filter((g) => g.items.length > 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 12, lineHeight: 1.4, ...style }}>
      {firstLine && <div style={{ fontWeight: 700, color: `var(${accent})` }}>{firstLine}</div>}
      {rounds.length > 0 && (
        <div>
          <span style={{ fontWeight: 700, color: "var(--text-dim)" }}>
            {rounds.length === 1 ? "1 round" : `${rounds.length} rounds`}
            {restarts > 0 && ` · ${restarts === 1 ? "1 restart" : `${restarts} restarts`}`}
          </span>
          {byResult.map((g) => (
            <Fragment key={g.result}>
              <span style={{ color: "var(--text-dim)" }}> · </span>
              <span style={{ fontWeight: 700, color: `var(${RESULT_COLORS[g.result]})` }}>{RESULTS[g.result]}: </span>
              <span>{g.items.join(", ")}</span>
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
