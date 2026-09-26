import { Search } from "lucide-react";
import { searchWords } from "../lib/search.js";
import SegmentedToggle from "./SegmentedToggle.jsx";
import { inputStyle } from "./styles.js";

// The search input on every list page (see lib/search.js for what it matches).
// Once two or more terms are typed (a "quoted phrase" counts as one), an All
// words / Any word toggle appears underneath — with a single term the two
// modes mean the same thing, so the toggle stays out of the way until it
// matters.
export default function SearchBox({ value, setValue, matchMode, setMatchMode, placeholder, accent = "--accent" }) {
  const multiWord = searchWords(value).length > 1;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ position: "relative" }}>
        <Search size={15} style={{ position: "absolute", left: 10, top: 10, color: "var(--text-dim)" }} />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          style={{ ...inputStyle, padding: "9px 10px 9px 32px" }}
        />
      </div>
      {multiWord && (
        <div style={{ marginTop: 8 }}>
          <SegmentedToggle
            options={[
              { key: "all", label: "All words" },
              { key: "any", label: "Any word" },
            ]}
            value={matchMode}
            setValue={setMatchMode}
            accent={accent}
          />
        </div>
      )}
    </div>
  );
}
