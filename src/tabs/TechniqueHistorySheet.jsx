import { MoveRight } from "lucide-react";
import { GiOnlyBadge } from "./LibraryItemCard.jsx";
import { formatDateTime, wasEdited } from "../lib/id.js";
import { techniqueStats, RESULTS, roundParts } from "../lib/mat.js";
import TagChip from "../ui/TagChip.jsx";
import HistorySheet from "../ui/HistorySheet.jsx";
import { RESULT_COLORS } from "../ui/MatFields.jsx";
import { SheetLink } from "../ui/SheetNav.jsx";
import { labelStyle, noteTextStyle, metaStyle, chipRowStyle } from "../ui/styles.js";

// Read-only bottom sheet opened by tapping a technique: the technique itself
// (positions, gi-only, tags, notes), how it's gone across mat sessions — how
// many sessions drilled it, and how many times it was hit, attempted or
// caught you in a round — then every mat session that mentions it, newest
// first, with what happened with it in each and those rounds' notes (see
// HistorySheet). `rolls` are
// those mat sessions (see rollsByTechnique).
export default function TechniqueHistorySheet({ technique, pathLabel, accent, rolls, onEdit, onDelete, onBack, onClose }) {
  const stats = techniqueStats(rolls, technique.id);
  const created = formatDateTime(technique.createdAt);
  const statParts = [
    stats.drilled > 0 && { key: "drilled", text: `Drilled in ${stats.drilled} ${stats.drilled === 1 ? "session" : "sessions"}`, color: accent },
    ...Object.keys(RESULTS).map((key) => stats[key] > 0 && { key, text: `${RESULTS[key]} ×${stats[key]}`, color: RESULT_COLORS[key] }),
  ].filter(Boolean);
  return (
    <HistorySheet
      rolls={rolls}
      onEdit={onEdit}
      onDelete={onDelete}
      onBack={onBack}
      onClose={onClose}
      emptyLabel="Not in any mat sessions yet. Add it to one as a drill or in a round when logging."
      // Whether it was drilled that day, and how it went in each round, with
      // that round's note under it (once per round, after its last line, cut
      // to 3 lines). Tapping a round's line or note opens that round on its
      // own (RoundSheet), with the note in full; tapping elsewhere opens the
      // whole session.
      detail={(entry, entryAccent) => {
        const drilled = (entry.drilledIds || []).includes(technique.id);
        const lines = (entry.rounds || []).flatMap((r, i) => {
          const parts = roundParts(r);
          const results = parts.flatMap((part, p) =>
            (part.techniques || [])
              .filter((t) => t.techniqueId === technique.id)
              .map((t, k) => (
                <div key={`${r.id}-${p}-${k}`} style={{ fontSize: 13, marginTop: 2 }}>
                  <span style={{ fontWeight: 700, color: `var(${RESULT_COLORS[t.result]})` }}>{RESULTS[t.result]}</span>
                  <span style={{ color: "var(--text-dim)" }}> · </span>
                  <SheetLink sheet={{ kind: "round", source: "rolls", id: entry.id, roundId: r.id }} style={{ color: "var(--text-dim)" }}>
                    round {i + 1}
                    {parts.length > 1 ? `, part ${p + 1}` : ""}
                    {r.partner ? ` with ${r.partner}` : ""}
                  </SheetLink>
                </div>
              ))
          );
          if (results.length === 0 || !r.note) return results;
          return [
            ...results,
            <SheetLink
              key={`${r.id}-note`}
              sheet={{ kind: "round", source: "rolls", id: entry.id, roundId: r.id }}
              style={{
                fontSize: 12,
                color: "var(--text-dim)",
                fontStyle: "italic",
                marginBottom: 2,
                textDecoration: "none",
                whiteSpace: "pre-wrap",
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {r.note}
            </SheetLink>,
          ];
        });
        return (
          <div style={{ marginTop: 4 }}>
            {drilled && <div style={{ fontSize: 13, fontWeight: 600, color: `var(${entryAccent})`, marginTop: 2 }}>Drilled</div>}
            {lines}
          </div>
        );
      }}
      eyebrow="Technique"
      accent={accent}
      title={technique.name}
      meta={pathLabel}
      header={
        (technique.position || technique.toPosition || technique.giOnly || (technique.tags || []).length > 0) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(technique.position || technique.toPosition || technique.giOnly) && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                {(technique.position || technique.toPosition) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, color: `var(${accent})` }}>
                    <span>{technique.position || "?"}</span>
                    <MoveRight size={14} />
                    <span>{technique.toPosition || "?"}</span>
                  </div>
                )}
                {technique.giOnly && <GiOnlyBadge />}
              </div>
            )}
            {technique.tags && technique.tags.length > 0 && (
              <div style={chipRowStyle}>
                {technique.tags.map((t) => (
                  <TagChip key={t} label={t} small accent={accent} />
                ))}
              </div>
            )}
          </div>
        )
      }
    >
      {statParts.length > 0 && (
        <div>
          <span style={labelStyle}>On the mat</span>
          <div style={chipRowStyle}>
            {statParts.map((p) => (
              <span key={p.key} style={{ fontSize: 13, fontWeight: 600, color: `var(${p.color})`, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "4px 10px" }}>
                {p.text}
              </span>
            ))}
          </div>
        </div>
      )}

      {technique.text && (
        <div>
          <span style={labelStyle}>Notes</span>
          <p style={noteTextStyle}>{technique.text}</p>
        </div>
      )}

      {created && (
        <div style={metaStyle}>
          Created {created}
          {wasEdited(technique) && ` · Edited ${formatDateTime(technique.updatedAt)}`}
        </div>
      )}
    </HistorySheet>
  );
}
