// Positions are freeform strings (e.g. "bottom closed guard"), matched
// case/whitespace-insensitively so "Bottom Guard" and "bottom guard" are
// treated as the same node in the flow graph, while display keeps whichever
// casing was typed first.
export const normalizePosition = (s) => (s || "").trim().toLowerCase();

// All distinct positions used as either a technique's start or end, sorted
// alphabetically, for autocomplete and the flow picker.
export function collectPositions(techniques) {
  const byKey = new Map();
  techniques.forEach((t) => {
    [t.position, t.toPosition].forEach((p) => {
      const key = normalizePosition(p);
      if (key && !byKey.has(key)) byKey.set(key, p.trim());
    });
  });
  return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b));
}

// Techniques that start at `position` (case/whitespace-insensitive match).
export function techniquesFrom(techniques, position) {
  const key = normalizePosition(position);
  return techniques.filter((t) => normalizePosition(t.position) === key);
}
