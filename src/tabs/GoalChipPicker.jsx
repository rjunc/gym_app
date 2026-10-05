import { useState } from "react";
import { Plus, Dumbbell, BookOpen, LayoutGrid } from "lucide-react";
import { searchTags } from "../lib/tags.js";
import { compareByUsage } from "../lib/links.js";
import { pickerMatches, exerciseSearchFields, folderItemSearchFields, nameMap } from "../lib/search.js";
import { useLog } from "../lib/LogContext.js";
import TagChip from "../ui/TagChip.jsx";
import PagePicker from "../ui/PagePicker.jsx";
import DidYouMean from "../ui/DidYouMean.jsx";
import { GOAL_ACCENT } from "./GoalParts.jsx";
import { inputStyle, labelStyle, secondaryBtnStyle, chipRowStyle, ghostLinkStyle } from "../ui/styles.js";

// The box for adding tags, Library exercises and routines to a goal (a
// rule's chips, or a checklist's items). Typing suggests matching tags,
// exercises and routines; Enter adds what's typed as a tag (commas add
// several). With nothing typed and `empty` set, the most-used tags are
// offered to start from. A typed tag that looks like a slip for one in use
// gets a "Did you mean" (see DidYouMean). `browsing` ("exercises" or
// "routines", see BrowseButtons) opens that page to pick from, until
// `onDoneBrowsing`.
//   added          { tags, exerciseIds, routineIds } already there, so not
//                  suggested again
//   onAddTags(text)               the typed text, or a suggested tag
//   onAdd(kind, id), onRemove(kind, id)   kind "exercises" or "routines"
//   tagSuggestions                tagUsage output, most used first
export default function GoalChipPicker({ added, onAddTags, onAdd, onRemove, tagSuggestions, empty, browsing, onDoneBrowsing }) {
  const log = useLog();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const unusedTags = tagSuggestions.filter((s) => !added.tags.includes(s.tag));
  // Most-used tags to start from; matching ones once typing.
  const tagHits = q ? searchTags(unusedTags, q).slice(0, 6) : empty ? unusedTags.slice(0, 8) : [];
  // Exercises and routines match what their pages' search boxes would (see
  // pickerMatches), most used first.
  const exerciseHits = pickerMatches(
    log.exercises.filter((e) => !added.exerciseIds.includes(e.id)),
    query,
    (e) => exerciseSearchFields(e, log.exerciseFolders),
    { compare: compareByUsage(log.exerciseUsage || new Map()), limit: 6 }
  );
  const exerciseNameById = nameMap(log.exercises);
  const routineHits = pickerMatches(
    log.routines.filter((r) => !added.routineIds.includes(r.id)),
    query,
    (r) => folderItemSearchFields(r, log.folders, exerciseNameById),
    { compare: compareByUsage(log.routineUsage || new Map()), limit: 4 }
  );

  const addTags = (text) => {
    onAddTags(text);
    setQuery("");
  };
  const add = (kind, id) => {
    onAdd(kind, id);
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
          placeholder={empty ? "Add a tag, exercise or routine…" : "Add another…"}
          style={{ ...inputStyle, flex: 1 }}
        />
        <button onClick={() => q && addTags(query)} disabled={!q} style={{ ...secondaryBtnStyle, minHeight: 44, padding: "0 14px", opacity: q ? 1 : 0.5 }}>
          <Plus size={15} /> Tag
        </button>
      </div>

      {(tagHits.length > 0 || exerciseHits.length > 0 || routineHits.length > 0) && (
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
                  <TagChip key={e.id} small accent={GOAL_ACCENT} label={<><Dumbbell size={11} /> {e.name}</>} onClick={() => add("exercises", e.id)} />
                ))}
              </div>
            </div>
          )}
          {routineHits.length > 0 && (
            <div>
              <span style={{ ...labelStyle, fontWeight: 500, marginBottom: 6 }}>Routines</span>
              <div style={chipRowStyle}>
                {routineHits.map((r) => (
                  <TagChip key={r.id} small accent={GOAL_ACCENT} label={<><BookOpen size={11} /> {r.name}</>} onClick={() => add("routines", r.id)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <DidYouMean
        query={q}
        vocabulary={tagSuggestions.map((s) => s.tag)}
        exclude={[...added.tags, ...tagHits.map((s) => s.tag)]}
        onPick={addTags}
        accent={GOAL_ACCENT}
      />

      {browsing && (
        <PagePicker
          kind={browsing}
          addedIds={browsing === "routines" ? added.routineIds : added.exerciseIds}
          onAdd={(record) => add(browsing, record.id)}
          onRemove={(id) => onRemove(browsing, id)}
          onDone={onDoneBrowsing}
          initialQuery={query.trim()}
        />
      )}
    </>
  );
}

// The Browse links over a rule or checklist: the Library's exercises, or
// the Routines page, to pick from (see GoalChipPicker's `browsing`).
export function BrowseButtons({ onBrowse }) {
  const style = { ...ghostLinkStyle, fontSize: 12, color: `var(${GOAL_ACCENT})` };
  return (
    <>
      <button onClick={() => onBrowse("exercises")} style={style} title="Browse exercises">
        <LayoutGrid size={13} /> Exercises
      </button>
      <button onClick={() => onBrowse("routines")} style={style} title="Browse routines">
        <BookOpen size={13} /> Routines
      </button>
    </>
  );
}
