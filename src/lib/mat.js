import { uid } from "./id.js";

// A mat session (BJJ class / open mat), stored in the `rolls` log. Besides
// the date, title, tags and text every entry has, it can hold:
//   gi          "gi" | "no-gi" — the whole session is one or the other
//   drilledIds  techniques taught or drilled, in order (technique ids)
//   rounds      [{ id, partner?, note?, parts: [{ id, techniques: [{ techniqueId, result }] }] }]
//               one per round rolled (e.g. 5 minutes with one partner), in
//               order. A round has one part, plus one more each time you
//               restart from scratch after a tap within it. `result` is how
//               that technique went in that part (see RESULTS)
//   techniqueIds  every technique the session mentions, drilled first then
//               in round order, each once — derived on save (see
//               matTechniqueIds), which is what backlinks, usage and search go
//               by, like a lifting session's exerciseIds
// All of it is optional: a mat session can still be just a line of text.

export const GI_KINDS = { gi: "Gi", "no-gi": "No-Gi" };

// How a technique went in a round, in the order the form offers them.
export const RESULTS = { hit: "Hit", attempted: "Attempted", caught: "Caught by" };
export const DEFAULT_RESULT = "hit";

// A round's parts, always at least one (a round with none reads as one
// empty part).
export const roundParts = (round) => (round && Array.isArray(round.parts) && round.parts.length > 0 ? round.parts : [{ id: "", techniques: [] }]);

// Every technique in a round, across its parts, in order.
export const roundTechniques = (round) => roundParts(round).flatMap((p) => p.techniques || []);

// Every technique a mat session mentions, each once: drilled first, then
// the rounds', in order.
export function matTechniqueIds({ drilledIds, rounds } = {}) {
  const ids = [...(drilledIds || []), ...(rounds || []).flatMap((r) => roundTechniques(r).map((t) => t.techniqueId))];
  return [...new Set(ids.filter((id) => typeof id === "string" && id))];
}

// A part just started in a round (a restart after a tap), and a round just
// added to the form, which starts with one part.
export const newDraftPart = () => ({ key: uid(), techniques: [] });
export const newDraftRound = () => ({ key: uid(), partner: "", note: "", parts: [newDraftPart()] });

// Stored rounds -> the form's draft: `key` is the round's or part's id, or a
// fresh one with `fresh` (a redo starts new rounds).
export const toDraftRounds = (rounds, { fresh = false } = {}) =>
  (rounds || []).map((r) => ({
    key: fresh || !r.id ? uid() : r.id,
    partner: r.partner || "",
    note: r.note || "",
    parts: roundParts(r).map((p) => ({ key: fresh || !p.id ? uid() : p.id, techniques: (p.techniques || []).map((t) => ({ ...t })) })),
  }));

const oneLine = (s) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim() : "");

// One round's technique list, checked: a technique id and a known result
// (DEFAULT_RESULT otherwise).
const cleanTechniques = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((t) => t && typeof t.techniqueId === "string" && t.techniqueId)
    .map((t) => ({ techniqueId: t.techniqueId, result: RESULTS[t.result] ? t.result : DEFAULT_RESULT }));

// The form's draft rounds -> what's saved, in order. Every round and part is
// kept, even an empty one (it still says a round was rolled, or restarted
// after a tap), and a round always has at least one part; partner and note
// are trimmed to one line and left out when blank.
export const fromDraftRounds = (drafts) =>
  (drafts || []).map((r) => {
    const partner = oneLine(r.partner);
    const note = oneLine(r.note);
    const parts = (r.parts && r.parts.length > 0 ? r.parts : [newDraftPart()]).map((p) => ({ id: p.key, techniques: cleanTechniques(p.techniques) }));
    return { id: r.key, ...(partner ? { partner } : {}), ...(note ? { note } : {}), parts };
  });

// The mat fields of a mat session form, ready to save: gi if picked,
// drilledIds, rounds and the derived techniqueIds.
export function matFields(form) {
  const rounds = fromDraftRounds(form.rounds);
  const drilledIds = [...new Set((form.drilledIds || []).filter((id) => typeof id === "string" && id))];
  return {
    ...(GI_KINDS[form.gi] ? { gi: form.gi } : {}),
    drilledIds,
    rounds,
    techniqueIds: matTechniqueIds({ drilledIds, rounds }),
  };
}

