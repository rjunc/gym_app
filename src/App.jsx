import { useState, useRef, useMemo } from "react";
import { CloudOff, RotateCw } from "lucide-react";
// `uid` is taken by the signed-in user's id below, so the id helper is newKey.
import { todayISO, uid as newKey } from "./lib/id.js";
import { downloadFile } from "./lib/download.js";
import { combinedToCSV, parseImportFile } from "./lib/importExport.js";
import { mergeById } from "./lib/arrays.js";
import { generateDemoData, isDemoRecord } from "./lib/demoData.js"; // TEMPORARY: pilot test data
import { exerciseUsageCounts } from "./lib/exercises.js";
import { routineUsageCounts } from "./lib/routines.js";
import { linkUsageCounts } from "./lib/links.js";
import { useSyncedCollection } from "./lib/useSyncedCollection.js";
import { LogContext } from "./lib/LogContext.js";
import { SheetStackContext } from "./lib/SheetStack.js";
import { ShellContext } from "./lib/ShellContext.js";
import Shell from "./ui/Shell.jsx";
import EmptyState from "./ui/EmptyState.jsx";
import { primaryBtnStyle } from "./ui/styles.js";
import Sidebar from "./ui/Sidebar.jsx";
import SheetStack from "./ui/SheetStack.jsx";
import HomeTab from "./tabs/HomeTab.jsx";
import SessionsTab from "./tabs/SessionsTab.jsx";
import JournalsTab from "./tabs/JournalsTab.jsx";
import RoutinesTab from "./tabs/RoutinesTab.jsx";
import RollsTab from "./tabs/RollsTab.jsx";
import TechniquesTab from "./tabs/TechniquesTab.jsx";
import FlowTab from "./tabs/FlowTab.jsx";
import ExerciseLibraryTab from "./tabs/ExerciseLibraryTab.jsx";
import PlanTab from "./tabs/PlanTab.jsx";
import TagManagerTab from "./tabs/TagManagerTab.jsx";

