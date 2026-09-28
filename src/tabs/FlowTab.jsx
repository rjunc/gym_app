import { useState, useMemo } from "react";
import { ChevronRight, RotateCcw, Plus, Route, MapPin } from "lucide-react";
import { todayISO } from "../lib/id.js";
import { newRecord, editById } from "../lib/records.js";
import { collectPositions, techniquesFrom } from "../lib/positions.js";
import { tagUsage, addTagsFromDraft } from "../lib/tags.js";
import { cleanFields } from "../lib/text.js";
import EntryComposer from "../ui/EntryComposer.jsx";
import TagChip from "../ui/TagChip.jsx";
import GiModeToggle from "../ui/GiModeToggle.jsx";
import SegmentedToggle from "../ui/SegmentedToggle.jsx";
import FlowOptionCard from "./FlowOptionCard.jsx";
import { PageHeader, PageBody } from "../ui/Page.jsx";
import EmptyState from "../ui/EmptyState.jsx";
import { inputStyle, primaryBtnStyle, secondaryBtnStyle, ghostLinkStyle, labelStyle, metaStyle, chipRowStyle } from "../ui/styles.js";

const ACCENT = "--accent4";

const emptyForm = (position) => ({ name: "", tags: [], text: "", position: position || "", toPosition: "", starred: false, giOnly: false });

