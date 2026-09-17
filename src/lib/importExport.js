import { csvEscape, parseCSV } from "./csv.js";
import { folderPath, resolveFolderPath } from "./folders.js";
import { uid, todayISO } from "./id.js";

// The composer always lowercases tags on save, so the tag list (sorted with
// a plain, case-sensitive .sort()) is naturally alphabetical. Imported data
// doesn't go through the composer, so normalize casing here too — otherwise
// an imported "Zebra" would sort ahead of every lowercase tag.
function normalizeTags(raw) {
  const list = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(";") : [];
  return list.map((t) => String(t).trim().toLowerCase()).filter(Boolean);
}

/* ============================== COMBINED CSV ============================== */
// Unified CSV: one file, one 'type' column distinguishing session/journal/routine/
// roll/technique rows. Routine folder paths resolve against `folders` (lifting);
// technique folder paths resolve against `jitsFolders`.

export function combinedToCSV(sessions, routines, journals, folders, rolls = [], techniques = [], jitsFolders = []) {
  const header = ["type", "id", "date", "name", "folder_path", "tags", "text", "position", "to_position", "gi_only"];
  // Sessions/journals/rolls reuse the "name" column (otherwise unused for
  // them) to carry their optional title.
  const sessionRows = sessions.map((s) => ["session", s.id, s.date, s.title || "", "", (s.tags || []).join(";"), s.text || "", "", "", ""]);
  const journalRows = journals.map((j) => ["journal", j.id, j.date, j.title || "", "", (j.tags || []).join(";"), j.text || "", "", "", ""]);
  const rollRows = rolls.map((s) => ["roll", s.id, s.date, s.title || "", "", (s.tags || []).join(";"), s.text || "", "", "", ""]);
  const routineRows = routines.map((r) => [
    "routine",
    r.id,
    "",
    r.name,
    folderPath(folders, r.folderId).map((f) => f.name).join("/"),
    (r.tags || []).join(";"),
    r.text || "",
    "",
    "",
    "",
  ]);
  // Techniques carry an optional position -> to_position pair used by the
  // Flow tab to chain moves together, plus a gi_only flag for the Gi/No-Gi
  // mode filter.
  const techniqueRows = techniques.map((t) => [
    "technique",
    t.id,
    "",
    t.name,
    folderPath(jitsFolders, t.folderId).map((f) => f.name).join("/"),
    (t.tags || []).join(";"),
    t.text || "",
    t.position || "",
    t.toPosition || "",
    t.giOnly ? "1" : "",
  ]);
  return [header, ...sessionRows, ...journalRows, ...routineRows, ...rollRows, ...techniqueRows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\r\n");
}

export function combinedFromCSV(text, existingFolders, existingJitsFolders = []) {
  const rows = parseCSV(text);
  if (rows.length === 0) {
    return { sessions: [], routines: [], journals: [], folders: existingFolders, rolls: [], techniques: [], jitsFolders: existingJitsFolders };
  }
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const typeIdx = header.indexOf("type");
  const idIdx = header.indexOf("id");
  const dateIdx = header.indexOf("date");
  const nameIdx = header.indexOf("name");
  const pathIdx = header.indexOf("folder_path");
  const tagsIdx = header.indexOf("tags");
  const textIdx = header.indexOf("text");
  const positionIdx = header.indexOf("position");
  const toPositionIdx = header.indexOf("to_position");
  const giOnlyIdx = header.indexOf("gi_only");

  let foldersAcc = existingFolders;
  let jitsFoldersAcc = existingJitsFolders;
  const sessions = [];
  const routines = [];
  const journals = [];
  const rolls = [];
  const techniques = [];

  rows.slice(1).forEach((r) => {
    const type = typeIdx >= 0 ? (r[typeIdx] || "").trim().toLowerCase() : "session";
    const tags = normalizeTags(tagsIdx >= 0 ? r[tagsIdx] : "");
    const text = textIdx >= 0 ? r[textIdx] : "";
    const title = nameIdx >= 0 ? r[nameIdx] || "" : "";
    const id = idIdx >= 0 && r[idIdx] ? r[idIdx] : uid();
    if (type === "routine") {
      const { id: folderId, folders: nextFolders } = resolveFolderPath(foldersAcc, pathIdx >= 0 ? r[pathIdx] : "");
      foldersAcc = nextFolders;
      routines.push({ id, name: nameIdx >= 0 && r[nameIdx] ? r[nameIdx] : "Untitled routine", folderId, tags, text });
    } else if (type === "technique") {
      const { id: folderId, folders: nextFolders } = resolveFolderPath(jitsFoldersAcc, pathIdx >= 0 ? r[pathIdx] : "");
      jitsFoldersAcc = nextFolders;
      techniques.push({
        id,
        name: nameIdx >= 0 && r[nameIdx] ? r[nameIdx] : "Untitled technique",
        folderId,
        tags,
        text,
        position: positionIdx >= 0 ? r[positionIdx] || "" : "",
        toPosition: toPositionIdx >= 0 ? r[toPositionIdx] || "" : "",
        giOnly: giOnlyIdx >= 0 && !!r[giOnlyIdx],
      });
    } else if (type === "journal") {
      journals.push({ id, date: dateIdx >= 0 && r[dateIdx] ? r[dateIdx] : todayISO(), title, tags, text });
    } else if (type === "roll") {
      rolls.push({ id, date: dateIdx >= 0 && r[dateIdx] ? r[dateIdx] : todayISO(), title, tags, text });
    } else {
      sessions.push({ id, date: dateIdx >= 0 && r[dateIdx] ? r[dateIdx] : todayISO(), title, tags, text });
    }
  });

  return { sessions, routines, journals, folders: foldersAcc, rolls, techniques, jitsFolders: jitsFoldersAcc };
}

/* ============================== JSON NORMALIZATION ============================== */

// Sessions/journals/rolls all share the same shape (id/date/tags/text, no
// folder), so one helper normalizes any of them out of an imported JSON payload.
function normalizeSimpleEntries(arr) {
  return Array.isArray(arr)
    ? arr.map((s) => ({
        id: s.id || uid(),
        date: s.date || todayISO(),
        title: s.title || "",
        tags: normalizeTags(s.tags),
        text: s.text || "",
      }))
    : [];
}

// Routines/techniques share the same shape (id/name/folderId/tags/text), so
// one helper normalizes either out of an imported JSON payload. Techniques
// additionally carry an optional position -> toPosition pair for the Flow tab
// and a giOnly flag for the Gi/No-Gi mode filter.
function normalizeFolderItems(arr, defaultName, { techniqueExtras = false } = {}) {
  return Array.isArray(arr)
    ? arr.map((r) => ({
        id: r.id || uid(),
        name: r.name || defaultName,
        folderId: r.folderId || null,
        tags: normalizeTags(r.tags),
        text: r.text || "",
        ...(techniqueExtras ? { position: r.position || "", toPosition: r.toPosition || "", giOnly: !!r.giOnly } : {}),
      }))
    : [];
}

function mergeFolders(existingFolders, incomingFolders) {
  if (!Array.isArray(incomingFolders)) return existingFolders;
  const byId = new Map(existingFolders.map((f) => [f.id, f]));
  incomingFolders.forEach((f) => byId.set(f.id, f));
  return Array.from(byId.values());
}

/* ============================== IMPORT ENTRY POINT ============================== */

// Parses an imported .json or .csv file's text into normalized
// { sessions, journals, routines, folders, rolls, techniques, jitsFolders },
// merging any folders discovered in the file into `existingFolders`/
// `existingJitsFolders`. Throws if a JSON file has none of the known record types.
export function parseImportFile(filename, text, existingFolders, existingJitsFolders = []) {
  if (filename.toLowerCase().endsWith(".json")) {
    const parsed = JSON.parse(text);
    const hasKnownData = ["sessions", "routines", "journals", "rolls", "techniques"].some((k) => Array.isArray(parsed[k]));
    if (!hasKnownData) {
      throw new Error("No sessions, journals, routines, rolls, or techniques found in JSON");
    }
    return {
      sessions: normalizeSimpleEntries(parsed.sessions),
      journals: normalizeSimpleEntries(parsed.journals),
      routines: normalizeFolderItems(parsed.routines, "Untitled routine"),
      folders: mergeFolders(existingFolders, parsed.folders),
      rolls: normalizeSimpleEntries(parsed.rolls),
      techniques: normalizeFolderItems(parsed.techniques, "Untitled technique", { techniqueExtras: true }),
      jitsFolders: mergeFolders(existingJitsFolders, parsed.jitsFolders),
    };
  }
  return combinedFromCSV(text, existingFolders, existingJitsFolders);
}
