import { Star } from "lucide-react";
import { labelStyle, inputStyle } from "./styles.js";

export function NameField({ form, setForm, nameField, nameLabel, namePlaceholder }) {
  return (
    <div>
      <label style={labelStyle}>{nameLabel}</label>
      <input
        value={form[nameField] || ""}
        onChange={(e) => setForm((f) => ({ ...f, [nameField]: e.target.value }))}
        placeholder={namePlaceholder}
        style={inputStyle}
      />
    </div>
  );
}

export function DateField({ form, setForm }) {
  return (
    // minWidth: 0 overrides flexbox's default "don't shrink below content
    // size" on this column's items — without it, a native date-picker
    // input's intrinsic width can force this whole row wider than the
    // sheet, overflowing off-screen on mobile.
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
          // iOS Safari renders type="date" with its own native chrome that
          // can ignore a CSS width entirely; stripping the native appearance
          // makes it size like our other custom inputs instead. The
          // tap-to-open-picker behavior is unaffected — this only removes
          // the default visual chrome.
          WebkitAppearance: "none",
          appearance: "none",
        }}
      />
    </div>
  );
}

export function FolderField({ form, setForm, folderOptions }) {
  return (
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
  );
}

export function PositionsField({ form, setForm, positionOptions }) {
  return (
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
  );
}

export function StarField({ form, setForm }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
      <input
        type="checkbox"
        checked={!!form.starred}
        onChange={(e) => setForm((f) => ({ ...f, starred: e.target.checked }))}
        style={{ width: 16, height: 16, accentColor: "var(--accent)" }}
      />
      <Star size={14} color="var(--accent)" fill={form.starred ? "var(--accent)" : "none"} />
      Go-to — sorts to the top of its position/list
    </label>
  );
}

export function GiOnlyField({ form, setForm, accentVar }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
      <input
        type="checkbox"
        checked={!!form.giOnly}
        onChange={(e) => setForm((f) => ({ ...f, giOnly: e.target.checked }))}
        style={{ width: 16, height: 16, accentColor: `var(${accentVar})` }}
      />
      Gi only — won't work without the gi
    </label>
  );
}

export function PrescriptionField({ form, setForm }) {
  return (
    <div>
      <label style={labelStyle}>Prescription (optional)</label>
      <input
        value={form.prescription || ""}
        onChange={(e) => setForm((f) => ({ ...f, prescription: e.target.value }))}
        placeholder="3x8, 30s hold, 5 rounds…"
        style={inputStyle}
      />
    </div>
  );
}

export function ActiveField({ form, setForm, accentVar, activeLabel }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
      <input
        type="checkbox"
        checked={form.active !== false}
        onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
        style={{ width: 16, height: 16, accentColor: `var(${accentVar})` }}
      />
      {activeLabel}
    </label>
  );
}
