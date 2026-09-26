// Tidies what's typed into a composer before it's saved, so stray spaces and
// runs of empty lines don't pile up in the log.

// One-line fields (titles, names, prescription, positions): trimmed, with runs
// of whitespace inside collapsed to a single space ("Back  squat" is saved as
// "Back squat", which also keeps name-based duplicate checks honest).
export function cleanLine(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

// Multi-line body text: Windows line endings normalized, trailing spaces
// stripped from every line, any run of blank lines collapsed to one, and
// blank lines/space at the very start and end removed. Line breaks and
// indentation inside the text are kept.
export function cleanText(value) {
  return (value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const LINE_FIELDS = ["title", "name", "prescription", "position", "toPosition"];

// Cleans whichever of the known text fields `form` has, leaving everything
// else (tags, ids, flags, dates…) as is. Every composer's save runs through
// this.
export function cleanFields(form) {
  const out = { ...form };
  LINE_FIELDS.forEach((key) => {
    if (typeof out[key] === "string") out[key] = cleanLine(out[key]);
  });
  if (typeof out.text === "string") out.text = cleanText(out.text);
  return out;
}
