import { useState, useMemo } from "react";
import { ChevronRight, RotateCcw, Plus, Flag } from "lucide-react";
import { uid } from "../lib/id.js";
import { collectPositions, techniquesFrom, normalizePosition } from "../lib/positions.js";
import EntryComposer from "../ui/EntryComposer.jsx";
import TagChip from "../ui/TagChip.jsx";
import { inputStyle, cardStyle, primaryBtnStyle, secondaryBtnStyle, ghostLinkStyle } from "../ui/styles.js";

const ACCENT = "--accent4";

const emptyForm = (position) => ({ name: "", tags: [], text: "", position: position || "", toPosition: "" });

// Lets you navigate your Techniques library as a chain: pick where you are,
// see the moves you've logged from there, follow one to where it leads, and
// repeat — instead of hunting through folders while you're trying to
// remember "what do I do from here".
export default function FlowTab({ techniques, setTechniques }) {
  const [path, setPath] = useState([]); // [{ position }]
  const [positionDraft, setPositionDraft] = useState("");
  const [openTechniqueId, setOpenTechniqueId] = useState(null);
  const [showComposer, setShowComposer] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [tagDraft, setTagDraft] = useState("");

  const allPositions = useMemo(() => collectPositions(techniques), [techniques]);
  const currentPosition = path.length ? path[path.length - 1].position : null;
  const options = useMemo(() => (currentPosition ? techniquesFrom(techniques, currentPosition) : []), [techniques, currentPosition]);

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
    const t = tagDraft.trim().toLowerCase();
    if (t && !form.tags.includes(t)) setForm((f) => ({ ...f, tags: [...f.tags, t] }));
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
        <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 0.3 }}>Live navigation</div>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 0.2, marginBottom: 12 }}>Flow</div>

        {path.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4, fontSize: 12 }}>
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
            <button onClick={startOver} style={{ ...ghostLinkStyle, marginLeft: 8, color: "var(--text-dim)" }}>
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
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
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
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{t.name}</div>
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
          textLabel="Technique notes"
          textPlaceholder="Setup, grips, step-by-step details, common mistakes, when it works best..."
          saveLabel="Save technique"
          accent={ACCENT}
        />
      )}
    </>
  );
}
