import { ENTRY_TYPES } from "../lib/entryTypes.js";
import SimpleEntryTab from "./SimpleEntryTab.jsx";

export default function RollsTab({ rolls, setRolls }) {
  return <SimpleEntryTab entries={rolls} setEntries={setRolls} type={ENTRY_TYPES.rolls} />;
}
