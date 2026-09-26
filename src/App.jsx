import { useState, useEffect, useRef, useMemo } from "react";
import { Menu } from "lucide-react";
import { todayISO } from "./lib/id.js";
import { downloadFile } from "./lib/download.js";
import { combinedToCSV, parseImportFile } from "./lib/importExport.js";
import { mergeById } from "./lib/arrays.js";
import { exerciseUsageCounts } from "./lib/exercises.js";
import { migrateLegacyLog } from "./lib/firestoreLog.js";
import { useSyncedCollection } from "./lib/useSyncedCollection.js";
import Shell from "./ui/Shell.jsx";
import { primaryBtnStyle } from "./ui/styles.js";
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
  // A log saved in the old single-document shape is copied into the
  // per-record collections before anything subscribes (see migrateLegacyLog).
  const [migrated, setMigrated] = useState(false);
  const [migrationError, setMigrationError] = useState(null);
  useEffect(() => {
    setMigrated(false);
    setMigrationError(null);
    migrateLegacyLog(uid)
      .then(() => setMigrated(true))
      .catch((err) => {
        console.error("migration failed", err);
        setMigrationError(err);
      });
  }, [uid]);

  // Each collection syncs on its own, one Firestore document per record.
  const [sessions, setSessions, sessionsStatus] = useSyncedCollection(uid, "sessions", migrated);
  const [folders, setFolders, foldersStatus] = useSyncedCollection(uid, "folders", migrated);
  const [routines, setRoutines, routinesStatus] = useSyncedCollection(uid, "routines", migrated);
  const [journals, setJournals, journalsStatus] = useSyncedCollection(uid, "journals", migrated);
  const [rolls, setRolls, rollsStatus] = useSyncedCollection(uid, "rolls", migrated);
  const [techniques, setTechniques, techniquesStatus] = useSyncedCollection(uid, "techniques", migrated);
  const [jitsFolders, setJitsFolders, jitsFoldersStatus] = useSyncedCollection(uid, "jitsFolders", migrated);
  const [exercises, setExercises, exercisesStatus] = useSyncedCollection(uid, "exercises", migrated);
  const statuses = [sessionsStatus, foldersStatus, routinesStatus, journalsStatus, rollsStatus, techniquesStatus, jitsFoldersStatus, exercisesStatus];
  const loaded = statuses.every((s) => s.loaded);
  // A failed first load blocks the whole app (see the error screen below)
  // rather than showing an empty log you could type over.
  const loadFailed = !!migrationError || statuses.some((s) => s.loadError);
  const syncError = statuses.some((s) => s.error) ? "Couldn't sync with the server. Check your connection, then reload." : "";
  const [importError, setImportError] = useState("");
  // How much each exercise is used in sessions, shared by every Exercises
  // picker (Sessions, Journals, Home, Routines) so they all rank the same way.
  const exerciseUsage = useMemo(() => exerciseUsageCounts(sessions, todayISO()), [sessions]);
  const fileInputRef = useRef(null);

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

  if (loadFailed) {
    return (
      <Shell>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            height: "100%",
            padding: 24,
            textAlign: "center",
            color: "var(--text-dim)",
          }}
        >
          <div>Couldn't load your log, so nothing can be edited right now. Your saved data hasn't been touched.</div>
          <button onClick={() => window.location.reload()} style={primaryBtnStyle}>
            Reload
          </button>
        </div>
      </Shell>
    );
  }

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
              exerciseUsage={exerciseUsage}
            />
          ) : page === "sessions" ? (
            <SessionsTab sessions={sessions} setSessions={setSessions} exercises={exercises} exerciseUsage={exerciseUsage} routines={routines} folders={folders} />
          ) : page === "journals" ? (
            <JournalsTab journals={journals} setJournals={setJournals} exercises={exercises} exerciseUsage={exerciseUsage} routines={routines} folders={folders} />
          ) : page === "routines" ? (
            <RoutinesTab folders={folders} setFolders={setFolders} routines={routines} setRoutines={setRoutines} exercises={exercises} exerciseUsage={exerciseUsage} />
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