export default function App({ uid, userEmail, onLogout }) {
  const [page, setPage] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Each collection syncs on its own, one Firestore document per record.
  const [sessions, setSessions, sessionsStatus] = useSyncedCollection(uid, "sessions");
  const [folders, setFolders, foldersStatus] = useSyncedCollection(uid, "folders");
  const [routines, setRoutines, routinesStatus] = useSyncedCollection(uid, "routines");
  const [journals, setJournals, journalsStatus] = useSyncedCollection(uid, "journals");
  const [rolls, setRolls, rollsStatus] = useSyncedCollection(uid, "rolls");
  const [techniques, setTechniques, techniquesStatus] = useSyncedCollection(uid, "techniques");
  const [jitsFolders, setJitsFolders, jitsFoldersStatus] = useSyncedCollection(uid, "jitsFolders");
  const [exercises, setExercises, exercisesStatus] = useSyncedCollection(uid, "exercises");
  const [exerciseFolders, setExerciseFolders, exerciseFoldersStatus] = useSyncedCollection(uid, "exerciseFolders");
  const [goals, setGoals, goalsStatus] = useSyncedCollection(uid, "goals");
  const statuses = [sessionsStatus, foldersStatus, routinesStatus, journalsStatus, rollsStatus, techniquesStatus, jitsFoldersStatus, exercisesStatus, exerciseFoldersStatus, goalsStatus];
  const loaded = statuses.every((s) => s.loaded);
  // A failed first load blocks the whole app (see the error screen below)
  // rather than showing an empty log you could type over.
  const loadFailed = statuses.some((s) => s.loadError);
  const syncError = statuses.some((s) => s.error) ? "Couldn't sync with the server. Check your connection, then reload." : "";
  const [importError, setImportError] = useState("");
  // How much each exercise is used in sessions, shared by every Exercises
  // picker (Sessions, Journals, Home, Routines) so they all rank the same way.
  const exerciseUsage = useMemo(() => exerciseUsageCounts(sessions, todayISO()), [sessions]);
  // Same for routines, ranking the Routines picker (Sessions, Journals, Home).
  const routineUsage = useMemo(() => routineUsageCounts(sessions, todayISO()), [sessions]);
  // Same for techniques, over mat sessions, ranking the Techniques picker.
  const techniqueUsage = useMemo(() => linkUsageCounts(rolls, "techniqueIds", todayISO()), [rolls]);
  const fileInputRef = useRef(null);
  // The log for components that open a full page from inside a form (see
  // LogContext).
  const log = useMemo(
    () => ({
      sessions, setSessions, journals, setJournals, rolls, setRolls, routines, setRoutines, folders, setFolders, exercises, setExercises, exerciseFolders, setExerciseFolders,
      exerciseUsage, routineUsage, techniques, setTechniques, jitsFolders, setJitsFolders, techniqueUsage, goals, setGoals,
    }),
    [sessions, setSessions, journals, setJournals, rolls, setRolls, routines, setRoutines, folders, setFolders, exercises, setExercises, exerciseFolders, setExerciseFolders, exerciseUsage, routineUsage, techniques, setTechniques, jitsFolders, setJitsFolders, techniqueUsage, goals, setGoals]
  );
  // The summary sheets open on top of the page, drawn by SheetStack (see
  // lib/SheetStack.js).
  const [sheetStack, setSheetStack] = useState([]);
  const shell = useMemo(() => ({ openMenu: () => setSidebarOpen(true) }), []);
  const sheets = useMemo(
    () => ({
      open: (sheet) => setSheetStack((s) => [...s, { ...sheet, key: newKey() }]),
      back: () => setSheetStack((s) => s.slice(0, -1)),
      closeAll: () => setSheetStack([]),
    }),
    []
  );

  const exportJSON = () =>
    downloadFile(
      `workout-data-${todayISO()}.json`,
      JSON.stringify(
        { exportedAt: new Date().toISOString(), sessions, folders, routines, journals, rolls, techniques, jitsFolders, exercises, exerciseFolders, goals },
        null,
        2
      ),
      "application/json"
    );

  const exportCSV = () =>
    downloadFile(
      `workout-data-${todayISO()}.csv`,
      combinedToCSV(sessions, routines, journals, folders, rolls, techniques, jitsFolders, exercises, exerciseFolders),
      "text/csv"
    );

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportError("");
    try {
      const text = await file.text();
      const incoming = parseImportFile(file.name, text, folders, jitsFolders, exerciseFolders);

      setFolders(incoming.folders);
      setSessions((prev) => mergeById(prev, incoming.sessions));
      setJournals((prev) => mergeById(prev, incoming.journals));
      setRoutines((prev) => mergeById(prev, incoming.routines));
      setJitsFolders(incoming.jitsFolders);
      setRolls((prev) => mergeById(prev, incoming.rolls));
      setTechniques((prev) => mergeById(prev, incoming.techniques));
      setExerciseFolders(incoming.exerciseFolders);
      setExercises((prev) => mergeById(prev, incoming.exercises));
      setGoals((prev) => mergeById(prev, incoming.goals));
    } catch (err) {
      setImportError("Couldn't read that file. Make sure it's a CSV or JSON export from this app.");
    }
    e.target.value = "";
  };

  // TEMPORARY: pilot test data (see lib/demoData.js). Adds a months-long,
  // fully linked log to this account, or removes exactly that again — only
  // records whose id starts with "demo-", never anything typed in by hand.
  const collections = [
    [sessions, setSessions, "sessions"],
    [folders, setFolders, "folders"],
    [routines, setRoutines, "routines"],
    [journals, setJournals, "journals"],
    [rolls, setRolls, "rolls"],
    [techniques, setTechniques, "techniques"],
    [jitsFolders, setJitsFolders, "jitsFolders"],
    [exercises, setExercises, "exercises"],
    [exerciseFolders, setExerciseFolders, "exerciseFolders"],
    [goals, setGoals, "goals"],
  ];
  const hasDemoData = collections.some(([list]) => list.some(isDemoRecord));
  const toggleDemoData = () => {
    if (hasDemoData) {
      if (!window.confirm("Remove all test data? Only the generated test records are deleted; anything you added yourself stays.")) return;
      collections.forEach(([, set]) => set((prev) => prev.filter((r) => !isDemoRecord(r))));
    } else {
      if (!window.confirm("Add test data? This adds about 300 made-up exercises, routines, sessions, journal entries, mat sessions, techniques and Plan goals to this account. You can remove them all again from here.")) return;
      const demo = generateDemoData();
      collections.forEach(([, set, key]) => set((prev) => mergeById(prev, demo[key])));
    }
    setSidebarOpen(false);
  };

  if (loadFailed) {
    return (
      <Shell center>
        <EmptyState
          icon={CloudOff}
          title="Couldn't load your log"
          action={
            <button onClick={() => window.location.reload()} style={primaryBtnStyle}>
              <RotateCw size={15} /> Reload
            </button>
          }
        >
          Nothing can be edited until it loads. Your saved data hasn't been touched.
        </EmptyState>
      </Shell>
    );
  }

  if (!loaded) {
    return (
      <Shell center>
        <div role="status" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, color: "var(--text-dim)", fontSize: 13 }}>
          <div className="spinner" />
          Syncing your log…
        </div>
      </Shell>
    );
  }

  const navigate = (nextPage) => {
    setPage(nextPage);
    setSheetStack([]);
    setSidebarOpen(false);
  };

  return (
    <LogContext.Provider value={log}>
      <SheetStackContext.Provider value={sheets}>
        <ShellContext.Provider value={shell}>
          <Shell>
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
              hasDemoData={hasDemoData}
              onToggleDemoData={toggleDemoData}
              onLogout={onLogout}
            />

            <main className="app-main">
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
                  routineUsage={routineUsage}
                  goals={goals}
                  onOpenPlan={() => navigate("plan")}
                />
              ) : page === "plan" ? (
                <PlanTab goals={goals} sessions={sessions} exercises={exercises} />
              ) : page === "tags" ? (
                <TagManagerTab />
              ) : page === "sessions" ? (
                <SessionsTab
                  sessions={sessions}
                  setSessions={setSessions}
                  exercises={exercises}
                  exerciseUsage={exerciseUsage}
                  routines={routines}
                  routineUsage={routineUsage}
                  folders={folders}
                />
              ) : page === "journals" ? (
                <JournalsTab
                  journals={journals}
                  setJournals={setJournals}
                  exercises={exercises}
                  exerciseUsage={exerciseUsage}
                  routines={routines}
                  routineUsage={routineUsage}
                  folders={folders}
                />
              ) : page === "routines" ? (
                <RoutinesTab
                  folders={folders}
                  setFolders={setFolders}
                  routines={routines}
                  setRoutines={setRoutines}
                  exercises={exercises}
                  exerciseUsage={exerciseUsage}
                  sessions={sessions}
                  journals={journals}
                />
              ) : page === "library" ? (
                <ExerciseLibraryTab
                  exercises={exercises}
                  setExercises={setExercises}
                  folders={exerciseFolders}
                  setFolders={setExerciseFolders}
                  sessions={sessions}
                  journals={journals}
                  routines={routines}
                />
              ) : page === "rolls" ? (
                <RollsTab rolls={rolls} setRolls={setRolls} />
              ) : page === "techniques" ? (
                <TechniquesTab folders={jitsFolders} setFolders={setJitsFolders} techniques={techniques} setTechniques={setTechniques} rolls={rolls} />
              ) : (
                <FlowTab techniques={techniques} setTechniques={setTechniques} />
              )}
            </main>

            <input ref={fileInputRef} type="file" accept=".csv,.json,application/json,text/csv" style={{ display: "none" }} onChange={handleFile} />

            <SheetStack stack={sheetStack} setStack={setSheetStack} />
          </Shell>
        </ShellContext.Provider>
      </SheetStackContext.Provider>
    </LogContext.Provider>
  );
}
