import { useState, useMemo } from "react";
import { Folder, ChevronRight } from "lucide-react";
import { routinePickerView } from "../lib/routines.js";
import { compareByUsage } from "../lib/links.js";
import { folderPath, itemCountUnder } from "../lib/folders.js";
import BottomSheet from "./BottomSheet.jsx";
import Breadcrumb from "./Breadcrumb.jsx";
import TagFilter from "./TagFilter.jsx";
import PickerCard from "./PickerCard.jsx";
import { cardStyle, inputStyle, labelStyle, primaryBtnStyle } from "./styles.js";

const MOST_USED = 3;

// Browse routines to add to an entry, laid out like the Routines page, over
// the entry form: the most used few up top, then folders to tap into, with a
// search box and tag filter that search every folder at once. Each routine
// is a PickerCard — tap it to preview its exercises and full text, Add to
// copy it into the form (onAdd). Stays open so several can be added; Done
// (or tapping outside) closes it. `addedIds` are the routines already in the
// form; `usage` is routineUsageCounts.
export default function RoutinePicker({ routines, folders, exerciseNameById = new Map(), usage = new Map(), addedIds = [], onAdd, onClose, accent = "--accent" }) {
  const [folderId, setFolderId] = useState(null);
  const [query, setQuery] = useState("");
  const [tags, setTags] = useState([]);
  const [tagMode, setTagMode] = useState("all");

  const view = useMemo(
    () => routinePickerView({ routines, folders, folderId, query, tags, tagMode, usage, exerciseNameById }),
    [routines, folders, folderId, query, tags, tagMode, usage, exerciseNameById]
  );
  // The few you run most, ranked like the pickers everywhere (last 30 days,
  // then all-time); only routines you've actually used.
  const mostUsed = useMemo(
    () => routines.filter((r) => (usage.get(r.id)?.total || 0) > 0).sort(compareByUsage(usage)).slice(0, MOST_USED),
    [routines, usage]
  );
  const showMostUsed = !view.filtering && folderId === null && mostUsed.length > 0;
  const hasTags = routines.some((r) => (r.tags || []).length > 0);
  const pathOf = (r) => folderPath(folders, r.folderId).map((f) => f.name).join(" / ") || "Top level";

  const card = (r, { showPath }) => {
    const exerciseNames = (r.exerciseIds || []).map((id) => exerciseNameById.get(id)).filter(Boolean);
    const uses = (usage.get(r.id) || { total: 0 }).total;
    return (
      <PickerCard
        key={r.id}
        title={r.name}
        subtitle={showPath ? pathOf(r) : undefined}
        tags={r.tags || []}
        meta={[exerciseNames.join(", "), uses > 0 ? `Used in ${uses} session${uses === 1 ? "" : "s"}` : ""].filter(Boolean).join(" · ")}
        accent={accent}
        added={addedIds.includes(r.id)}
        onAdd={() => onAdd(r.id)}
        preview={
          r.text || exerciseNames.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {exerciseNames.length > 0 && (
                <div>
                  <span style={labelStyle}>Exercises</span>
                  {exerciseNames.map((name, i) => (
                    <div key={i} style={{ fontSize: 13, fontWeight: 600, color: `var(${accent})` }}>
                      {name}
                    </div>
                  ))}
                </div>
              )}
              {r.text && (
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, lineHeight: 1.55, margin: 0, whiteSpace: "pre-wrap" }}>{r.text}</p>
              )}
            </div>
          ) : undefined
        }
      />
    );
  };

  return (
    <BottomSheet onClose={onClose} gap={12}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>Browse routines</div>
        <button onClick={onClose} style={{ ...primaryBtnStyle, background: `var(${accent})`, padding: "7px 14px" }}>
          Done
        </button>
      </div>

      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search routines, folders, exercises…" style={inputStyle} />
      {hasTags && (
        <TagFilter
          entries={routines}
          activeTags={tags}
          onToggle={(t) => setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))}
          matchMode={tagMode}
          setMatchMode={setTagMode}
          accent={accent}
        />
      )}

      {routines.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--text-dim)", padding: "12px 0" }}>No routines yet. Make some on the Routines page.</div>
      ) : (
        <>
          {showMostUsed && (
            <div>
              <span style={labelStyle}>Most used</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{mostUsed.map((r) => card(r, { showPath: true }))}</div>
            </div>
          )}

          <div>
            {view.filtering ? (
              <span style={labelStyle}>
                {view.items.length} match{view.items.length === 1 ? "" : "es"}
              </span>
            ) : (
              <Breadcrumb path={folderPath(folders, folderId)} onNavigate={setFolderId} />
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {view.subfolders.map((f) => {
                const count = itemCountUnder(folders, routines, f.id);
                return (
                  <button
                    key={f.id}
                    onClick={() => setFolderId(f.id)}
                    style={{ ...cardStyle, background: "var(--surface-2)", padding: 10, display: "flex", alignItems: "center", gap: 10, cursor: "pointer", color: "var(--text)", textAlign: "left", width: "100%" }}
                  >
                    <span style={{ background: `var(${accent}-dim)`, borderRadius: 8, padding: 7, display: "flex" }}>
                      <Folder size={15} color={`var(${accent})`} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontWeight: 600, fontSize: 13 }}>{f.name}</span>
                      <span style={{ display: "block", fontSize: 11, color: "var(--text-dim)" }}>
                        {count} routine{count === 1 ? "" : "s"}
                      </span>
                    </span>
                    <ChevronRight size={15} color="var(--text-dim)" />
                  </button>
                );
              })}
              {view.items.map((r) => card(r, { showPath: view.filtering }))}
              {view.subfolders.length === 0 && view.items.length === 0 && (
                <div style={{ fontSize: 13, color: "var(--text-dim)", padding: "8px 0" }}>{view.filtering ? "No routines match." : "This folder is empty."}</div>
              )}
            </div>
          </div>
        </>
      )}
    </BottomSheet>
  );
}
