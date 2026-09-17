import SegmentedToggle from "./SegmentedToggle.jsx";

const OPTIONS = [
  { key: "gi", label: "Gi" },
  { key: "no-gi", label: "No-Gi" },
];

// Gi mode shows everything (no-gi-safe techniques still work in the gi).
// No-gi mode hides anything marked giOnly, since those moves don't apply.
export default function GiModeToggle({ mode, setMode, accent = "--accent4" }) {
  return <SegmentedToggle options={OPTIONS} value={mode} setValue={setMode} accent={accent} />;
}
