import { X } from "lucide-react";
import { searchTags, addTagsFromDraft } from "../lib/tags.js";
import TagChip from "./TagChip.jsx";
import { labelStyle, inputStyle, tagPillStyle, secondaryBtnStyle } from "./styles.js";

export default function TagsField({ form, setForm, tagDraft, setTagDraft, onAddTag, onRemoveTag, tagSuggestions, accentVar }) {
  // Suggest against the tag being typed right now (after the last comma), and
  // never suggest one that's already on the entry. `tagSuggestions` arrive
  // most-used first (see tagUsage); typing keeps that order but puts tags that
  // start with the query ahead of ones that merely contain it.
  const draftPrefix = tagDraft.slice(0, tagDraft.lastIndexOf(",") + 1);
  const draftQuery = tagDraft.slice(draftPrefix.length).trim();
  const unused = tagSuggestions.filter((s) => !form.tags.includes(s.tag));
  const suggestions = (draftQuery ? searchTags(unused, draftQuery) : unused).slice(0, 8);

  const pickSuggestion = (tag) => {
    setForm((f) => ({ ...f, tags: addTagsFromDraft(f.tags, tag) }));
    setTagDraft(draftPrefix); // keep any earlier, still-unconfirmed tags in the box
  };

  return (
    <div>
      <label style={labelStyle}>Tags</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: form.tags.length ? 8 : 0 }}>
        {form.tags.map((t) => (
          <span key={t} style={{ ...tagPillStyle, background: `var(${accentVar}-dim)`, borderColor: `var(${accentVar})`, color: `var(${accentVar})` }}>
            {t}
            <button onClick={() => onRemoveTag(t)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", display: "flex" }}>
              <X size={11} />
            </button>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={tagDraft}
          onChange={(e) => setTagDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              onAddTag();
            }
          }}
          placeholder="push, plyometrics, legs…"
          style={{ ...inputStyle, flex: 1 }}
        />
        <button onClick={onAddTag} style={secondaryBtnStyle}>
          Add
        </button>
      </div>
      {suggestions.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <span style={{ ...labelStyle, marginBottom: 4 }}>{draftQuery ? "Matching" : "Most used"}</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {suggestions.map(({ tag }) => (
              <TagChip key={tag} small accent={accentVar} onClick={() => pickSuggestion(tag)} label={tag} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
