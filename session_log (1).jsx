import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  X,
  Download,
  Upload,
  Trash2,
  Pencil,
  Plus,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Folder,
  FolderPlus,
  Home,
  BookOpen,
  ClipboardList,
} from "lucide-react";

const STORAGE_KEY = "session-log-data";

const uid = () => Math.random().toString(36).slice(2, 10);

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

const formatDate = (iso) => {
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return iso;
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
};

// ---------- CSV helpers (RFC4180-ish, handles quotes/commas/newlines) ----------

function csvEscape(field) {
  const s = String(field ?? "");
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += c;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------- folder path helpers ----------

function folderPath(folders, folderId) {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const parts = [];
  let cur = folderId ? byId.get(folderId) : null;
  while (cur) {
    parts.unshift(cur);
    cur = cur.parentId ? byId.get(cur.parentId) : null;
  }
  return parts;
}

// pure: resolve/create a "A/B/C" folder path against a folders array, returns { id, folders }
function resolveFolderPath(folders, pathStr) {
  if (!pathStr || !pathStr.trim()) return { id: null, folders };
  const names = pathStr.split("/").map((n) => n.trim()).filter(Boolean);
  let parentId = null;
  let list = folders;
  names.forEach((name) => {
    const existing = list.find((f) => f.name === name && (f.parentId || null) === parentId);
    if (existing) {
      parentId = existing.id;
    } else {
      const created = { id: uid(), name, parentId };
      list = [...list, created];
      parentId = created.id;
    }
  });
  return { id: parentId, folders: list };
}

/* ============================== COMBINED IMPORT / EXPORT ============================== */

// Unified CSV: one file, one 'type' column distinguishing session rows from routine rows.
function combinedToCSV(sessions, routines, folders) {
  const header = ["type", "id", "date", "name", "folder_path", "tags", "text"];
  const sessionRows = sessions.map((s) => ["session", s.id, s.date, "", "", (s.tags || []).join(";"), s.text || ""]);
  const routineRows = routines.map((r) => [
    "routine",
    r.id,
    "",
    r.name,
    folderPath(folders, r.folderId).map((f) => f.name).join("/"),
    (r.tags || []).join(";"),
    r.text || "",
  ]);
  return [header, ...sessionRows, ...routineRows].map((row) => row.map(csvEscape).join(",")).join("\r\n");
}

function combinedFromCSV(text, existingFolders) {
  const rows = parseCSV(text);
  if (rows.length === 0) return { sessions: [], routines: [], folders: existingFolders };
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

  rows.slice(1).forEach((r) => {
    const type = typeIdx >= 0 ? (r[typeIdx] || "").trim().toLowerCase() : "session";
    const tags = tagsIdx >= 0 && r[tagsIdx] ? r[tagsIdx].split(";").map((t) => t.trim()).filter(Boolean) : [];
    const text = textIdx >= 0 ? r[textIdx] : "";
    const id = idIdx >= 0 && r[idIdx] ? r[idIdx] : uid();
    if (type === "routine") {
      const { id: folderId, folders: nextFolders } = resolveFolderPath(foldersAcc, pathIdx >= 0 ? r[pathIdx] : "");
      foldersAcc = nextFolders;
      routines.push({ id, name: nameIdx >= 0 && r[nameIdx] ? r[nameIdx] : "Untitled routine", folderId, tags, text });
    } else {
      sessions.push({ id, date: dateIdx >= 0 && r[dateIdx] ? r[dateIdx] : todayISO(), tags, text });
    }
  });

  return { sessions, routines, folders: foldersAcc };
}

export default function App() {
  const [tab, setTab] = useState("sessions");
  const [sessions, setSessions] = useState([]);
  const [folders, setFolders] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [importError, setImportError] = useState("");
  const saveTimer = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY, false);
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          if (Array.isArray(parsed.sessions)) setSessions(parsed.sessions);
          if (Array.isArray(parsed.folders)) setFolders(parsed.folders);
          if (Array.isArray(parsed.routines)) setRoutines(parsed.routines);
        }
      } catch (e) {
        // nothing saved yet
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await window.storage.set(STORAGE_KEY, JSON.stringify({ sessions, folders, routines }), false);
      } catch (e) {
        console.error("save failed", e);
      }
    }, 250);
    return () => clearTimeout(saveTimer.current);
  }, [sessions, folders, routines, loaded]);

  const exportJSON = () =>
    downloadFile(
      `workout-data-${todayISO()}.json`,
      JSON.stringify({ exportedAt: new Date().toISOString(), sessions, folders, routines }, null, 2),
      "application/json"
    );

  const exportCSV = () => downloadFile(`workout-data-${todayISO()}.csv`, combinedToCSV(sessions, routines, folders), "text/csv");

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportError("");
    try {
      const text = await file.text();
      let incomingSessions = [];
      let incomingRoutines = [];
      let mergedFolders = folders;

      if (file.name.toLowerCase().endsWith(".json")) {
        const parsed = JSON.parse(text);
        incomingSessions = Array.isArray(parsed.sessions)
          ? parsed.sessions.map((s) => ({
              id: s.id || uid(),
              date: s.date || todayISO(),
              tags: Array.isArray(s.tags) ? s.tags : typeof s.tags === "string" ? s.tags.split(";").filter(Boolean) : [],
              text: s.text || "",
            }))
          : [];
        if (Array.isArray(parsed.folders)) {
          const byId = new Map(mergedFolders.map((f) => [f.id, f]));
          parsed.folders.forEach((f) => byId.set(f.id, f));
          mergedFolders = Array.from(byId.values());
        }
        incomingRoutines = Array.isArray(parsed.routines)
          ? parsed.routines.map((r) => ({
              id: r.id || uid(),
              name: r.name || "Untitled routine",
              folderId: r.folderId || null,
              tags: Array.isArray(r.tags) ? r.tags : typeof r.tags === "string" ? r.tags.split(";").filter(Boolean) : [],
              text: r.text || "",
            }))
          : [];
        if (!Array.isArray(parsed.sessions) && !Array.isArray(parsed.routines)) {
          throw new Error("No sessions or routines found in JSON");
        }
      } else {
        const result = combinedFromCSV(text, mergedFolders);
        incomingSessions = result.sessions;
        incomingRoutines = result.routines;
        mergedFolders = result.folders;
      }

      setFolders(mergedFolders);
      setSessions((prev) => {
        const byId = new Map(prev.map((s) => [s.id, s]));
        incomingSessions.forEach((s) => byId.set(s.id, s));
        return Array.from(byId.values());
      });
      setRoutines((prev) => {
        const byId = new Map(prev.map((r) => [r.id, r]));
        incomingRoutines.forEach((r) => byId.set(r.id, r));
        return Array.from(byId.values());
      });
    } catch (err) {
      setImportError("Couldn't read that file. Make sure it's a CSV or JSON export from this app.");
    }
    e.target.value = "";
  };

  if (!loaded) {
    return (
      <Shell>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-dim)" }}>
          Loading your log…
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <TabSwitcher tab={tab} setTab={setTab} />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {tab === "sessions" ? (
            <SessionsTab sessions={sessions} setSessions={setSessions} />
          ) : (
            <RoutinesTab folders={folders} setFolders={setFolders} routines={routines} setRoutines={setRoutines} />
          )}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", padding: "12px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
          {importError && <div style={{ color: "var(--danger)", fontSize: 12 }}>{importError}</div>}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 0.5, marginRight: 2 }}>
              Sessions + routines
            </span>
            <button onClick={exportCSV} style={{ ...secondaryBtnStyle, marginLeft: "auto" }}>
              <Download size={14} /> CSV
            </button>
            <button onClick={exportJSON} style={secondaryBtnStyle}>
              <Download size={14} /> JSON
            </button>
            <button onClick={() => fileInputRef.current?.click()} style={secondaryBtnStyle}>
              <Upload size={14} /> Import
            </button>
            <input ref={fileInputRef} type="file" accept=".csv,.json,application/json,text/csv" style={{ display: "none" }} onChange={handleFile} />
          </div>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div
      style={{
        "--bg": "#15160F",
        "--surface": "#1E1F17",
        "--surface-2": "#262819",
        "--border": "#3A3C2E",
        "--text": "#EDEBDD",
        "--text-dim": "#9B9C8D",
        "--accent": "#C9A227",
        "--accent-dim": "rgba(201,162,39,0.16)",
        "--accent2": "#6FA88F",
        "--accent2-dim": "rgba(111,168,143,0.16)",
        "--danger": "#C2604A",
        background: "var(--bg)",
        color: "var(--text)",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        maxWidth: 480,
        margin: "0 auto",
        height: "100vh",
        maxHeight: 800,
        borderRadius: 18,
        overflow: "hidden",
        border: "1px solid var(--border)",
        position: "relative",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
        textarea, input, select { font-family: inherit; }
      `}</style>
      {children}
    </div>
  );
}

function TabSwitcher({ tab, setTab }) {
  const items = [
    { key: "sessions", label: "Sessions", Icon: ClipboardList },
    { key: "routines", label: "Routines", Icon: BookOpen },
  ];
  return (
    <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
      {items.map(({ key, label, Icon }) => {
        const active = tab === key;
        return (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
              padding: "13px 0 11px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              cursor: "pointer",
              color: active ? "var(--text)" : "var(--text-dim)",
              fontWeight: active ? 700 : 500,
              fontSize: 13,
            }}
          >
            <Icon size={15} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

function TagChip({ label, active, small, accent, onClick }) {
  const accentVar = accent || "--accent";
  const accentDimVar = `${accentVar}-dim`;
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? `var(${accentDimVar})` : "transparent",
        border: `1px solid ${active ? `var(${accentVar})` : "var(--border)"}`,
        color: active ? `var(${accentVar})` : "var(--text-dim)",
        borderRadius: 999,
        padding: small ? "2px 9px" : "4px 11px",
        fontSize: small ? 11 : 12,
        fontWeight: 600,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function IconBtn({ children, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: 7,
        padding: 6,
        color: danger ? "var(--danger)" : "var(--text-dim)",
        cursor: "pointer",
        display: "flex",
      }}
    >
      {children}
    </button>
  );
}

/* ============================== SESSIONS TAB ============================== */

function SessionsTab({ sessions, setSessions }) {
  const [search, setSearch] = useState("");
  const [activeTags, setActiveTags] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showComposer, setShowComposer] = useState(false);
  const [form, setForm] = useState({ date: todayISO(), tags: [], text: "" });
  const [tagDraft, setTagDraft] = useState("");

  const allTags = useMemo(() => {
    const set = new Set();
    sessions.forEach((s) => (s.tags || []).forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [sessions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sessions
      .filter((s) => {
        const matchesSearch =
          q === "" || (s.text || "").toLowerCase().includes(q) || (s.tags || []).some((t) => t.toLowerCase().includes(q));
        const matchesTags = activeTags.length === 0 || activeTags.every((t) => (s.tags || []).includes(t));
        return matchesSearch && matchesTags;
      })
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [sessions, search, activeTags]);

  const resetForm = () => {
    setForm({ date: todayISO(), tags: [], text: "" });
    setTagDraft("");
    setEditingId(null);
  };

  const openNewComposer = () => {
    resetForm();
    setShowComposer(true);
  };

  const openEdit = (session) => {
    setForm({ date: session.date, tags: [...(session.tags || [])], text: session.text || "" });
    setEditingId(session.id);
    setShowComposer(true);
    setTagDraft("");
  };

  const addTagFromDraft = () => {
    const t = tagDraft.trim().toLowerCase();
    if (t && !form.tags.includes(t)) setForm((f) => ({ ...f, tags: [...f.tags, t] }));
    setTagDraft("");
  };

  const removeFormTag = (t) => setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }));

  const saveEntry = () => {
    if (!form.text.trim()) return;
    if (editingId) {
      setSessions((prev) => prev.map((s) => (s.id === editingId ? { ...s, ...form } : s)));
    } else {
      setSessions((prev) => [{ id: uid(), ...form }, ...prev]);
    }
    setShowComposer(false);
    resetForm();
  };

  const deleteEntry = (id) => setSessions((prev) => prev.filter((s) => s.id !== id));

  const toggleTagFilter = (t) => setActiveTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  return (
    <>
      <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 0.3 }}>Training journal</div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 0.2 }}>Session Log</div>
          </div>
          <button onClick={openNewComposer} style={primaryBtnStyle}>
            <Plus size={15} /> New entry
          </button>
        </div>

        <div style={{ position: "relative", marginBottom: 10 }}>
          <Search size={15} style={{ position: "absolute", left: 10, top: 10, color: "var(--text-dim)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search entries or tags…"
            style={{ ...inputStyle, padding: "9px 10px 9px 32px" }}
          />
        </div>

        {allTags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {allTags.map((t) => (
              <TagChip key={t} label={t} active={activeTags.includes(t)} onClick={() => toggleTagFilter(t)} />
            ))}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 18px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-dim)", padding: "36px 10px", fontSize: 13 }}>
            {sessions.length === 0 ? 'No sessions logged yet. Tap "New entry" to write your first one.' : "Nothing matches that search or tag filter."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((s) => {
              const isOpen = expanded === s.id;
              const isLong = (s.text || "").length > 220;
              return (
                <div key={s.id} style={cardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{formatDate(s.date)}</div>
                      {s.tags && s.tags.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {s.tags.map((t) => (
                            <TagChip key={t} label={t} small onClick={() => toggleTagFilter(t)} active={activeTags.includes(t)} />
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <IconBtn onClick={() => openEdit(s)}>
                        <Pencil size={14} />
                      </IconBtn>
                      <IconBtn onClick={() => deleteEntry(s.id)} danger>
                        <Trash2 size={14} />
                      </IconBtn>
                    </div>
                  </div>

                  <p
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 13,
                      lineHeight: 1.55,
                      color: "var(--text)",
                      marginTop: 8,
                      marginBottom: 0,
                      whiteSpace: "pre-wrap",
                      display: "-webkit-box",
                      WebkitLineClamp: isOpen || !isLong ? "unset" : 5,
                      WebkitBoxOrient: "vertical",
                      overflow: isOpen || !isLong ? "visible" : "hidden",
                    }}
                  >
                    {s.text}
                  </p>

                  {isLong && (
                    <button onClick={() => setExpanded(isOpen ? null : s.id)} style={{ ...ghostLinkStyle, marginTop: 6 }}>
                      {isOpen ? (
                        <>
                          Show less <ChevronUp size={13} />
                        </>
                      ) : (
                        <>
                          Show more <ChevronDown size={13} />
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showComposer && (
        <EntryComposer
          title={editingId ? "Edit entry" : "New entry"}
          form={form}
          setForm={setForm}
          tagDraft={tagDraft}
          setTagDraft={setTagDraft}
          onAddTag={addTagFromDraft}
          onRemoveTag={removeFormTag}
          onSave={saveEntry}
          onClose={() => {
            setShowComposer(false);
            resetForm();
          }}
          showDate
          textLabel="What did you do?"
          textPlaceholder="Warmed up with 10 min bike, then did 5x5 back squat working up to 225, superset with..."
          saveLabel={editingId ? "Save changes" : "Save entry"}
        />
      )}
    </>
  );
}

/* ============================== ROUTINES TAB ============================== */

function RoutinesTab({ folders, setFolders, routines, setRoutines }) {
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [search, setSearch] = useState("");
  const [activeTags, setActiveTags] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showComposer, setShowComposer] = useState(false);
  const [form, setForm] = useState({ name: "", tags: [], text: "", folderId: null });
  const [tagDraft, setTagDraft] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [addingFolder, setAddingFolder] = useState(false);
  const [folderError, setFolderError] = useState("");
  const [renamingFolderId, setRenamingFolderId] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");

  const isFiltering = search.trim() !== "" || activeTags.length > 0;

  const allTags = useMemo(() => {
    const set = new Set();
    routines.forEach((r) => (r.tags || []).forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [routines]);

  const subfolders = useMemo(
    () => folders.filter((f) => (f.parentId || null) === currentFolderId).sort((a, b) => a.name.localeCompare(b.name)),
    [folders, currentFolderId]
  );

  const routinesInFolder = useMemo(
    () => routines.filter((r) => (r.folderId || null) === currentFolderId).sort((a, b) => a.name.localeCompare(b.name)),
    [routines, currentFolderId]
  );

  const filteredRoutines = useMemo(() => {
    const q = search.trim().toLowerCase();
    return routines
      .filter((r) => {
        const matchesSearch =
          q === "" ||
          r.name.toLowerCase().includes(q) ||
          (r.text || "").toLowerCase().includes(q) ||
          (r.tags || []).some((t) => t.toLowerCase().includes(q));
        const matchesTags = activeTags.length === 0 || activeTags.every((t) => (r.tags || []).includes(t));
        return matchesSearch && matchesTags;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [routines, search, activeTags]);

  const breadcrumb = folderPath(folders, currentFolderId);

  const folderCounts = (folderId) => {
    const subCount = folders.filter((f) => (f.parentId || null) === folderId).length;
    const routineCount = routines.filter((r) => (r.folderId || null) === folderId).length;
    return { subCount, routineCount };
  };

  const toggleTagFilter = (t) => setActiveTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const createFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    setFolders((prev) => [...prev, { id: uid(), name, parentId: currentFolderId }]);
    setNewFolderName("");
    setAddingFolder(false);
  };

  const startRename = (folder) => {
    setRenamingFolderId(folder.id);
    setRenameDraft(folder.name);
  };

  const commitRename = () => {
    const name = renameDraft.trim();
    if (name) {
      setFolders((prev) => prev.map((f) => (f.id === renamingFolderId ? { ...f, name } : f)));
    }
    setRenamingFolderId(null);
  };

  const deleteFolder = (folder) => {
    const { subCount, routineCount } = folderCounts(folder.id);
    if (subCount > 0 || routineCount > 0) {
      setFolderError(`"${folder.name}" isn't empty. Move or delete what's inside it first.`);
      setTimeout(() => setFolderError(""), 3500);
      return;
    }
    setFolders((prev) => prev.filter((f) => f.id !== folder.id));
  };

  const resetForm = () => {
    setForm({ name: "", tags: [], text: "", folderId: currentFolderId });
    setTagDraft("");
    setEditingId(null);
  };

  const openNewComposer = () => {
    resetForm();
    setShowComposer(true);
  };

  const openEdit = (routine) => {
    setForm({ name: routine.name, tags: [...(routine.tags || [])], text: routine.text || "", folderId: routine.folderId || null });
    setEditingId(routine.id);
    setShowComposer(true);
    setTagDraft("");
  };

  const addTagFromDraft = () => {
    const t = tagDraft.trim().toLowerCase();
    if (t && !form.tags.includes(t)) setForm((f) => ({ ...f, tags: [...f.tags, t] }));
    setTagDraft("");
  };

  const removeFormTag = (t) => setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }));

  const saveRoutine = () => {
    if (!form.name.trim()) return;
    if (editingId) {
      setRoutines((prev) => prev.map((r) => (r.id === editingId ? { ...r, ...form, name: form.name.trim() } : r)));
    } else {
      setRoutines((prev) => [{ id: uid(), ...form, name: form.name.trim() }, ...prev]);
    }
    setShowComposer(false);
    resetForm();
  };

  const deleteRoutine = (id) => setRoutines((prev) => prev.filter((r) => r.id !== id));

  const folderOptions = useMemo(() => {
    const opts = [{ id: null, label: "No folder (top level)" }];
    folders
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((f) => {
        const path = folderPath(folders, f.id).map((p) => p.name).join(" / ");
        opts.push({ id: f.id, label: path });
      });
    return opts;
  }, [folders]);

  return (
    <>
      <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 0.3 }}>Library</div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 0.2 }}>Routines</div>
          </div>
          <button onClick={openNewComposer} style={{ ...primaryBtnStyle, background: "var(--accent2)" }}>
            <Plus size={15} /> New routine
          </button>
        </div>

        <div style={{ position: "relative", marginBottom: 10 }}>
          <Search size={15} style={{ position: "absolute", left: 10, top: 10, color: "var(--text-dim)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search routines or tags…"
            style={{ ...inputStyle, padding: "9px 10px 9px 32px" }}
          />
        </div>

        {allTags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {allTags.map((t) => (
              <TagChip key={t} label={t} accent="--accent2" active={activeTags.includes(t)} onClick={() => toggleTagFilter(t)} />
            ))}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 18px" }}>
        {folderError && <div style={{ color: "var(--danger)", fontSize: 12, marginBottom: 10 }}>{folderError}</div>}

        {isFiltering ? (
          <>
            <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 10 }}>
              {filteredRoutines.length} result{filteredRoutines.length !== 1 ? "s" : ""}
            </div>
            {filteredRoutines.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--text-dim)", padding: "36px 10px", fontSize: 13 }}>
                Nothing matches that search or tag filter.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filteredRoutines.map((r) => (
                  <RoutineCard
                    key={r.id}
                    routine={r}
                    pathLabel={folderPath(folders, r.folderId).map((f) => f.name).join(" / ") || "Top level"}
                    isOpen={expanded === r.id}
                    onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
                    onEdit={() => openEdit(r)}
                    onDelete={() => deleteRoutine(r.id)}
                    onJump={() => {
                      setCurrentFolderId(r.folderId || null);
                      setSearch("");
                      setActiveTags([]);
                    }}
                    onTagClick={toggleTagFilter}
                    activeTags={activeTags}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <Breadcrumb path={breadcrumb} onNavigate={setCurrentFolderId} />

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {subfolders.map((f) => {
                const { subCount, routineCount } = folderCounts(f.id);
                const isRenaming = renamingFolderId === f.id;
                return (
                  <div key={f.id} style={{ ...cardStyle, padding: 10, display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      onClick={() => !isRenaming && setCurrentFolderId(f.id)}
                      style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, cursor: "pointer" }}
                    >
                      <div style={{ background: "var(--accent2-dim)", borderRadius: 8, padding: 7, display: "flex" }}>
                        <Folder size={16} color="var(--accent2)" />
                      </div>
                      {isRenaming ? (
                        <input
                          autoFocus
                          value={renameDraft}
                          onChange={(e) => setRenameDraft(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && commitRename()}
                          onBlur={commitRename}
                          onClick={(e) => e.stopPropagation()}
                          style={{ ...inputStyle, padding: "4px 8px", fontSize: 13 }}
                        />
                      ) : (
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{f.name}</div>
                          <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
                            {subCount > 0 ? `${subCount} folder${subCount !== 1 ? "s" : ""} · ` : ""}
                            {routineCount} routine{routineCount !== 1 ? "s" : ""}
                          </div>
                        </div>
                      )}
                    </div>
                    {!isRenaming && (
                      <div style={{ display: "flex", gap: 4 }}>
                        <IconBtn onClick={() => startRename(f)}>
                          <Pencil size={13} />
                        </IconBtn>
                        <IconBtn onClick={() => deleteFolder(f)} danger>
                          <Trash2 size={13} />
                        </IconBtn>
                      </div>
                    )}
                    <ChevronRight size={15} color="var(--text-dim)" onClick={() => !isRenaming && setCurrentFolderId(f.id)} style={{ cursor: "pointer" }} />
                  </div>
                );
              })}

              {addingFolder ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    autoFocus
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && createFolder()}
                    placeholder="Folder name"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button onClick={createFolder} style={secondaryBtnStyle}>
                    Add
                  </button>
                  <IconBtn onClick={() => setAddingFolder(false)}>
                    <X size={14} />
                  </IconBtn>
                </div>
              ) : (
                <button onClick={() => setAddingFolder(true)} style={{ ...ghostLinkStyle, marginTop: 2 }}>
                  <FolderPlus size={14} /> New folder here
                </button>
              )}
            </div>

            {routinesInFolder.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--text-dim)", padding: "24px 10px", fontSize: 13 }}>
                {routines.length === 0 && folders.length === 0
                  ? 'No routines yet. Tap "New routine" or add a folder to start organizing your library.'
                  : "No routines directly in this folder."}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {routinesInFolder.map((r) => (
                  <RoutineCard
                    key={r.id}
                    routine={r}
                    isOpen={expanded === r.id}
                    onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
                    onEdit={() => openEdit(r)}
                    onDelete={() => deleteRoutine(r.id)}
                    onTagClick={toggleTagFilter}
                    activeTags={activeTags}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showComposer && (
        <EntryComposer
          title={editingId ? "Edit routine" : "New routine"}
          form={form}
          setForm={setForm}
          tagDraft={tagDraft}
          setTagDraft={setTagDraft}
          onAddTag={addTagFromDraft}
          onRemoveTag={removeFormTag}
          onSave={saveRoutine}
          onClose={() => {
            setShowComposer(false);
            resetForm();
          }}
          showName
          showFolder
          folderOptions={folderOptions}
          textLabel="Routine details"
          textPlaceholder="Warm-up, then A1) Back squat 5x5, A2) Romanian deadlift 4x8, B1) Walking lunges..., finish with core circuit..."
          saveLabel={editingId ? "Save changes" : "Save routine"}
          accent="--accent2"
        />
      )}
    </>
  );
}

function RoutineCard({ routine, pathLabel, isOpen, onToggle, onEdit, onDelete, onJump, onTagClick, activeTags }) {
  const isLong = (routine.text || "").length > 220;
  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{routine.name}</div>
          {pathLabel && (
            <button onClick={onJump} style={{ ...ghostLinkStyle, fontSize: 11 }}>
              <Folder size={11} /> {pathLabel}
            </button>
          )}
          {routine.tags && routine.tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {routine.tags.map((t) => (
                <TagChip key={t} label={t} small accent="--accent2" onClick={() => onTagClick(t)} active={activeTags.includes(t)} />
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <IconBtn onClick={onEdit}>
            <Pencil size={14} />
          </IconBtn>
          <IconBtn onClick={onDelete} danger>
            <Trash2 size={14} />
          </IconBtn>
        </div>
      </div>

      {routine.text && (
        <p
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 13,
            lineHeight: 1.55,
            color: "var(--text)",
            marginTop: 8,
            marginBottom: 0,
            whiteSpace: "pre-wrap",
            display: "-webkit-box",
            WebkitLineClamp: isOpen || !isLong ? "unset" : 5,
            WebkitBoxOrient: "vertical",
            overflow: isOpen || !isLong ? "visible" : "hidden",
          }}
        >
          {routine.text}
        </p>
      )}

      {isLong && (
        <button onClick={onToggle} style={{ ...ghostLinkStyle, marginTop: 6 }}>
          {isOpen ? (
            <>
              Show less <ChevronUp size={13} />
            </>
          ) : (
            <>
              Show more <ChevronDown size={13} />
            </>
          )}
        </button>
      )}
    </div>
  );
}

function Breadcrumb({ path, onNavigate }) {
  return (
    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4, marginBottom: 12, fontSize: 12 }}>
      <button
        onClick={() => onNavigate(null)}
        style={{ ...ghostLinkStyle, color: path.length === 0 ? "var(--text)" : "var(--text-dim)", fontWeight: path.length === 0 ? 700 : 600 }}
      >
        <Home size={12} /> Home
      </button>
      {path.map((f, i) => (
        <React.Fragment key={f.id}>
          <ChevronRight size={12} color="var(--text-dim)" />
          <button
            onClick={() => onNavigate(f.id)}
            style={{
              ...ghostLinkStyle,
              color: i === path.length - 1 ? "var(--text)" : "var(--text-dim)",
              fontWeight: i === path.length - 1 ? 700 : 600,
            }}
          >
            {f.name}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}

/* ============================== SHARED COMPOSER ============================== */

function EntryComposer({
  title,
  form,
  setForm,
  tagDraft,
  setTagDraft,
  onAddTag,
  onRemoveTag,
  onSave,
  onClose,
  showDate,
  showName,
  showFolder,
  folderOptions,
  textLabel,
  textPlaceholder,
  saveLabel,
  accent,
}) {
  const accentVar = accent || "--accent";
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", zIndex: 10 }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          borderTop: "1px solid var(--border)",
          borderRadius: "16px 16px 0 0",
          width: "100%",
          maxHeight: "88%",
          display: "flex",
          flexDirection: "column",
          padding: 18,
          gap: 12,
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        {showName && (
          <div>
            <label style={labelStyle}>Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Push day A, 20-min plyo circuit…"
              style={inputStyle}
            />
          </div>
        )}

        {showDate && (
          <div>
            <label style={labelStyle}>Date</label>
            <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} style={inputStyle} />
          </div>
        )}

        {showFolder && (
          <div>
            <label style={labelStyle}>Folder</label>
            <select
              value={form.folderId || ""}
              onChange={(e) => setForm((f) => ({ ...f, folderId: e.target.value || null }))}
              style={{ ...inputStyle, appearance: "auto" }}
            >
              {folderOptions.map((o) => (
                <option key={o.id || "root"} value={o.id || ""}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label style={labelStyle}>Tags</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: form.tags.length ? 8 : 0 }}>
            {form.tags.map((t) => (
              <span key={t} style={{ ...tagPillStyle, background: `var(${accentVar}-dim)`, borderColor: `var(${accentVar})`, color: `var(${accentVar})` }}>
                {t}
                <button onClick={() => onRemoveTag(t)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", display: "flex" }}>
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  onAddTag();
                }
              }}
              placeholder="push, plyometrics, legs…"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button onClick={onAddTag} style={secondaryBtnStyle}>
              Add
            </button>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <label style={labelStyle}>{textLabel}</label>
          <textarea
            value={form.text}
            onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
            placeholder={textPlaceholder}
            style={{ ...inputStyle, fontFamily: "'IBM Plex Mono', monospace", minHeight: 150, resize: "vertical", lineHeight: 1.5 }}
          />
        </div>

        <button onClick={onSave} style={{ ...primaryBtnStyle, background: `var(${accentVar})`, justifyContent: "center", padding: "12px 0" }}>
          {saveLabel}
        </button>
      </div>
    </div>
  );
}

const labelStyle = { fontSize: 11, color: "var(--text-dim)", marginBottom: 6, display: "block", fontWeight: 600 };

const inputStyle = {
  width: "100%",
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "10px 12px",
  color: "var(--text)",
  fontSize: 13,
  outline: "none",
};

const cardStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 14,
};

const primaryBtnStyle = {
  background: "var(--accent)",
  color: "#15160F",
  border: "none",
  borderRadius: 9,
  padding: "9px 14px",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 6,
};

const secondaryBtnStyle = {
  background: "var(--surface-2)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "8px 12px",
  fontWeight: 600,
  fontSize: 12,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 6,
};

const ghostLinkStyle = {
  background: "none",
  border: "none",
  color: "var(--accent)",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 3,
  padding: 0,
};

const tagPillStyle = {
  borderRadius: 999,
  padding: "3px 8px 3px 10px",
  fontSize: 11,
  fontWeight: 600,
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  border: "1px solid",
};
