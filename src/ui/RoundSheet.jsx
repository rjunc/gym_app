import { useMemo } from "react";
import { X } from "lucide-react";
import { formatDate } from "../lib/id.js";
import { useLog } from "../lib/LogContext.js";
import { ENTRY_TYPES } from "../lib/entryTypes.js";
import { GI_KINDS, RESULTS, roundParts } from "../lib/mat.js";
import { RESULT_COLORS } from "./MatFields.jsx";
import BottomSheet from "./BottomSheet.jsx";
import { BackButton, SheetLink } from "./SheetNav.jsx";
import { labelStyle, ghostLinkStyle } from "./styles.js";

// Read-only sheet for one round of a mat session, opened from a technique's
// history (see TechniqueHistorySheet): which session it was in (date, title,
// Gi/No-Gi), the round's number and partner, every part with each
// technique and how it went (technique names link to their own sheets), and
// the round's full note, which scrolls with the sheet however long it is.
// "Open session" opens the whole mat session on top.
export default function RoundSheet({ entry, roundId, onBack, onClose }) {
  const log = useLog();
  const techniques = (log && log.techniques) || [];
  const names = useMemo(() => new Map(techniques.map((t) => [t.id, t.name])), [techniques]);
  const accent = ENTRY_TYPES.rolls.accent;
  const rounds = entry.rounds || [];
  const index = rounds.findIndex((r) => r.id === roundId);
  const round = rounds[index];
  const link = (id) => (names.has(id) ? <SheetLink sheet={{ kind: "technique", id }}>{names.get(id)}</SheetLink> : "Deleted technique");

  return (
    <BottomSheet onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          {onBack && <BackButton onBack={onBack} />}
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: `var(${accent})` }}>
            {round ? `Round ${index + 1} of ${rounds.length}` : "Round"}
          </span>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{round && round.partner ? `With ${round.partner}` : entry.title || formatDate(entry.date)}</div>
          <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
            {[formatDate(entry.date), round && round.partner && entry.title, GI_KINDS[entry.gi]].filter(Boolean).join(" · ")}
          </div>
        </div>
        <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", flexShrink: 0 }}>
          <X size={18} />
        </button>
      </div>

      <SheetLink sheet={{ kind: "entry", source: "rolls", id: entry.id }} style={{ ...ghostLinkStyle, color: `var(${accent})`, textDecoration: "none", alignSelf: "flex-start" }}>
        Open session
      </SheetLink>

      {!round ? (
        <div style={{ fontSize: 13, color: "var(--text-dim)" }}>This round is no longer in the session.</div>
      ) : (
        <>
          {roundParts(round).some((p) => (p.techniques || []).length > 0) && (
            <div>
              <span style={labelStyle}>Techniques</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {roundParts(round).map((part, p, all) => (
                  <div key={part.id || p} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {all.length > 1 && <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)" }}>{p === 0 ? "Part 1" : `Part ${p + 1} · restarted`}</div>}
                    {(part.techniques || []).length === 0 && all.length > 1 && <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Nothing logged</div>}
                    {(part.techniques || []).map((t, k) => (
                      <div key={k} style={{ display: "flex", gap: 8, fontSize: 13 }}>
                        <span style={{ color: `var(${RESULT_COLORS[t.result]})`, fontWeight: 700, minWidth: 74, flexShrink: 0 }}>{RESULTS[t.result]}</span>
                        <span style={{ color: `var(${accent})`, fontWeight: 600 }}>{link(t.techniqueId)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
          {round.note && (
            <div>
              <span style={labelStyle}>Note</span>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, lineHeight: 1.55, color: "var(--text)", margin: 0, whiteSpace: "pre-wrap" }}>{round.note}</p>
            </div>
          )}
        </>
      )}
    </BottomSheet>
  );
}
