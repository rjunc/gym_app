import { csvEscape, parseCSV } from "./csv.js";
import { folderPath, resolveFolderPath } from "./folders.js";
import { uid, todayISO } from "./id.js";

/* ============================== COMBINED CSV ============================== */
// Unified CSV: one file, one 'type' column distinguishing session/journal/routine rows.

export function combinedToCSV(sessions, routines, journals, folders) {
  const header = ["type", "id", "date", "name", "folder_path", "tags", "text"];
  // Sessions/journals reuse the "name" column (otherwise unused for them) to
  // carry their optional title.
  const sessionRows = sessions.map((s) => ["session", s.id, s.date, s.title || "", "", (s.tags || []).join(";"), s.text || ""]);
  const journalRows = journals.map((j) => ["journal", j.id, j.date, j.title || "", "", (j.tags || []).join(";"), j.text || ""]);
  const routineRows = routines.map((r) => [
    "routine",
    r.id,
    "",
    r.name,
    folderPath(folders, r.folderId).map((f) => f.name).join("/"),
    (r.tags || []).join(";"),
    r.text || "",
  ]);
  return [header, ...sessionRows, ...journalRows, ...routineRows].map((row) => row.map(csvEscape).join(",")).join("\r\n");
}

export function combinedFromCSV(text, existingFolders) {
  const rows = parseCSV(text);
  if (rows.length === 0) return { sessions: [], routines: [], journals: [], folders: existingFolders };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const typeIdx = header.indexOf("type");
  const idIdx = header.indexOf("id");
  const dateIdx = header.indexOf("date");
  const nameIdx = header.indexOf("name");
  const pathIdx = header.indexOf("folder_path");
  const tagsIdx = header.indexOf("tags");
  const textIdx = header.indexOf("text");

  let foldersAcc = existingFolders;
  const sessions = [];
  const routines = [];
  const journals = [];

  rows.slice(1).forEach((r) => {
    const type = typeIdx >= 0 ? (r[typeIdx] || "").trim().toLowerCase() : "session";
    const tags = tagsIdx >= 0 && r[tagsIdx] ? r[tagsIdx].split(";").map((t) => t.trim()).filter(Boolean) : [];
    const text = textIdx >= 0 ? r[textIdx] : "";
    const title = nameIdx >= 0 ? r[nameIdx] || "" : "";
    const id = idIdx >= 0 && r[idIdx] ? r[idIdx] : uid();
    if (type === "routine") {
      const { id: folderId, folders: nextFolders } = resolveFolderPath(foldersAcc, pathIdx >= 0 ? r[pathIdx] : "");
      foldersAcc = nextFolders;
      routines.push({ id, name: nameIdx >= 0 && r[nameIdx] ? r[nameIdx] : "Untitled routine", folderId, tags, text });
    } else if (type === "journal") {
      journals.push({ id, date: dateIdx >= 0 && r[dateIdx] ? r[dateIdx] : todayISO(), title, tags, text });
    } else {
      sessions.push({ id, date: dateIdx >= 0 && r[dateIdx] ? r[dateIdx] : todayISO(), title, tags, text });
    }
  });

  return { sessions, routines, journals, folders: foldersAcc };
}

/* ============================== JSON NORMALIZATION ============================== */

// Sessions and journals share the same shape (id/date/tags/text, no folder),
// so one helper normalizes either out of an imported JSON payload.
function normalizeSimpleEntries(arr) {
  return Array.isArray(arr)
    ? arr.map((s) => ({
        id: s.id || uid(),
        date: s.date || todayISO(),
        title: s.title || "",
        tags: Array.isArray(s.tags) ? s.tags : typeof s.tags === "string" ? s.tags.split(";").filter(Boolean) : [],
        text: s.text || "",
      }))
    : [];
}

function normalizeRoutines(arr) {
  return Array.isArray(arr)
    ? arr.map((r) => ({
        id: r.id || uid(),
        name: r.name || "Untitled routine",
        folderId: r.folderId || null,
        tags: Array.isArray(r.tags) ? r.tags : typeof r.tags === "string" ? r.tags.split(";").filter(Boolean) : [],
        text: r.text || "",
      }))
    : [];
}

/* ============================== IMPORT ENTRY POINT ============================== */

// Parses an imported .json or .csv file's text into normalized
// { sessions, journals, routines, folders }, merging any folders discovered
// in the file into `existingFolders`. Throws if a JSON file has none of the
// three record types.
export function parseImportFile(filename, text, existingFolders) {
  if (filename.toLowerCase().endsWith(".json")) {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed.sessions) && !Array.isArray(parsed.routines) && !Array.isArray(parsed.journals)) {
      throw new Error("No sessions, journals, or routines found in JSON");
    }
    let mergedFolders = existingFolders;
    if (Array.isArray(parsed.folders)) {
      const byId = new Map(mergedFolders.map((f) => [f.id, f]));
      parsed.folders.forEach((f) => byId.set(f.id, f));
      mergedFolders = Array.from(byId.values());
    }
    return {
      sessions: normalizeSimpleEntries(parsed.sessions),
      journals: normalizeSimpleEntries(parsed.journals),
      routines: normalizeRoutines(parsed.routines),
      folders: mergedFolders,
    };
  }
  return combinedFromCSV(text, existingFolders);
}
