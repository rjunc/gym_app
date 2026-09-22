// A technique's role in the flow graph — the one structured, filterable axis
// on top of freeform tags. Positions accumulate a mix of escapes,
// submissions, sweeps etc. from the same spot; this lets Flow narrow "what
// are my options from bottom mount" down to "just show me the escapes"
// without needing exact tag spelling. Optional — "" means unset.
export const TECHNIQUE_ROLES = [
  "Escape",
  "Submission",
  "Sweep",
  "Pass",
  "Guard Retention",
  "Takedown",
  "Transition",
  "Defense",
];
