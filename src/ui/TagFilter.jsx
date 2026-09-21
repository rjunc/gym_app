import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { tagCounts, searchTags } from "../lib/tags.js";
import TagChip from "./TagChip.jsx";
import SegmentedToggle from "./SegmentedToggle.jsx";
import { inputStyle, labelStyle } from "./styles.js";

const QUICK_COUNT = 6; // "most used" chips shown once the vocabulary is large
const SHOW_ALL_UP_TO = 8; // at or below this many tags, just show them all as chips
const MAX_RESULTS = 6; // rows in the search dropdown

const dim = { opacity: 0.6, fontWeight: 500 };

// Tag filter whose height doesn't grow with the size of the tag vocabulary:
// picked tags stay pinned and removable, the most-used few are one tap away,
// and everything else is reached by searching. `entries` is whatever set of
// entries the tags should be drawn from (and counted over).
export default function TagFilter({ entries, activeTags, onToggle, matchMode, setMatchMode, accent = "--accent" }) {
  const [query, setQuery] = useState("");

  const counts = useMemo(() => tagCounts(entries), [entries]);
  const unselected = counts.filter((c) => !activeTags.includes(c.tag));
  const showSearch = counts.length > SHOW_ALL_UP_TO;
  const quick = showSearch ? unselected.slice(0, QUICK_COUNT) : unselected;
  const matches = searchTags(unselected, query);
  const results = matches.slice(0, MAX_RESULTS);

  const pick = (tag) => {
    onToggle(tag);
    setQuery("");
  };

  if (counts.length === 0 && activeTags.length === 0) return null;

  return (
    <div>
      {activeTags.length > 0 && (
        // Capped as a safety net; in practice you pick a handful at most.
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8, maxHeight: 72, overflowY: "auto" }}>
          {activeTags.map((t) => (
            <TagChip
              key={t}
              active
              accent={accent}
              onClick={() => onToggle(t)}
              label={
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {t} <X size={11} />
                </span>
              }
            />
          ))}
        </div>
      )}

      {quick.length > 0 && (
        <>
          {showSearch && <span style={{ ...labelStyle, marginBottom: 4 }}>Most used</span>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {quick.map(({ tag, count }) => (
              <TagChip
                key={tag}
                accent={accent}
                onClick={() => onToggle(tag)}
                label={
                  <>
                    {tag} <span style={dim}>{count}</span>
                  </>
                }
              />
            ))}
          </div>
        </>
      )}

      {showSearch && (
        <div style={{ marginTop: 10 }}>
          <div style={{ position: "relative" }}>
            <Search size={15} style={{ position: "absolute", left: 10, top: 10, color: "var(--text-dim)" }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && results.length > 0) pick(results[0].tag);
                else if (e.key === "Escape") setQuery("");
              }}
              placeholder="Find a tag…"
              aria-label="Find a tag"
              style={{ ...inputStyle, padding: "9px 10px 9px 32px" }}
            />
          </div>

          {query.trim() !== "" && (
            <div style={{ marginTop: 6, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", background: "var(--surface-2)" }}>
              {results.length === 0 ? (
                <div style={{ padding: "9px 12px", fontSize: 12, color: "var(--text-dim)" }}>No tags match “{query.trim()}”.</div>
              ) : (
                results.map(({ tag, count }, i) => (
                  <button
                    key={tag}
                    onClick={() => pick(tag)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      width: "100%",
                      padding: "9px 12px",
                      background: i === 0 ? `var(${accent}-dim)` : "transparent", // the one Enter will pick
                      border: "none",
                      borderTop: i === 0 ? "none" : "1px solid var(--border)",
                      color: "var(--text)",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    {tag}
                    <span style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 500 }}>{count}</span>
                  </button>
                ))
              )}
              {matches.length > results.length && (
                <div style={{ padding: "7px 12px", fontSize: 11, color: "var(--text-dim)", borderTop: "1px solid var(--border)" }}>
                  {matches.length - results.length} more — keep typing to narrow it down.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTags.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
          <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Match:</span>
          <SegmentedToggle
            options={[
              { key: "all", label: "All tags" },
              { key: "any", label: "Any tag" },
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