// Whether a mat session form has anything to save besides the text: a drilled
// technique or a round. (Picking Gi/No-Gi alone isn't a log.)
export const hasMatContent = (form) => (form.drilledIds || []).length > 0 || (form.rounds || []).length > 0;

// Validates the mat fields of an imported record; {} when it has none.
export function normalizeMat(raw) {
  const out = {};
  if (GI_KINDS[raw.gi]) out.gi = raw.gi;
  if (Array.isArray(raw.drilledIds)) out.drilledIds = [...new Set(raw.drilledIds.filter((id) => typeof id === "string" && id))];
  if (Array.isArray(raw.rounds)) {
    out.rounds = raw.rounds
      .filter((r) => r && typeof r === "object")
      .map((r) => {
        const partner = oneLine(r.partner);
        const note = oneLine(r.note);
        const rawParts = Array.isArray(r.parts) ? r.parts.filter((p) => p && typeof p === "object") : [];
        const parts = (rawParts.length > 0 ? rawParts : [{}]).map((p) => ({ id: typeof p.id === "string" && p.id ? p.id : uid(), techniques: cleanTechniques(p.techniques) }));
        return { id: typeof r.id === "string" && r.id ? r.id : uid(), ...(partner ? { partner } : {}), ...(note ? { note } : {}), parts };
      });
  }
  if (out.drilledIds || out.rounds) out.techniqueIds = matTechniqueIds(out);
  return out;
}

// How a technique has gone across mat sessions: how many sessions drilled it,
// and how many times it was hit, attempted or caught you in a round.
export function techniqueStats(entries, techniqueId) {
  const stats = { drilled: 0, hit: 0, attempted: 0, caught: 0 };
  (entries || []).forEach((e) => {
    if ((e.drilledIds || []).includes(techniqueId)) stats.drilled += 1;
    (e.rounds || []).forEach((r) =>
      roundTechniques(r).forEach((t) => {
        if (t.techniqueId === techniqueId && t.result in stats) stats[t.result] += 1;
      })
    );
  });
  return stats;
}

// Partners rolled with, most recent session first then A–Z, each once, for
// the form's partner suggestions.
export function recentPartners(entries) {
  const sorted = [...(entries || [])].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const seen = new Map();
  sorted.forEach((e) => (e.rounds || []).forEach((r) => r.partner && !seen.has(r.partner.toLowerCase()) && seen.set(r.partner.toLowerCase(), r.partner)));
  return [...seen.values()];
}

// A round's techniques grouped by result, as "Hit: Triangle, Kimura" parts in
// RESULTS order.
function resultParts(techniques, nameOf) {
  return Object.entries(RESULTS)
    .map(([key, label]) => {
      const names = techniques.filter((t) => t.result === key).map((t) => nameOf(t.techniqueId));
      return names.length ? `${label}: ${names.join(", ")}` : "";
    })
    .filter(Boolean);
}

// A mat session as one line, for the CSV and anywhere text is needed:
// "No-Gi · Drilled: Scissor sweep, Armbar · Round 1 (Sam): Hit: Triangle;
// Caught by: Kimura — good pace · Round 2: …". A round restarted after a tap
// lists its parts: "Round 3: Part 1: Hit: Triangle | Part 2: Caught by:
// Kimura". "" when it has none of it.
export function matSummaryText(entry, nameById) {
  const nameOf = (id) => nameById.get(id) || "Deleted technique";
  const parts = [];
  if (GI_KINDS[entry.gi]) parts.push(GI_KINDS[entry.gi]);
  if ((entry.drilledIds || []).length) parts.push(`Drilled: ${entry.drilledIds.map(nameOf).join(", ")}`);
  (entry.rounds || []).forEach((r, i) => {
    const head = `Round ${i + 1}${r.partner ? ` (${r.partner})` : ""}`;
    const pieces = roundParts(r);
    const body =
      pieces.length === 1
        ? resultParts(pieces[0].techniques || [], nameOf).join("; ")
        : pieces.map((p, k) => [`Part ${k + 1}`, resultParts(p.techniques || [], nameOf).join("; ")].filter(Boolean).join(": ")).join(" | ");
    parts.push([body ? `${head}: ${body}` : head, r.note].filter(Boolean).join(" — "));
  });
  return parts.join(" · ");
}
