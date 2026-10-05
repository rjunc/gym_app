import { useMemo } from "react";
import { todayISO } from "./id.js";
import { sharedTagUsage } from "./tags.js";
import { taggedRecords } from "./tagManager.js";
import { useLog } from "./LogContext.js";

// The Tags field's suggestions for records like `own` (the kind being
// edited): its own tags first, then every other tag in the app (see
// sharedTagUsage). Outside the app's LogContext, just `own`'s.
export default function useTagSuggestions(own) {
  const log = useLog();
  const all = useMemo(() => (log ? taggedRecords(log) : own), [log, own]);
  return useMemo(() => sharedTagUsage(own, all, todayISO()), [own, all]);
}
