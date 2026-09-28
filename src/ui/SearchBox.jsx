import { Search, X, Tag } from "lucide-react";
import { searchWords } from "../lib/search.js";
import SegmentedToggle from "./SegmentedToggle.jsx";
import { inputStyle, secondaryBtnStyle } from "./styles.js";

// The search input on every list page (see lib/search.js for what it matches),
// with a clear button once something's typed and `trailing` (e.g. the Tags
// button) beside it. Once two or more terms are typed (a "quoted phrase"
// counts as one), an All words / Any word toggle appears underneath — with a
// single term the two modes mean the same thing, so the toggle stays out of
// the way until it matters.
export default function SearchBox({ value, setValue, matchMode, setMatchMode, placeholder, accent = "--accent", trailing }) {
  const multiWord = searchWords(value).length > 1;
  return (
    <div>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)", pointerEvents: "none" }} />
          <input
            type="search"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            aria-label="Search"
            style={{ ...inputStyle, padding: "9px 36px 9px 36px", minHeight: 42 }}
          />
          {value && (
            <button
              onClick={() => setValue("")}
              aria-label="Clear search"
              style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "var(--surface-3)", border: "none", borderRadius: 999, color: "var(--text-dim)", cursor: "pointer", display: "flex", padding: 4 }}
            >
              <X size={13} />
            </button>
          )}
        </div>
        {trailing}
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

// The button beside the search box that shows or hides the page's tag
// filter, with how many tags are picked.
export function TagsToggle({ open, count = 0, onClick, accent = "--accent" }) {
  const on = open || count > 0;
  return (
    <button
      onClick={onClick}
      aria-expanded={open}
      aria-label={count > 0 ? `Tags, ${count} selected` : "Filter by tag"}
      title="Filter by tag"
      style={{
        ...secondaryBtnStyle,
        minHeight: 42,
        padding: "0 12px",
        fontSize: 14,
        background: on ? `var(${accent}-dim)` : "var(--surface-2)",
        borderColor: on ? "transparent" : "var(--border-strong)",
        color: on ? `var(${accent})` : "var(--text)",
      }}
    >
      <Tag size={15} />
      <span>Tags</span>
      {count > 0 && (
        <span style={{ background: `var(${accent})`, color: "var(--on-accent)", borderRadius: 999, fontSize: 11, fontWeight: 700, minWidth: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>
          {count}
        </span>
      )}
    </button>
  );
}
