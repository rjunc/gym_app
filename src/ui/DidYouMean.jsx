import { similarTags } from "../lib/tags.js";
import TagChip from "./TagChip.jsx";
import { metaStyle, chipRowStyle } from "./styles.js";

// A "Did you mean" line under a tag box: the existing tags that look like a
// slip for the one being typed (see similarTags), one tap to use instead.
// Nothing when `query` is already a tag or nothing looks like it. `vocabulary`
// is every tag, most used first; `exclude` the tags not to offer (already
// added, or already suggested just above).
export default function DidYouMean({ query, vocabulary, exclude = [], onPick, accent }) {
  const tags = similarTags(query, vocabulary).filter((t) => !exclude.includes(t));
  if (tags.length === 0) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
      <span style={{ ...metaStyle, fontWeight: 600 }}>Did you mean</span>
      <div style={chipRowStyle}>
        {tags.map((tag) => (
          <TagChip key={tag} small active accent={accent} label={tag} onClick={() => onPick(tag)} />
        ))}
      </div>
    </div>
  );
}
