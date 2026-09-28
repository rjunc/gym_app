import { useState, useMemo } from "react";
import { Plus, X, LayoutGrid, RotateCcw } from "lucide-react";
import { useLog } from "../lib/LogContext.js";
import { compareByUsage } from "../lib/links.js";
import { prefixMatchesFirst } from "../lib/search.js";
import { GI_KINDS, RESULTS, DEFAULT_RESULT, newDraftRound, newDraftPart, recentPartners } from "../lib/mat.js";
import TagChip from "./TagChip.jsx";
import SegmentedToggle from "./SegmentedToggle.jsx";
import PagePicker from "./PagePicker.jsx";
import { labelStyle, inputStyle, tagPillStyle, ghostLinkStyle } from "./styles.js";

// The colour a round's result reads in: a hit in green, being caught in red,
// an attempt dim.
export const RESULT_COLORS = { hit: "--accent2", attempted: "--text-dim", caught: "--danger" };

// Sizes a textarea to its text, so a long round note is all in view while
// it's written (used as its ref, for the text it opens with, and on input).
const growToFit = (el) => {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
};

const iconBtnStyle = { background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", display: "flex", padding: 2 };

// The small "Hit ▾" switch after a technique in a round.
const resultSelectStyle = {
  background: "transparent",
  border: "none",
  fontSize: 12,
  fontWeight: 700,
  fontFamily: "inherit",
  cursor: "pointer",
  padding: 0,
};

// Picks techniques from the Techniques library, the way ExercisesField picks
// exercises: typing matches a technique's name, tags or positions (ranked by
// use in mat sessions, names starting with the query first), and Browse
// opens the Techniques page itself over the form, where a technique that
// doesn't exist yet can be created and is added once saved. Picking calls
// onAdd(technique); `addedIds` are left out of the suggestions and shown as
// Added on the page. `label` is the field's heading, with `children` (the
// picked pills) under it; without one, the search box and Browse sit on one
// line (inside a round).
export function TechniquePicker({ addedIds = [], onAdd, onRemove, label, placeholder = "Search techniques…", accentVar, children }) {
  const log = useLog();
  const techniques = log.techniques || [];
  const [query, setQuery] = useState("");
  const [browsing, setBrowsing] = useState(false);

  const q = query.trim().toLowerCase();
  const suggestions = useMemo(() => {
    if (!q) return [];
    const ranked = techniques
      .filter((t) => !addedIds.includes(t.id))
      .filter((t) => [t.name, t.position, t.toPosition, ...(t.tags || [])].some((v) => (v || "").toLowerCase().includes(q)))
      .sort(compareByUsage(log.techniqueUsage || new Map()));
    return prefixMatchesFirst(ranked, q, (t) => [t.name]).slice(0, 8);
  }, [q, techniques, addedIds, log.techniqueUsage]);

  const add = (technique) => {
    onAdd(technique);
    setQuery("");
  };
  const browse = (
    <button onClick={() => setBrowsing(true)} style={{ ...ghostLinkStyle, color: `var(${accentVar})`, flexShrink: 0 }}>
      <LayoutGrid size={12} /> Browse
    </button>
  );
  const input = (
    <input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder={techniques.length === 0 ? "No techniques yet — Browse to add one" : placeholder}
      style={{ ...inputStyle, ...(label ? {} : { padding: "7px 8px", fontSize: 13, flex: 1, minWidth: 0 }) }}
    />
  );

  return (
    <div>
      {label ? (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <span style={{ ...labelStyle, marginBottom: 0 }}>{label}</span>
            {browse}
          </div>
          {children}
          {input}
        </>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {input}
          {browse}
        </div>
      )}
      {suggestions.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {suggestions.map((t) => (
            <TagChip key={t.id} small accent={accentVar} label={t.name} onClick={() => add(t)} />
          ))}
        </div>
      )}
      {browsing && (
        <PagePicker kind="techniques" addedIds={addedIds} onAdd={add} onRemove={onRemove} onDone={() => setBrowsing(false)} initialQuery={query.trim()} />
      )}
    </div>
  );
}

