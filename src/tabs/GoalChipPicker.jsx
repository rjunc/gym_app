import { useState } from "react";
import { Plus, Dumbbell } from "lucide-react";
import { searchTags } from "../lib/tags.js";
import { compareByUsage } from "../lib/links.js";
import { pickerMatches, exerciseSearchFields } from "../lib/search.js";
import { useLog } from "../lib/LogContext.js";
import TagChip from "../ui/TagChip.jsx";
import PagePicker from "../ui/PagePicker.jsx";
import DidYouMean from "../ui/DidYouMean.jsx";
import { GOAL_ACCENT } from "./GoalParts.jsx";
import { inputStyle, labelStyle, secondaryBtnStyle, chipRowStyle } from "../ui/styles.js";

// The box for adding tags and Library exercises to a goal (a rule's chips,
// or a checklist's items). Typing suggests matching tags and exercises;
// Enter adds what's typed as a tag (commas add several). With nothing typed
// and `empty` set, the most-used tags are offered to start from. A typed tag
// that looks like a slip for one in use gets a "Did you mean" (see
// DidYouMean). `browsing`
// opens the Library to pick exercises from, until `onDoneBrowsing`.
//   addedTags, addedExerciseIds   already there, so not suggested again
//   onAddTags(text)               the typed text, or a suggested tag
//   onAddExercise(id), onRemoveExercise(id)
//   tagSuggestions                tagUsage output, most used first
export default function GoalChipPicker({ addedTags, addedExerciseIds, onAddTags, onAddExercise, onRemoveExercise, tagSuggestions, exercises, usage, empty, browsing, onDoneBrowsing }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const unusedTags = tagSuggestions.filter((s) => !addedTags.includes(s.tag));
  // Most-used tags to start from; matching ones once typing.
  const tagHits = q ? searchTags(unusedTags, q).slice(0, 6) : empty ? unusedTags.slice(0, 8) : [];
  // Exercises match what the Library's search box would (see pickerMatches).
  const exerciseFolders = useLog()?.exerciseFolders || [];
  const exerciseHits = pickerMatches(
    exercises.filter((e) => !addedExerciseIds.includes(e.id)),
    query,
    (e) => exerciseSearchFields(e, exerciseFolders),
    { compare: compareByUsage(usage || new Map()), limit: 6 }
  );

  const addTags = (text) => {
    onAddTags(text);
    setQuery("");
  };
  const addExercise = (id) => {
    onAddExercise(id);
    setQuery("");
  };

  return (
    <>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === ",") && q) {
              e.preventDefault();
              addTags(query);
            }
          }}
          placeholder={empty ? "Add a tag or exercise…" : "Add another…"}
          style={{ ...inputStyle, flex: 1 }}
        />
        <button onClick={() => q && addTags(query)} disabled={!q} style={{ ...secondaryBtnStyle, minHeight: 44, padding: "0 14px", opacity: q ? 1 : 0.5 }}>
          <Plus size={15} /> Tag
        </button>
      </div>

      {(tagHits.length > 0 || exerciseHits.length > 0) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tagHits.length > 0 && (
            <div>
              <span style={{ ...labelStyle, fontWeight: 500, marginBottom: 6 }}>{q ? "Tags" : "Most used tags"}</span>
              <div style={chipRowStyle}>
                {tagHits.map(({ tag }) => (
                  <TagChip key={tag} small accent={GOAL_ACCENT} label={tag} onClick={() => addTags(tag)} />
                ))}
              </div>
            </div>
          )}
          {exerciseHits.length > 0 && (
            <div>
              <span style={{ ...labelStyle, fontWeight: 500, marginBottom: 6 }}>Exercises</span>
              <div style={chipRowStyle}>
                {exerciseHits.map((e) => (
                  <TagChip key={e.id} small accent={GOAL_ACCENT} label={<><Dumbbell size={11} /> {e.name}</>} onClick={() => addExercise(e.id)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <DidYouMean
        query={q}
        vocabulary={tagSuggestions.map((s) => s.tag)}
        exclude={[...addedTags, ...tagHits.map((s) => s.tag)]}
        onPick={addTags}
        accent={GOAL_ACCENT}
      />

      {browsing && (
        <PagePicker
          kind="exercises"
          addedIds={addedExerciseIds}
          onAdd={(exercise) => addExercise(exercise.id)}
          onRemove={onRemoveExercise}
          onDone={onDoneBrowsing}
          initialQuery={query.trim()}
        />
      )}
    </>
  );
}
