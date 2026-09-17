import { X } from "lucide-react";
import { labelStyle, inputStyle, tagPillStyle, primaryBtnStyle, secondaryBtnStyle } from "./styles.js";

export default function EntryComposer({
  title,
  form,
  setForm,
  tagDraft,
  setTagDraft,
  onAddTag,
  onRemoveTag,
  onSave,
  onClose,
  showDate,
  showName,
  // Which key in `form` the optional name/title field reads and writes, and
  // how it's labeled/placeheld — lets Routines (name) and Sessions/Journals
  // (title) share this one field instead of each needing their own.
  nameField = "name",
  nameLabel = "Name",
  namePlaceholder = "",
  showFolder,
  folderOptions,
  showPositions,
  positionOptions = [],
  textLabel,
  textPlaceholder,
  saveLabel,
  accent,
}) {
  const accentVar = accent || "--accent";
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", zIndex: 10 }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          borderTop: "1px solid var(--border)",
          borderRadius: "16px 16px 0 0",
          width: "100%",
          maxHeight: "88%",
          display: "flex",
          flexDirection: "column",
          padding: 18,
          gap: 12,
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        {showName && (
          <div>
            <label style={labelStyle}>{nameLabel}</label>
            <input
              value={form[nameField] || ""}
              onChange={(e) => setForm((f) => ({ ...f, [nameField]: e.target.value }))}
              placeholder={namePlaceholder}
              style={inputStyle}
            />
          </div>
        )}

        {showDate && (
          // minWidth: 0 overrides flexbox's default "don't shrink below
          // content size" on this column's items — without it, a native
          // date-picker input's intrinsic width can force this whole row
          // wider than the sheet, overflowing off-screen on mobile.
          <div style={{ minWidth: 0 }}>
            <label style={labelStyle}>Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              style={{
                ...inputStyle,
                maxWidth: "100%",
                display: "block",
                // iOS Safari renders type="date" with its own native chrome
                // that can ignore a CSS width entirely; stripping the native
                // appearance makes it size like our other custom inputs
                // instead. The tap-to-open-picker behavior is unaffected —
                // this only removes the default visual chrome.
                WebkitAppearance: "none",
                appearance: "none",
              }}
            />
          </div>
        )}

        {showFolder && (
          <div>
            <label style={labelStyle}>Folder</label>
            <select
              value={form.folderId || ""}
              onChange={(e) => setForm((f) => ({ ...f, folderId: e.target.value || null }))}
              style={{ ...inputStyle, appearance: "auto" }}
            >
              {folderOptions.map((o) => (
                <option key={o.id || "root"} value={o.id || ""}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {showPositions && (
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label style={labelStyle}>From position</label>
              <input
                list="position-options"
                value={form.position || ""}
                onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                placeholder="Bottom closed guard…"
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label style={labelStyle}>Leads to</label>
              <input
                list="position-options"
                value={form.toPosition || ""}
                onChange={(e) => setForm((f) => ({ ...f, toPosition: e.target.value }))}
                placeholder="Top side control…"
                style={inputStyle}
              />
            </div>
            <datalist id="position-options">
              {positionOptions.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>
        )}

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
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <label style={labelStyle}>{textLabel}</label>
          <textarea
            value={form.text}
            onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
            placeholder={textPlaceholder}
            style={{ ...inputStyle, fontFamily: "'IBM Plex Mono', monospace", minHeight: 150, resize: "vertical", lineHeight: 1.5 }}
          />
        </div>

        <button onClick={onSave} style={{ ...primaryBtnStyle, background: `var(${accentVar})`, justifyContent: "center", padding: "12px 0" }}>
          {saveLabel}
        </button>
      </div>
    </div>
  );
}
