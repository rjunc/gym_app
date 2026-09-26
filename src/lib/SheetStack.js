import { createContext, useContext } from "react";

// Opens the app's summary sheets — a routine, a Library exercise, a dated
// entry — from anywhere, stacked on top of whatever is already open, so
// following a link (a session's routine, that routine's exercise, a session
// in its history…) never loses your place. The stack itself lives in App and
// is drawn by ui/SheetStack.jsx.
//   open(sheet)  pushes one of:
//                { kind: "routine", id }   { kind: "exercise", id }
//                { kind: "entry", source: "sessions" | "journals" | "rolls", id }
//                Add `hideDelete: true` when opened while picking for an
//                entry (see PagePicker), so nothing it links can be deleted;
//                everything opened on top of it inherits that.
//   back()       closes the top sheet
//   closeAll()   closes every sheet
// Null outside the provider (e.g. in isolated tests), in which case links
// render as plain text.
export const SheetStackContext = createContext(null);

export const useSheets = () => useContext(SheetStackContext);
