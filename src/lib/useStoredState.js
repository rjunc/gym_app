import { useState, useEffect } from "react";

// useState that's remembered in this browser (localStorage), for view
// settings like a page's sort: per device, never synced. Falls back to
// `initial` when nothing is stored, storage is blocked, or `isValid` turns
// the stored value down.
export default function useStoredState(key, initial, isValid = () => true) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored === null) return initial;
      const parsed = JSON.parse(stored);
      return isValid(parsed) ? parsed : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage blocked: the setting just isn't remembered.
    }
  }, [key, value]);
  return [value, setValue];
}
