import { createContext, useContext } from "react";

// The whole log and its setters, as App holds them, for components deep in
// the tree that need a full page's worth of data without it being passed
// down through every layer — e.g. the entry form opening the real Routines or
// Library page to pick from (see PagePicker). Pages themselves still take
// their data as props from App.
//   { sessions, setSessions, journals, setJournals, routines, setRoutines,
//     folders, setFolders, exercises, setExercises, exerciseUsage, routineUsage }
export const LogContext = createContext(null);

export const useLog = () => useContext(LogContext);
