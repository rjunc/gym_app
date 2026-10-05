import { useState, useMemo } from "react";
import { Tags, X, Merge, Trash2, ChevronRight } from "lucide-react";
import { useLog } from "../lib/LogContext.js";
import useStoredState from "../lib/useStoredState.js";
import { tagLikeness } from "../lib/tags.js";
import { TAG_KINDS, tagsOf, tagInventory, usageLabel, retagRecords, goalsEmptiedBy, possibleDuplicates, pairKey } from "../lib/tagManager.js";
import { goalLabel } from "../lib/goals.js";
import { nameMap } from "../lib/search.js";
import { PageHeader, PageBody } from "../ui/Page.jsx";
import BottomSheet, { SheetHeader } from "../ui/BottomSheet.jsx";
import EmptyState from "../ui/EmptyState.jsx";
import SegmentedToggle from "../ui/SegmentedToggle.jsx";
import { cardStyle, inputStyle, labelStyle, metaStyle, eyebrowStyle, primaryBtnStyle, secondaryBtnStyle, wrapAnywhere } from "../ui/styles.js";

const SORTS = { used: "Most used", az: "A–Z" };
const records = (n) => `${n} ${n === 1 ? "record" : "records"}`;

// What a tag is renamed to: trimmed and lowercased like every tag, with no
// commas (they separate tags when typing them).
const cleanTag = (text) => text.replace(/,/g, " ").replace(/\s+/g, " ").trim().toLowerCase();

