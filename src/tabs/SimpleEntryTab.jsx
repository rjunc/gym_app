import { useState, useMemo } from "react";
import { Search, Plus, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { uid, todayISO, formatDate } from "../lib/id.js";
import TagChip from "../ui/TagChip.jsx";
import IconBtn from "../ui/IconBtn.jsx";
import EntryComposer from "../ui/EntryComposer.jsx";
import SegmentedToggle from "../ui/SegmentedToggle.jsx";
import { inputStyle, cardStyle, primaryBtnStyle, ghostLinkStyle } from "../ui/styles.js";

// Sessions and journals are both just a flat, most-recent-first list of dated
// entries with tags — no folders. Both tabs are thin wrappers around this.
export default function SimpleEntryTab({
  entries,
  setEntries,
  eyebrow,
  heading,
  searchPlaceholder,
  emptyLabel,
  textLabel,
  textPlaceholder,
  accent = "--accent",
}) {
  const [search, setSearch] = useState("");
  const [activeTags, setActiveTags] = useState([]);
  const [tagMatchMode, setTagMatchMode] = useState("all"); // "all" (AND) or "any" (OR)
  const [expanded, setExpanded] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showComposer, setShowComposer] = useState(false);
  const [form, setForm] = useState({ date: todayISO(), title: "", tags: [], text: "" });
  const [tagDraft, setTagDraft] = useState("");

  const allTags = useMemo(() => {
    const set = new Set();
    entries.forEach((s) => (s.tags || []).forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [entries]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries
      .filter((s) => {
        const matchesSearch =
          q === "" ||
          (s.title || "").toLowerCase().includes(q) ||
          (s.text || "").toLowerCase().includes(q) ||
          (s.tags || []).some((t) => t.toLowerCase().includes(q));
        const matchesTags =
          activeTags.length === 0 ||
          (tagMatchMode === "any"
            ? activeTags.some((t) => (s.tags || []).includes(t))
            : activeTags.every((t) => (s.tags || []).includes(t)));
        return matchesSearch && matchesTags;
      })
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [entries, search, activeTags, tagMatchMode]);

  const resetForm = () => {
    setForm({ date: todayISO(), title: "", tags: [], text: "" });
    setTagDraft("");
    setEditingId(null);
  };

  const openNewComposer = () => {
    resetForm();
    setShowComposer(true);
  };

  const openEdit = (entry) => {
    setForm({ date: entry.date, title: entry.title || "", tags: [...(entry.tags || [])], text: entry.text || "" });
    setEditingId(entry.id);
    setShowComposer(true);
    setTagDraft("");
  };

  const addTagFromDraft = () => {
    const t = tagDraft.trim().toLowerCase();
    if (t && !form.tags.includes(t)) setForm((f) => ({ ...f, tags: [...f.tags, t] }));
    setTagDraft("");
  };

  const removeFormTag = (t) => setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }));

  const saveEntry = () => {
    if (!form.text.trim()) return;
    if (editingId) {
      setEntries((prev) => prev.map((s) => (s.id === editingId ? { ...s, ...form } : s)));
    } else {
      setEntries((prev) => [{ id: uid(), ...form }, ...prev]);
    }
    setShowComposer(false);
    resetForm();
  };

  const deleteEntry = (id) => {
    if (!window.confirm("Delete this entry? This can't be undone.")) return;
    setEntries((prev) => prev.filter((s) => s.id !== id));
  };

  const toggleTagFilter = (t) => setActiveTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  return (
    <>
      <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 0.3 }}>{eyebrow}</div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 0.2 }}>{heading}</div>
          </div>
          <button onClick={openNewComposer} style={{ ...primaryBtnStyle, background: `var(${accent})` }}>
            <Plus size={15} /> New entry
          </button>
        </div>

        <div style={{ position: "relative", marginBottom: 10 }}>
          <Search size={15} style={{ position: "absolute", left: 10, top: 10, color: "var(--text-dim)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            style={{ ...inputStyle, padding: "9px 10px 9px 32px" }}
          />
        </div>

        {allTags.length > 0 && (
          // Capped and independently scrollable so a large tag vocabulary
          // browses its own list instead of pushing the entries below out of
          // view — this container sits in a fixed-height shell with no
          // page-level scroll, so an unbounded chip cloud would strand
          // everything under it.
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 88, overflowY: "auto" }}>
            {allTags.map((t) => (
              <TagChip key={t} label={t} accent={accent} active={activeTags.includes(t)} onClick={() => toggleTagFilter(t)} />
            ))}
          </div>
        )}

        {activeTags.length > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Match:</span>
            <SegmentedToggle
              options={[
                { key: "all", label: "All tags" },
                { key: "any", label: "Any tag" },
              ]}
              value={tagMatchMode}
              setValue={setTagMatchMode}
              accent={accent}
            />
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 18px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-dim)", padding: "36px 10px", fontSize: 13 }}>
            {entries.length === 0 ? emptyLabel : "Nothing matches that search or tag filter."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((s) => {
              const isOpen = expanded === s.id;
              const isLong = (s.text || "").length > 220;
              return (
                <div key={s.id} style={cardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {s.title ? (
                        <>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{s.title}</div>
                          <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{formatDate(s.date)}</div>
                        </>
                      ) : (
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{formatDate(s.date)}</div>
                      )}
                      {s.tags && s.tags.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {s.tags.map((t) => (
                            <TagChip key={t} label={t} small accent={accent} onClick={() => toggleTagFilter(t)} active={activeTags.includes(t)} />
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <IconBtn onClick={() => openEdit(s)}>
                        <Pencil size={14} />
                      </IconBtn>
                      <IconBtn onClick={() => deleteEntry(s.id)} danger>
                        <Trash2 size={14} />
                      </IconBtn>
                    </div>
                  </div>

                  <p
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 13,
                      lineHeight: 1.55,
                      color: "var(--text)",
                      marginTop: 8,
                      marginBottom: 0,
                      whiteSpace: "pre-wrap",
                      display: "-webkit-box",
                      WebkitLineClamp: isOpen || !isLong ? "unset" : 5,
                      WebkitBoxOrient: "vertical",
                      overflow: isOpen || !isLong ? "visible" : "hidden",
                    }}
                  >
                    {s.text}
                  </p>

                  {isLong && (
                    <button onClick={() => setExpanded(isOpen ? null : s.id)} style={{ ...ghostLinkStyle, marginTop: 6 }}>
                      {isOpen ? (
                        <>
                          Show less <ChevronUp size={13} />
                        </>
                      ) : (
                        <>
                          Show more <ChevronDown size={13} />
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showComposer && (
        <EntryComposer
          title={editingId ? "Edit entry" : "New entry"}
          form={form}
          setForm={setForm}
          tagDraft={tagDraft}
          setTagDraft={setTagDraft}
          onAddTag={addTagFromDraft}
          onRemoveTag={removeFormTag}
          onSave={saveEntry}
          onClose={() => {
            setShowComposer(false);
            resetForm();
          }}
          showDate
          showName
          nameField="title"
          nameLabel="Title"
          namePlaceholder="Optional title…"
          textLabel={textLabel}
          textPlaceholder={textPlaceholder}
          saveLabel={editingId ? "Save changes" : "Save entry"}
          accent={accent}
        />
      )}
    </>
  );
}
