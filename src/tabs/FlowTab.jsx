import { useState, useMemo } from "react";
import { ChevronRight, RotateCcw, Plus, Flag, Shirt } from "lucide-react";
import { uid } from "../lib/id.js";
import { collectPositions, techniquesFrom, normalizePosition } from "../lib/positions.js";
import { tagCounts, addTagsFromDraft } from "../lib/tags.js";
import EntryComposer from "../ui/EntryComposer.jsx";
import TagChip from "../ui/TagChip.jsx";
import GiModeToggle from "../ui/GiModeToggle.jsx";
import { inputStyle, cardStyle, primaryBtnStyle, secondaryBtnStyle, ghostLinkStyle } from "../ui/styles.js";

const ACCENT = "--accent4";

const emptyForm = (position) => ({ name: "", tags: [], text: "", position: position || "", toPosition: "", giOnly: false });

// Lets you navigate your Techniques library as a chain: pick where you are,
// see the moves you've logged from there, follow one to where it leads, and
// repeat — instead of hunting through folders while you're trying to
// remember "what do I do from here".
export default function FlowTab({ techniques, setTechniques }) {
  const [path, setPath] = useState([]); // [{ position }]
  const [positionDraft, setPositionDraft] = useState("");
  const [giMode, setGiMode] = useState("gi");
  const [openTechniqueId, setOpenTechniqueId] = useState(null);
  const [showComposer, setShowComposer] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [tagDraft, setTagDraft] = useState("");

  const allPositions = useMemo(() => collectPositions(techniques), [techniques]);
  const tagSuggestions = useMemo(() => tagCounts(techniques), [techniques]);
  const currentPosition = path.length ? path[path.length - 1].position : null;
  const optionsAtPosition = useMemo(
    () => (currentPosition ? techniquesFrom(techniques, currentPosition) : []),
    [techniques, currentPosition]
  );
  // In No-Gi mode, don't offer moves that only work with the gi — they're
  // not a real option right now.
  const options = useMemo(
    () => (giMode === "no-gi" ? optionsAtPosition.filter((t) => !t.giOnly) : optionsAtPosition),
    [optionsAtPosition, giMode]
  );
  const hiddenGiOnlyCount = optionsAtPosition.length - options.length;

  const goTo = (position) => {
    const clean = position.trim();
    if (!clean) return;
    setPath((prev) => [...prev, { position: clean }]);
    setPositionDraft("");
    setOpenTechniqueId(null);
  };

  const jumpToStep = (index) => {
    setPath((prev) => prev.slice(0, index + 1));
    setOpenTechniqueId(null);
  };

  const startOver = () => {
    setPath([]);
    setOpenTechniqueId(null);
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
    if (!form.name.trim()) return;
    setTechniques((prev) => [{ id: uid(), ...form, name: form.name.trim(), folderId: null }, ...prev]);
    setShowComposer(false);
  };

  return (
    <>
      <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 0.3 }}>Live navigation</div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 0.2 }}>Flow</div>
          </div>
          <GiModeToggle mode={giMode} setMode={setGiMode} accent={ACCENT} />
        </div>

        {path.length > 0 && (
          <div>
            {/* Capped and independently scrollable so a long chain browses
                in place instead of growing this fixed, non-scrolling header
                without bound and crowding out the options list below. */}
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4, fontSize: 12, maxHeight: 88, overflowY: "auto" }}>
              {path.map((step, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {i > 0 && <ChevronRight size={12} color="var(--text-dim)" />}
                  <button
                    onClick={() => jumpToStep(i)}
                    style={{
                      ...ghostLinkStyle,
                      color: i === path.length - 1 ? `var(${ACCENT})` : "var(--text-dim)",
                      fontWeight: i === path.length - 1 ? 700 : 600,
                    }}
                  >
                    {step.position}
                  </button>
                </span>
              ))}
            </div>
            {/* Kept outside the scrollable trail above so it's always
                reachable no matter how long the chain gets. */}
            <button onClick={startOver} style={{ ...ghostLinkStyle, marginTop: 4, color: "var(--text-dim)" }}>
              <RotateCcw size={11} /> Start over
            </button>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 18px" }}>
        {!currentPosition ? (
          <>
            <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 12 }}>Where are you starting from?</div>
            {allPositions.length > 0 && (
              // Capped and independently scrollable so a large position
              // vocabulary browses in place instead of pushing the manual
              // input/Go button further down every time you add one.
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14, maxHeight: 88, overflowY: "auto" }}>
                {allPositions.map((p) => (
                  <TagChip key={p} label={p} accent={ACCENT} onClick={() => goTo(p)} />
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <input
                list="position-options"
                value={positionDraft}
                onChange={(e) => setPositionDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && goTo(positionDraft)}
                placeholder="Or type a position, e.g. bottom mount…"
                style={{ ...inputStyle, flex: 1 }}
              />
              <datalist id="position-options">
                {allPositions.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
              <button onClick={() => goTo(positionDraft)} style={secondaryBtnStyle}>
                Go
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
                {options.length} option{options.length !== 1 ? "s" : ""} from here
              </div>
              <button onClick={openComposer} style={{ ...ghostLinkStyle, color: `var(${ACCENT})` }}>
                <Plus size={13} /> Add technique here
              </button>
            </div>

            {options.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--text-dim)", padding: "24px 10px", fontSize: 13 }}>
                No techniques logged starting from "{currentPosition}" yet.
                {giMode === "no-gi" && hiddenGiOnlyCount > 0 && (
                  <div style={{ marginTop: 6 }}>
                    ({hiddenGiOnlyCount} gi-only technique{hiddenGiOnlyCount !== 1 ? "s" : ""} hidden in No-Gi mode)
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {options.map((t) => {
                  const isOpen = openTechniqueId === t.id;
                  const hasNext = normalizePosition(t.toPosition) !== "";
                  return (
                    <div key={t.id} style={cardStyle}>
                      <div
                        onClick={() => setOpenTechniqueId(isOpen ? null : t.id)}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, cursor: "pointer" }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{t.name}</div>
                          {t.giOnly && (
                            <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, color: "var(--danger)" }}>
                              <Shirt size={11} /> GI ONLY
                            </span>
                          )}
                        </div>
                        {t.tags && t.tags.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, justifyContent: "flex-end" }}>
                            {t.tags.slice(0, 3).map((tag) => (
                              <TagChip key={tag} label={tag} small accent={ACCENT} />
                            ))}
                          </div>
                        )}
                      </div>

                      {isOpen && t.text && (
                        <p
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: 13,
                            lineHeight: 1.55,
                            color: "var(--text)",
                            marginTop: 8,
                            marginBottom: 0,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {t.text}
                        </p>
                      )}

                      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                        {hasNext ? (
                          <button onClick={() => goTo(t.toPosition)} style={{ ...primaryBtnStyle, background: `var(${ACCENT})`, flex: 1, justifyContent: "center" }}>
                            Go to "{t.toPosition}" <ChevronRight size={14} />
                          </button>
                        ) : (
                          <div
                            style={{
                              ...primaryBtnStyle,
                              background: "var(--surface-2)",
                              color: "var(--text-dim)",
                              flex: 1,
                              justifyContent: "center",
                              cursor: "default",
                            }}
                          >
                            <Flag size={13} /> Finish (no next position set)
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

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
