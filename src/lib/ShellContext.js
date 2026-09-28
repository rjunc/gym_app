import { createContext, useContext } from "react";

// What a page needs from the app around it: `openMenu()` opens the sidebar
// on narrow screens (on wide ones it's always open, and the page's menu
// button is hidden). Null outside the app (e.g. in isolated tests).
export const ShellContext = createContext(null);

export const useShell = () => useContext(ShellContext);
