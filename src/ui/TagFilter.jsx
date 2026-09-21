import { useState, useMemo, useRef, useEffect } from "react";
import { Search, X, ChevronDown, ChevronUp } from "lucide-react";
import { tagCounts, searchTags } from "../lib/tags.js";
import TagChip from "./TagChip.jsx";
import SegmentedToggle from "./SegmentedToggle.jsx";
import { inputStyle, labelStyle } from "./styles.js";

const QUICK_COUNT = 6; // "most used" chips shown once the vocabulary is large
const SHOW_ALL_UP_TO = 8; // at or below this many tags, just show them all as chips
// Tall enough to show about five rows and let a sixth peek out, which tells you
// the list scrolls.
const LIST_MAX_HEIGHT = 200;

const dim = { opacity: 0.6, fontWeight: 500 };

// Tag filter whose height doesn't grow with the size of the tag vocabulary:
// picked tags stay pinned and removable, the most-used few are one tap away,
// and every other tag lives in a scrollable list under the search box. Focusing
// the box lists all tags (A–Z) so you can browse for one you've forgotten;
// typing narrows it. `entries` is whatever set of entries the tags should be
// drawn from (and counted over).
export default function TagFilter({ entries, activeTags, onToggle, matchMode, setMatchMode, accent = "--accent" }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const counts = useMemo(() => tagCounts(entries), [entries]);
  const unselected = counts.filter((c) => !activeTags.includes(c.tag));
  const showSearch = counts.length > SHOW_ALL_UP_TO;
  const quick = showSearch ? unselected.slice(0, QUICK_COUNT) : unselected;

  // Browsing (no query) goes A–Z so a forgotten tag is easy to scan for; the
  // most-used ones are already up in the chips. Typing ranks by match, then usage.
  const list = query.trim() ? searchTags(unselected, query) : [...unselected].sort((a, b) => a.tag.localeCompare(b.tag));
  const active = Math.min(highlight, Math.max(list.length - 1, 0));

  // Keep the keyboard-highlighted row in view as it moves through a long list.
  useEffect(() => {
    if (open) listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const pick = (tag) => {
    onToggle(tag);
    setQuery("");
    setHighlight(0); // stay open so several tags can be picked in a row
  };

  const toggleList = () => {
    if (open) {
      setOpen(false);
      inputRef.current?.blur();
    } else {
      inputRef.current?.focus();
      setOpen(true);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight(Math.min(active + 1, list.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight(Math.max(active - 1, 0));
    } else if (e.key === "Enter") {
      if (open && list.length > 0) pick(list[active].tag);
    } else if (e.key === "Escape") {
      if (query) setQuery("");
      else {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
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
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlight(0);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onClick={() => setOpen(true)}
              onBlur={() => setOpen(false)}
              onKeyDown={onKeyDown}
              placeholder={`Find a tag or browse all ${counts.length}…`}
              aria-label="Find a tag"
              aria-expanded={open}
              style={{ ...inputStyle, padding: "9px 34px 9px 32px" }}
            />
            {/* mousedown is swallowed so tapping this doesn't blur the input (which would close the list before the click lands). */}
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={toggleList}
              aria-label={open ? "Hide tag list" : "Show all tags"}
              style={{ position: "absolute", right: 4, top: 4, background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", display: "flex", padding: 6 }}
            >
              {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          {open && (
            <div
              ref={listRef}
              // Swallowing mousedown keeps the input focused, so clicking a row
              // or dragging the scrollbar doesn't blur it and close the list first.
              onMouseDown={(e) => e.preventDefault()}
              style={{
                marginTop: 6,
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: "var(--surface-2)",
                maxHeight: LIST_MAX_HEIGHT,
                overflowY: "auto",
              }}
            >
              {list.length === 0 ? (
                <div style={{ padding: "9px 12px", fontSize: 12, color: "var(--text-dim)" }}>
                  {query.trim() ? `No tags match “${query.trim()}”.` : "Every tag is already selected."}
                </div>
              ) : (
                list.map(({ tag, count }, i) => (
                  <button
                    key={tag}
                    data-idx={i}
                    onClick={() => pick(tag)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      width: "100%",
                      padding: "9px 12px",
                      background: i === active ? `var(${accent}-dim)` : "transparent", // the one Enter will pick
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
