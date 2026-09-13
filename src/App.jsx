import { useState, useEffect, useRef } from "react";
import { Download, Upload, LogOut, ClipboardList, NotebookPen, BookOpen } from "lucide-react";
import { todayISO } from "./lib/id.js";
import { downloadFile } from "./lib/download.js";
import { combinedToCSV, parseImportFile } from "./lib/importExport.js";
import { mergeById } from "./lib/arrays.js";
import { subscribeToLog, saveLog } from "./lib/firestoreLog.js";
import Shell from "./ui/Shell.jsx";
import ModeSwitcher from "./ui/ModeSwitcher.jsx";
import TabSwitcher from "./ui/TabSwitcher.jsx";
import { secondaryBtnStyle } from "./ui/styles.js";
import SessionsTab from "./tabs/SessionsTab.jsx";
import JournalsTab from "./tabs/JournalsTab.jsx";
import RoutinesTab from "./tabs/RoutinesTab.jsx";
import RollsTab from "./tabs/RollsTab.jsx";
import TechniquesTab from "./tabs/TechniquesTab.jsx";

const LIFTING_TABS = [
  { key: "sessions", label: "Sessions", Icon: ClipboardList },
  { key: "journals", label: "Journals", Icon: NotebookPen },
  { key: "routines", label: "Routines", Icon: BookOpen },
];

const JITS_TABS = [
  { key: "rolls", label: "Rolls", Icon: ClipboardList },
  { key: "techniques", label: "Techniques", Icon: BookOpen },
];

export default function App({ uid, userEmail, onLogout }) {
  const [mode, setMode] = useState("lifting");
  const [tab, setTab] = useState("sessions");
  const [sessions, setSessions] = useState([]);
  const [folders, setFolders] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [journals, setJournals] = useState([]);
  const [rolls, setRolls] = useState([]);
  const [techniques, setTechniques] = useState([]);
  const [jitsFolders, setJitsFolders] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [importError, setImportError] = useState("");
  const saveTimer = useRef(null);
  const fileInputRef = useRef(null);
  // Set right before a Firestore snapshot updates local state, so the save
  // effect below can tell "the server just told us this" apart from "the
  // user just changed something" and avoid writing an echo straight back.
  const skipNextSave = useRef(false);

  // Live-sync this user's log document. Firestore's persistent local cache
  // (configured in firebase.js) makes this resolve instantly from disk on
  // reload/offline, then reconcile with the server in the background.
  useEffect(() => {
    setLoaded(false);
    const unsubscribe = subscribeToLog(
      uid,
      (data) => {
        skipNextSave.current = true;
        setSessions(Array.isArray(data.sessions) ? data.sessions : []);
        setFolders(Array.isArray(data.folders) ? data.folders : []);
        setRoutines(Array.isArray(data.routines) ? data.routines : []);
        setJournals(Array.isArray(data.journals) ? data.journals : []);
        setRolls(Array.isArray(data.rolls) ? data.rolls : []);
        setTechniques(Array.isArray(data.techniques) ? data.techniques : []);
        setJitsFolders(Array.isArray(data.jitsFolders) ? data.jitsFolders : []);
        setSyncError("");
        setLoaded(true);
      },
      (err) => {
        console.error("sync failed", err);
        setSyncError("Couldn't sync with the server. Changes will retry automatically.");
        setLoaded(true);
      }
    );
    return unsubscribe;
  }, [uid]);

  useEffect(() => {
    if (!loaded) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveLog(uid, { sessions, folders, routines, journals, rolls, techniques, jitsFolders }).catch((e) => {
        console.error("save failed", e);
        setSyncError("Couldn't save your last change. Check your connection.");
      });
    }, 250);
    return () => clearTimeout(saveTimer.current);
  }, [sessions, folders, routines, journals, rolls, techniques, jitsFolders, loaded, uid]);

  const exportJSON = () =>
    downloadFile(
      `workout-data-${todayISO()}.json`,
      JSON.stringify({ exportedAt: new Date().toISOString(), sessions, folders, routines, journals, rolls, techniques, jitsFolders }, null, 2),
      "application/json"
    );

  const exportCSV = () =>
    downloadFile(
      `workout-data-${todayISO()}.csv`,
      combinedToCSV(sessions, routines, journals, folders, rolls, techniques, jitsFolders),
      "text/csv"
    );

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportError("");
    try {
      const text = await file.text();
      const incoming = parseImportFile(file.name, text, folders, jitsFolders);

      setFolders(incoming.folders);
      setSessions((prev) => mergeById(prev, incoming.sessions));
      setJournals((prev) => mergeById(prev, incoming.journals));
      setRoutines((prev) => mergeById(prev, incoming.routines));
      setJitsFolders(incoming.jitsFolders);
      setRolls((prev) => mergeById(prev, incoming.rolls));
      setTechniques((prev) => mergeById(prev, incoming.techniques));
    } catch (err) {
      setImportError("Couldn't read that file. Make sure it's a CSV or JSON export from this app.");
    }
    e.target.value = "";
  };

  if (!loaded) {
    return (
      <Shell>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-dim)" }}>
          Syncing your log…
        </div>
      </Shell>
    );
  }

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setTab(nextMode === "jits" ? "rolls" : "sessions");
  };

  return (
    <Shell>
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <ModeSwitcher mode={mode} setMode={changeMode} />
        {mode === "jits" ? (
          <TabSwitcher tab={tab} setTab={setTab} items={JITS_TABS} accent="--accent4" />
        ) : (
          <TabSwitcher tab={tab} setTab={setTab} items={LIFTING_TABS} />
        )}

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {mode === "jits" ? (
            tab === "rolls" ? (
              <RollsTab rolls={rolls} setRolls={setRolls} />
            ) : (
              <TechniquesTab folders={jitsFolders} setFolders={setJitsFolders} techniques={techniques} setTechniques={setTechniques} />
            )
          ) : tab === "sessions" ? (
            <SessionsTab sessions={sessions} setSessions={setSessions} />
          ) : tab === "journals" ? (
            <JournalsTab journals={journals} setJournals={setJournals} />
          ) : (
            <RoutinesTab folders={folders} setFolders={setFolders} routines={routines} setRoutines={setRoutines} />
          )}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", padding: "12px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
          {syncError && <div style={{ color: "var(--danger)", fontSize: 12 }}>{syncError}</div>}
          {importError && <div style={{ color: "var(--danger)", fontSize: 12 }}>{importError}</div>}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {userEmail}
            </span>
            <button onClick={onLogout} style={{ ...secondaryBtnStyle, marginLeft: "auto" }} title="Log out">
              <LogOut size={14} />
            </button>
            <button onClick={exportCSV} style={secondaryBtnStyle}>
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