// Every tag in the app in one place: how many records use it and of which
// kinds (sessions, exercises, goals…), with tags that look like the same
// thing typed two ways ("leg" / "legs") flagged at the top to merge in one
// tap, or wave off ("Not the same", remembered on this device). Tapping a
// tag opens it to rename it, merge it into another, or delete it,
// everywhere at once — goals' rules and checklist items included, so they
// keep counting (see lib/tagManager.js). Tags only exist while something
// uses them, so there's nothing to add here: they're made by typing them on
// a record.
export default function TagManagerTab() {
  const log = useLog();
  const inventory = useMemo(() => tagInventory(log), [log]);
  const nameById = useMemo(() => nameMap([...log.exercises, ...log.routines]), [log.exercises, log.routines]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useStoredState("tags.sort", "used", (v) => v in SORTS);
  const [notSame, setNotSame] = useStoredState("tags.notDuplicates", [], Array.isArray);
  const [openTag, setOpenTag] = useState(null);

  const setters = {
    sessions: log.setSessions,
    journals: log.setJournals,
    rolls: log.setRolls,
    routines: log.setRoutines,
    exercises: log.setExercises,
    techniques: log.setTechniques,
    goals: log.setGoals,
  };
  // Renames `from` to `to` (a merge, if `to` is in use) or deletes it (`to`
  // null) in every kind of record.
  const retag = (from, to) => TAG_KINDS.forEach(({ key }) => setters[key]((prev) => retagRecords(key, prev, from, to)));

  const merge = (from, to) => {
    if (!window.confirm(`Merge "${from.tag}" into "${to.tag}"? The ${records(from.total)} tagged "${from.tag}" will be tagged "${to.tag}" instead. This can't be undone.`)) return false;
    retag(from.tag, to.tag);
    return true;
  };
  const rename = (from, to) => {
    retag(from.tag, to);
    return true;
  };
  const remove = (entry) => {
    const emptied = goalsEmptiedBy(log.goals, entry.tag);
    const warning = emptied.length
      ? `\n\n${emptied.length === 1 ? "This goal" : "These goals"} will be left with nothing to count, and stop matching sessions until you edit ${emptied.length === 1 ? "it" : "them"}:\n${emptied.map((g) => `• ${goalLabel(g, nameById)}`).join("\n")}`
      : "";
    if (!window.confirm(`Delete "${entry.tag}" from all ${records(entry.total)}? This can't be undone.${warning}`)) return false;
    retag(entry.tag, null);
    return true;
  };

  const duplicates = possibleDuplicates(inventory).filter((p) => !notSame.includes(pairKey(p.from.tag, p.to.tag)));
  const q = query.trim().toLowerCase();
  const shown = (q ? inventory.filter((t) => t.tag.includes(q)) : inventory).slice().sort(sort === "az" ? (a, b) => a.tag.localeCompare(b.tag) : () => 0);
  const open = inventory.find((t) => t.tag === openTag);
  const recordCount = useMemo(() => TAG_KINDS.reduce((n, { key }) => n + (log[key] || []).filter((r) => tagsOf(key, r).length > 0).length, 0), [log]);

  return (
    <>
      <PageHeader eyebrow="Your data" title="Tag manager">
        {inventory.length > 0 && (
          <>
            <div style={metaStyle}>
              {inventory.length} {inventory.length === 1 ? "tag" : "tags"} across {records(recordCount)}
            </div>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a tag…" aria-label="Find a tag" style={inputStyle} />
          </>
        )}
      </PageHeader>

      <PageBody>
        {inventory.length === 0 ? (
          <EmptyState icon={Tags} title="No tags yet">
            Tags you add to sessions, journals, mat sessions, routines, exercises and techniques show up here, to rename, merge or delete everywhere at once.
          </EmptyState>
        ) : (
          <>
            {!q && duplicates.length > 0 && (
              <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Look alike</div>
                  <div style={{ ...metaStyle, marginTop: 2 }}>These might be the same tag typed two ways. Merging keeps the more used one.</div>
                </div>
                {duplicates.map(({ from, to }) => (
                  <div key={pairKey(from.tag, to.tag)} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 140, fontSize: 14, ...wrapAnywhere }}>
                      <b>{from.tag}</b> <span style={metaStyle}>({from.total})</span> → <b>{to.tag}</b> <span style={metaStyle}>({to.total})</span>
                    </div>
                    <button onClick={() => merge(from, to)} style={{ ...secondaryBtnStyle, minHeight: 34, padding: "0 12px", fontSize: 13 }}>
                      <Merge size={14} /> Merge
                    </button>
                    <button
                      onClick={() => setNotSame((list) => [...list, pairKey(from.tag, to.tag)])}
                      aria-label={`${from.tag} and ${to.tag} are different tags`}
                      title="Not the same"
                      className="icon-btn"
                      style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", display: "flex", padding: 6, borderRadius: 8 }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={metaStyle}>Sort</span>
              <SegmentedToggle options={Object.entries(SORTS).map(([key, label]) => ({ key, label }))} value={sort} setValue={setSort} />
            </div>

            {shown.length === 0 ? (
              <div style={{ ...metaStyle, textAlign: "center", padding: "12px 0" }}>No tags match "{query.trim()}".</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {shown.map((t) => (
                  <button
                    key={t.tag}
                    onClick={() => setOpenTag(t.tag)}
                    className="card-click"
                    style={{ ...cardStyle, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, textAlign: "left", cursor: "pointer", color: "var(--text)", width: "100%" }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, ...wrapAnywhere }}>{t.tag}</div>
                      <div style={{ ...metaStyle, marginTop: 2 }}>{usageLabel(t.counts)}</div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-dim)" }}>{t.total}</span>
                    <ChevronRight size={16} style={{ color: "var(--text-faint)", flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </PageBody>

      {open && (
        <TagSheet
          key={open.tag}
          entry={open}
          inventory={inventory}
          onRename={(to) => rename(open, to) && setOpenTag(null)}
          onMerge={(to) => merge(open, to) && setOpenTag(null)}
          onDelete={() => remove(open) && setOpenTag(null)}
          onClose={() => setOpenTag(null)}
        />
      )}
    </>
  );
}

// One tag: where it's used, and renaming it (or merging it, when the new name
// is already a tag), merging it into a lookalike, or deleting it everywhere.
function TagSheet({ entry, inventory, onRename, onMerge, onDelete, onClose }) {
  const [draft, setDraft] = useState(entry.tag);
  const target = cleanTag(draft);
  const existing = target !== entry.tag ? inventory.find((t) => t.tag === target) : null;
  const canSave = target !== "" && target !== entry.tag;
  const save = () => {
    if (!canSave) return;
    if (existing) onMerge(existing);
    else onRename(target);
  };
  const lookalikes = inventory.filter((t) => tagLikeness(entry.tag, t.tag) !== null);

  return (
    <BottomSheet onClose={onClose} header={<SheetHeader eyebrow="Tag" title={entry.tag} meta={`Used by ${records(entry.total)}`} onClose={onClose} />}>
      <div>
        <span style={labelStyle}>Used on</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {TAG_KINDS.filter((k) => entry.counts[k.key]).map((k) => (
            <div key={k.key} style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
              <span style={{ textTransform: "capitalize" }}>{k.many}</span>
              <span style={{ fontWeight: 600 }}>{entry.counts[k.key]}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label style={labelStyle} htmlFor="tag-rename">
          Rename
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            id="tag-rename"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={save} disabled={!canSave} style={{ ...primaryBtnStyle, minHeight: 44, opacity: canSave ? 1 : 0.4, whiteSpace: "nowrap" }}>
            {existing ? "Merge" : "Rename"}
          </button>
        </div>
        <div style={{ ...metaStyle, marginTop: 6, lineHeight: 1.45 }}>
          {existing
            ? `"${existing.tag}" is already a tag (${records(existing.total)}). Merging tags everything with "${entry.tag}" as "${existing.tag}" instead, once each.`
            : `Changes it on all ${records(entry.total)}, goals included, so they keep counting.`}
        </div>
      </div>

      {lookalikes.length > 0 && (
        <div>
          <span style={labelStyle}>Looks like</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {lookalikes.map((t) => (
              <div key={t.tag} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ flex: 1, fontSize: 14, ...wrapAnywhere }}>
                  <b>{t.tag}</b> <span style={metaStyle}>({t.total})</span>
                </span>
                <button onClick={() => onMerge(t)} style={{ ...secondaryBtnStyle, minHeight: 34, padding: "0 12px", fontSize: 13 }}>
                  <Merge size={14} /> Merge into {t.tag}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
        <div style={{ ...eyebrowStyle, color: "var(--danger)", marginBottom: 8 }}>Delete</div>
        <button onClick={onDelete} style={{ ...secondaryBtnStyle, color: "var(--danger)", minHeight: 40 }}>
          <Trash2 size={15} /> Delete from all {records(entry.total)}
        </button>
      </div>
    </BottomSheet>
  );
}