// A mat session's structure, under the date on its form (see lib/mat.js):
//   Gi / No-Gi   one for the whole session; tapping the picked one clears it
//   Taught / drilled   techniques from the class or drilling, as pills
//   Rounds       one card per round rolled, in order: an optional partner
//                (suggesting partners from earlier sessions in `history`),
//                the techniques that came up — each marked Hit, Attempted or
//                Caught by (being caught by it) — and a note. "Restart"
//                starts a new part of the same round, for starting over
//                after a tap; each part has its own techniques
// Everything is optional; a quick log can skip it all and just use the
// notes. A technique that isn't in the library yet can be created from
// Browse.
export default function MatFields({ form, setForm, history = [], accentVar }) {
  const log = useLog();
  const nameById = useMemo(() => new Map((log.techniques || []).map((t) => [t.id, t.name])), [log.techniques]);
  const partners = useMemo(() => recentPartners(history), [history]);
  const nameOf = (id) => nameById.get(id) || "Deleted technique";
  const drilledIds = form.drilledIds || [];
  const rounds = form.rounds || [];

  const setDrilled = (update) => setForm((f) => ({ ...f, drilledIds: update(f.drilledIds || []) }));
  const setRounds = (update) => setForm((f) => ({ ...f, rounds: update(f.rounds || []) }));
  const updateRound = (key, update) => setRounds((list) => list.map((r) => (r.key === key ? update(r) : r)));
  const setParts = (key, update) => updateRound(key, (r) => ({ ...r, parts: update(r.parts || []) }));
  const setTechniques = (roundKey, partKey, update) =>
    setParts(roundKey, (parts) => parts.map((p) => (p.key === partKey ? { ...p, techniques: update(p.techniques || []) } : p)));

  const pill = (id, onRemove) => (
    <span key={id} style={{ ...tagPillStyle, background: `var(${accentVar}-dim)`, borderColor: `var(${accentVar})`, color: `var(${accentVar})` }}>
      {nameOf(id)}
      <button onClick={onRemove} aria-label={`Remove ${nameOf(id)}`} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", display: "flex" }}>
        <X size={11} />
      </button>
    </span>
  );

  return (
    <>
      <div>
        <span style={labelStyle}>Gi or No-Gi</span>
        <SegmentedToggle
          options={Object.entries(GI_KINDS).map(([key, label]) => ({ key, label }))}
          value={form.gi || ""}
          setValue={(key) => setForm((f) => ({ ...f, gi: f.gi === key ? "" : key }))}
          accent={accentVar}
        />
      </div>

      <TechniquePicker
        label="Taught / drilled"
        addedIds={drilledIds}
        onAdd={(t) => setDrilled((ids) => (ids.includes(t.id) ? ids : [...ids, t.id]))}
        onRemove={(id) => setDrilled((ids) => ids.filter((x) => x !== id))}
        accentVar={accentVar}
      >
        {drilledIds.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>{drilledIds.map((id) => pill(id, () => setDrilled((ids) => ids.filter((x) => x !== id))))}</div>
        )}
      </TechniquePicker>

      <div>
        <span style={labelStyle}>Rounds</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rounds.map((round, i) => {
            const parts = round.parts || [];
            return (
              <div key={round.key} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, flex: 1 }}>Round {i + 1}</span>
                  <button onClick={() => setRounds((list) => list.filter((r) => r.key !== round.key))} aria-label={`Remove round ${i + 1}`} style={iconBtnStyle}>
                    <X size={15} />
                  </button>
                </div>
                <input
                  list="mat-partners"
                  value={round.partner || ""}
                  onChange={(e) => updateRound(round.key, (r) => ({ ...r, partner: e.target.value }))}
                  placeholder="Partner (optional)"
                  aria-label={`Round ${i + 1} partner`}
                  style={{ ...inputStyle, padding: "7px 8px", fontSize: 13 }}
                />
                {parts.map((part, p) => (
                  <div
                    key={part.key}
                    style={{ display: "flex", flexDirection: "column", gap: 8, ...(parts.length > 1 ? { borderLeft: `2px solid var(${accentVar})`, paddingLeft: 8 } : {}) }}
                  >
                    {parts.length > 1 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)", flex: 1 }}>{p === 0 ? "Part 1" : `Part ${p + 1} · restarted`}</span>
                        <button onClick={() => setParts(round.key, (list) => list.filter((x) => x.key !== part.key))} aria-label={`Remove part ${p + 1} of round ${i + 1}`} style={iconBtnStyle}>
                          <X size={14} />
                        </button>
                      </div>
                    )}
                    {(part.techniques || []).map((t, k) => (
                      <div key={`${t.techniqueId}-${k}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, flex: 1, minWidth: 0 }}>{nameOf(t.techniqueId)}</span>
                        <select
                          value={t.result}
                          onChange={(e) => {
                            const result = e.target.value;
                            setTechniques(round.key, part.key, (list) => list.map((x, j) => (j === k ? { ...x, result } : x)));
                          }}
                          aria-label={`${nameOf(t.techniqueId)} result`}
                          style={{ ...resultSelectStyle, color: `var(${RESULT_COLORS[t.result]})` }}
                        >
                          {Object.entries(RESULTS).map(([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <button onClick={() => setTechniques(round.key, part.key, (list) => list.filter((_, j) => j !== k))} aria-label={`Remove ${nameOf(t.techniqueId)}`} style={iconBtnStyle}>
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <TechniquePicker
                      addedIds={(part.techniques || []).map((t) => t.techniqueId)}
                      placeholder="Add a technique that came up…"
                      onAdd={(tech) =>
                        setTechniques(round.key, part.key, (list) => (list.some((x) => x.techniqueId === tech.id) ? list : [...list, { techniqueId: tech.id, result: DEFAULT_RESULT }]))
                      }
                      onRemove={(id) => setTechniques(round.key, part.key, (list) => list.filter((x) => x.techniqueId !== id))}
                      accentVar={accentVar}
                    />
                  </div>
                ))}
                <button
                  onClick={() => setParts(round.key, (list) => [...list, newDraftPart()])}
                  title="Started over after a tap, same round"
                  style={{ ...ghostLinkStyle, color: `var(${accentVar})`, alignSelf: "flex-start" }}
                >
                  <RotateCcw size={12} /> Restart after a tap
                </button>
                <textarea
                  value={round.note || ""}
                  onChange={(e) => updateRound(round.key, (r) => ({ ...r, note: e.target.value }))}
                  ref={growToFit}
                  onInput={(e) => growToFit(e.target)}
                  rows={1}
                  placeholder="Note for this round…"
                  aria-label={`Round ${i + 1} note`}
                  style={{ ...inputStyle, padding: "7px 8px", fontSize: 13, resize: "none", overflow: "hidden", lineHeight: 1.4, fontFamily: "inherit" }}
                />
              </div>
            );
          })}
        </div>
        <button onClick={() => setRounds((list) => [...list, newDraftRound()])} style={{ ...ghostLinkStyle, color: `var(${accentVar})`, marginTop: rounds.length ? 10 : 0 }}>
          <Plus size={13} /> Add round
        </button>
        <datalist id="mat-partners">
          {partners.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </div>
    </>
  );
}
