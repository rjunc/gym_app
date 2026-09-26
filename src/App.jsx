import { useState, useEffect, useRef } from "react";
import { Menu } from "lucide-react";
import { todayISO } from "./lib/id.js";
import { downloadFile } from "./lib/download.js";
import { combinedToCSV, parseImportFile } from "./lib/importExport.js";
import { mergeById } from "./lib/arrays.js";
import { subscribeToLog, saveLog } from "./lib/firestoreLog.js";
import Shell from "./ui/Shell.jsx";
import Sidebar from "./ui/Sidebar.jsx";
import HomeTab from "./tabs/HomeTab.jsx";
import SessionsTab from "./tabs/SessionsTab.jsx";
import JournalsTab from "./tabs/JournalsTab.jsx";
import RoutinesTab from "./tabs/RoutinesTab.jsx";
import RollsTab from "./tabs/RollsTab.jsx";
import TechniquesTab from "./tabs/TechniquesTab.jsx";
import FlowTab from "./tabs/FlowTab.jsx";
import ExerciseLibraryTab from "./tabs/ExerciseLibraryTab.jsx";

const PAGE_TITLES = {
  home: "Home",
  sessions: "Sessions",
  journals: "Journals",
  routines: "Routines",
  library: "Library",
  rolls: "Rolls",
  techniques: "Techniques",
  flow: "Flow",
};

export default function App({ uid, userEmail, onLogout }) {
  const [page, setPage] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [folders, setFolders] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [journals, setJournals] = useState([]);
  const [rolls, setRolls] = useState([]);
  const [techniques, setTechniques] = useState([]);
  const [jitsFolders, setJitsFolders] = useState([]);
  const [exercises, setExercises] = useState([]);
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
        setExercises(Array.isArray(data.exercises) ? data.exercises : []);
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
      saveLog(uid, { sessions, folders, routines, journals, rolls, techniques, jitsFolders, exercises }).catch((e) => {
        console.error("save failed", e);
        setSyncError("Couldn't save your last change. Check your connection.");
      });
    }, 250);
    return () => clearTimeout(saveTimer.current);
  }, [sessions, folders, routines, journals, rolls, techniques, jitsFolders, exercises, loaded, uid]);

  const exportJSON = () =>
    downloadFile(
      `workout-data-${todayISO()}.json`,
      JSON.stringify(
        { exportedAt: new Date().toISOString(), sessions, folders, routines, journals, rolls, techniques, jitsFolders, exercises },
        null,
        2
      ),
      "application/json"
    );

  const exportCSV = () =>
    downloadFile(
      `workout-data-${todayISO()}.csv`,
      combinedToCSV(sessions, routines, journals, folders, rolls, techniques, jitsFolders, exercises),
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
      setExercises((prev) => mergeById(prev, incoming.exercises));
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

  const navigate = (nextPage) => {
    setPage(nextPage);
    setSidebarOpen(false);
  };

  return (
    <Shell>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ background: "none", border: "none", color: "var(--text)", cursor: "pointer", display: "flex" }}
          >
            <Menu size={20} />
          </button>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{PAGE_TITLES[page]}</span>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {page === "home" ? (
            <HomeTab
              sessions={sessions}
              rolls={rolls}
              setSessions={setSessions}
              setRolls={setRolls}
              routines={routines}
              folders={folders}
              exercises={exercises}
            />
          ) : page === "sessions" ? (
            <SessionsTab sessions={sessions} setSessions={setSessions} exercises={exercises} routines={routines} folders={folders} />
          ) : page === "journals" ? (
            <JournalsTab journals={journals} setJournals={setJournals} exercises={exercises} routines={routines} folders={folders} />
          ) : page === "routines" ? (
            <RoutinesTab folders={folders} setFolders={setFolders} routines={routines} setRoutines={setRoutines} exercises={exercises} />
          ) : page === "library" ? (
            <ExerciseLibraryTab exercises={exercises} setExercises={setExercises} sessions={sessions} journals={journals} routines={routines} folders={folders} />
          ) : page === "rolls" ? (
            <RollsTab rolls={rolls} setRolls={setRolls} />
          ) : page === "techniques" ? (
            <TechniquesTab folders={jitsFolders} setFolders={setJitsFolders} techniques={techniques} setTechniques={setTechniques} />
          ) : (
            <FlowTab techniques={techniques} setTechniques={setTechniques} />
          )}
        </div>

        <input ref={fileInputRef} type="file" accept=".csv,.json,application/json,text/csv" style={{ display: "none" }} onChange={handleFile} />

        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          page={page}
          onNavigate={navigate}
          userEmail={userEmail}
          syncError={syncError}
          importError={importError}
          onExportCSV={exportCSV}
          onExportJSON={exportJSON}
          onImportClick={() => fileInputRef.current?.click()}
          onLogout={onLogout}
        />
      </div>
    </Shell>
  );
}