// Lets you navigate your Techniques library as a chain: pick where you are,
// see the moves you've logged from there, follow one to where it leads, and
// repeat — instead of hunting through folders while you're trying to
// remember "what do I do from here".
export default function FlowTab({ techniques, setTechniques }) {
  const [path, setPath] = useState([]); // [{ position }]
  const [positionDraft, setPositionDraft] = useState("");
  const [giMode, setGiMode] = useState("gi");
  const [activeTags, setActiveTags] = useState([]);
  const [tagMatchMode, setTagMatchMode] = useState("all"); // "all" (AND) or "any" (OR)
  const [openTechniqueId, setOpenTechniqueId] = useState(null);
  const [showComposer, setShowComposer] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [tagDraft, setTagDraft] = useState("");

  const allPositions = useMemo(() => collectPositions(techniques), [techniques]);
  const tagSuggestions = useMemo(() => tagUsage(techniques, todayISO()), [techniques]);
  const currentPosition = path.length ? path[path.length - 1].position : null;
  const optionsAtPosition = useMemo(
    () => (currentPosition ? techniquesFrom(techniques, currentPosition) : []),
    [techniques, currentPosition]
  );
  // In No-Gi mode, don't offer moves that only work with the gi — they're
  // not a real option right now. Starred (go-to) techniques sort first so
  // your trusted answer is the one you see without scrolling.
  const options = useMemo(() => {
    const visible = giMode === "no-gi" ? optionsAtPosition.filter((t) => !t.giOnly) : optionsAtPosition;
    return [...visible].sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0));
  }, [optionsAtPosition, giMode]);
  const hiddenGiOnlyCount = optionsAtPosition.length - options.length;

  const toggleStar = (id) => setTechniques((prev) => editById(prev, id, { starred: !prev.find((t) => t.id === id)?.starred }));

  // Which tags are actually in play at this position (post gi-filter), so
  // "just show me the escapes" (or whatever tag you use for that) only
  // offers tags that exist here instead of the whole library's vocabulary.
  const tagsHere = useMemo(() => {
    const set = new Set();
    options.forEach((t) => (t.tags || []).forEach((tag) => set.add(tag)));
    return Array.from(set).sort();
  }, [options]);
  const tagFilteredOptions = useMemo(() => {
    if (activeTags.length === 0) return options;
    return options.filter((t) =>
      tagMatchMode === "any"
        ? activeTags.some((tag) => (t.tags || []).includes(tag))
        : activeTags.every((tag) => (t.tags || []).includes(tag))
    );
  }, [options, activeTags, tagMatchMode]);
  const toggleTagFilter = (t) => setActiveTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const goTo = (position) => {
    const clean = position.trim();
    if (!clean) return;
    setPath((prev) => [...prev, { position: clean }]);
    setPositionDraft("");
    setOpenTechniqueId(null);
    setActiveTags([]);
  };

  const jumpToStep = (index) => {
    setPath((prev) => prev.slice(0, index + 1));
    setOpenTechniqueId(null);
    setActiveTags([]);
  };

  const startOver = () => {
    setPath([]);
    setOpenTechniqueId(null);
    setActiveTags([]);
  };

  const openComposer = () => {
    setForm(emptyForm(currentPosition));
    setTagDraft("");
    setShowComposer(true);
  };

  const addTagFromDraft = () => {
    setForm((f) => ({ ...f, tags: addTagsFromDraft(f.tags, tagDraft) }));
    setTagDraft("");
  };
  const removeFormTag = (t) => setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }));

  const saveTechnique = () => {
    const fields = cleanFields(form);
    if (!fields.name) return;
    setTechniques((prev) => [newRecord({ ...fields, folderId: null }), ...prev]);
    setShowComposer(false);
  };

  return (
    <>
      <PageHeader eyebrow="BJJ" title="Flow" actions={<GiModeToggle mode={giMode} setMode={setGiMode} accent={ACCENT} />}>
        {path.length > 0 && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            {/* Capped and independently scrollable so a long chain browses
                in place instead of growing this fixed, non-scrolling header
                without bound and crowding out the options list below. */}
            <div style={{ flex: 1, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4, fontSize: 13, maxHeight: 88, overflowY: "auto" }}>
              {path.map((step, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {i > 0 && <ChevronRight size={14} color="var(--text-faint)" />}
                  <button
                    onClick={() => jumpToStep(i)}
                    style={{
                      ...ghostLinkStyle,
                      padding: "3px 10px",
                      borderRadius: 999,
                      background: i === path.length - 1 ? `var(${ACCENT}-dim)` : "transparent",
                      color: i === path.length - 1 ? `var(${ACCENT})` : "var(--text-dim)",
                      fontWeight: i === path.length - 1 ? 600 : 500,
                    }}
                  >
                    {step.position}
                  </button>
                </span>
              ))}
            </div>
            {/* Kept outside the scrollable trail above so it's always
                reachable no matter how long the chain gets. */}
            <button onClick={startOver} style={{ ...secondaryBtnStyle, background: "transparent", minHeight: 30, padding: "3px 10px", fontSize: 12, flexShrink: 0 }}>
              <RotateCcw size={13} /> Start over
            </button>
          </div>
        )}
      </PageHeader>

      <PageBody>
        {!currentPosition ? (
          <>
            <div style={{ padding: "8px 2px 4px" }}>
              <div style={{ fontSize: 17, fontWeight: 600 }}>Where are you starting from?</div>
              <div style={{ ...metaStyle, fontSize: 13, marginTop: 4 }}>Pick a position to see the moves you've logged from it, then follow one to where it leads.</div>
            </div>
            {allPositions.length > 0 && (
              // Capped and independently scrollable so a large position
              // vocabulary browses in place instead of pushing the manual
              // input/Go button further down every time you add one.
              <div style={{ ...chipRowStyle, maxHeight: 176, overflowY: "auto" }}>
                {allPositions.map((p) => (
                  <TagChip key={p} label={p} accent={ACCENT} onClick={() => goTo(p)} />
                ))}
              </div>
            )}
            <div>
              <label htmlFor="flow-position" style={labelStyle}>
                {allPositions.length > 0 ? "Or type a position" : "Type a position"}
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  id="flow-position"
                  list="position-options"
                  value={positionDraft}
                  onChange={(e) => setPositionDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && goTo(positionDraft)}
                  placeholder="e.g. bottom mount…"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <datalist id="position-options">
                  {allPositions.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
                <button onClick={() => goTo(positionDraft)} disabled={!positionDraft.trim()} style={{ ...primaryBtnStyle, background: `var(${ACCENT})`, minHeight: 44, opacity: positionDraft.trim() ? 1 : 0.4 }}>
                  Go
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "0 2px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 17, fontWeight: 600 }}>
                  <MapPin size={16} color={`var(${ACCENT})`} /> {currentPosition}
                </div>
                <div style={metaStyle}>
                  {tagFilteredOptions.length} option{tagFilteredOptions.length !== 1 ? "s" : ""} from here
                </div>
              </div>
              <button onClick={openComposer} style={{ ...secondaryBtnStyle, background: "transparent" }}>
                <Plus size={15} /> Add technique
              </button>
            </div>

            {tagsHere.length > 0 && (
              <div>
                <div style={chipRowStyle}>
                  {tagsHere.map((tag) => (
                    <TagChip key={tag} label={tag} accent={ACCENT} active={activeTags.includes(tag)} onClick={() => toggleTagFilter(tag)} />
                  ))}
                </div>
                {activeTags.length > 1 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                    <span style={{ fontSize: 12, color: "var(--text-dim)" }}>Match</span>
                    <SegmentedToggle
                      options={[
                        { key: "all", label: "All tags" },
                        { key: "any", label: "Any tag" },
                      ]}
                      value={tagMatchMode}
                      setValue={setTagMatchMode}
                      accent={ACCENT}
                    />
                  </div>
                )}
              </div>
            )}

            {options.length === 0 ? (
              <EmptyState
                icon={Route}
                title="Nothing logged from here yet"
                action={
                  <button onClick={openComposer} style={{ ...primaryBtnStyle, background: `var(${ACCENT})` }}>
                    <Plus size={16} /> Add a technique from here
                  </button>
                }
              >
                No techniques start from "{currentPosition}" yet.
                {giMode === "no-gi" && hiddenGiOnlyCount > 0 && (
                  <div style={{ marginTop: 6 }}>
                    ({hiddenGiOnlyCount} gi-only technique{hiddenGiOnlyCount !== 1 ? "s" : ""} hidden in No-Gi mode)
                  </div>
                )}
              </EmptyState>
            ) : tagFilteredOptions.length === 0 ? (
              <EmptyState icon={Route} compact>
                No techniques tagged that way from "{currentPosition}" yet.
              </EmptyState>
            ) : (
              tagFilteredOptions.map((t) => (
                <FlowOptionCard
                  key={t.id}
                  technique={t}
                  accent={ACCENT}
                  isOpen={openTechniqueId === t.id}
                  onToggle={() => setOpenTechniqueId(openTechniqueId === t.id ? null : t.id)}
                  onGoTo={() => goTo(t.toPosition)}
                  onToggleStar={() => toggleStar(t.id)}
                  activeTags={activeTags}
                  onTagClick={toggleTagFilter}
                />
              ))
            )}
          </>
        )}
      </PageBody>

      {showComposer && (
        <EntryComposer
          title="New technique"
          form={form}
          setForm={setForm}
          tagDraft={tagDraft}
          setTagDraft={setTagDraft}
          onAddTag={addTagFromDraft}
          onRemoveTag={removeFormTag}
          onSave={saveTechnique}
          onClose={() => setShowComposer(false)}
          showName
          namePlaceholder="Scissor sweep, cross collar choke from mount…"
          showPositions
          positionOptions={allPositions}
          showStar
          showGiOnly
          tagSuggestions={tagSuggestions}
          textLabel="Technique notes"
          textPlaceholder="Setup, grips, step-by-step details, common mistakes, when it works best..."
          saveLabel="Save technique"
          accent={ACCENT}
        />
      )}
    </>
  );
}
