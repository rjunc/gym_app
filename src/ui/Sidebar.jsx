import { X, Home, Dumbbell, Swords, ClipboardList, NotebookPen, BookOpen, Layers, Route, Target, Tags, Download, Upload, LogOut, FlaskConical, AlertTriangle } from "lucide-react";
import { eyebrowStyle, secondaryBtnStyle } from "./styles.js";

const GROUPS = [
  {
    key: "lifting",
    label: "Lifting",
    Icon: Dumbbell,
    accent: "--accent",
    items: [
      { key: "sessions", label: "Sessions", Icon: ClipboardList },
      { key: "journals", label: "Journals", Icon: NotebookPen },
      { key: "routines", label: "Routines", Icon: BookOpen },
      { key: "library", label: "Exercises", Icon: Layers },
    ],
  },
  {
    key: "jits",
    label: "BJJ",
    Icon: Swords,
    accent: "--accent4",
    items: [
      { key: "rolls", label: "Mat sessions", Icon: ClipboardList },
      { key: "techniques", label: "Techniques", Icon: BookOpen },
      { key: "flow", label: "Flow", Icon: Route },
    ],
  },
];

function NavItem({ active, accent = "--accent", Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={active ? undefined : "nav-item"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        minHeight: 40,
        padding: "8px 12px",
        borderRadius: 10,
        border: "none",
        background: active ? `var(${accent}-dim)` : "transparent",
        color: active ? `var(${accent})` : "var(--text)",
        fontWeight: active ? 600 : 500,
        fontSize: 14,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <Icon size={17} style={{ flexShrink: 0, opacity: active ? 1 : 0.75 }} />
      {label}
    </button>
  );
}

const dataBtnStyle = { ...secondaryBtnStyle, flex: 1, minWidth: 0, padding: "6px 8px", minHeight: 34, fontSize: 12 };

// The app's navigation: a drawer on narrow screens (opened from each page's
// menu button), always shown beside the page on wide ones. Under the pages,
// data import/export and the signed-in account.
export default function Sidebar({
  open,
  onClose,
  page,
  onNavigate,
  userEmail,
  syncError,
  importError,
  onExportCSV,
  onExportJSON,
  onImportClick,
  hasDemoData,
  onToggleDemoData,
  onLogout,
}) {
  return (
    <>
      <div className={`app-scrim${open ? " open" : ""}`} onClick={onClose} />
      <aside
        className={`app-sidebar${open ? " open" : ""}`}
        style={{ background: "var(--surface)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", paddingTop: "env(safe-area-inset-top)" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 12px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: "var(--accent)", color: "var(--on-accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Dumbbell size={17} strokeWidth={2.25} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em" }}>Session Log</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="wide-hidden icon-btn"
            style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", display: "flex", padding: 6, borderRadius: 8 }}
          >
            <X size={18} />
          </button>
        </div>

        <nav style={{ flex: 1, overflowY: "auto", padding: "4px 10px 12px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <NavItem active={page === "home"} Icon={Home} label="Home" onClick={() => onNavigate("home")} />
            <NavItem active={page === "plan"} accent="--accent2" Icon={Target} label="Plan" onClick={() => onNavigate("plan")} />
            <NavItem active={page === "tags"} Icon={Tags} label="Tag manager" onClick={() => onNavigate("tags")} />
          </div>

          {GROUPS.map((group) => (
            <div key={group.key}>
              <div style={{ ...eyebrowStyle, display: "flex", alignItems: "center", gap: 6, padding: "0 12px 6px", color: "var(--text-dim)" }}>
                <group.Icon size={12} color={`var(${group.accent})`} />
                {group.label}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {group.items.map((item) => (
                  <NavItem
                    key={item.key}
                    active={page === item.key}
                    accent={group.accent}
                    Icon={item.Icon}
                    label={item.label}
                    onClick={() => onNavigate(item.key)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div style={{ borderTop: "1px solid var(--border)", padding: "14px 16px calc(14px + env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 12 }}>
          {[syncError, importError].filter(Boolean).map((msg) => (
            <div key={msg} role="alert" style={{ display: "flex", gap: 8, alignItems: "flex-start", color: "var(--danger)", background: "var(--danger-dim)", borderRadius: 10, padding: "8px 10px", fontSize: 12, lineHeight: 1.4 }}>
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              {msg}
            </div>
          ))}

          <div>
            <div style={{ ...eyebrowStyle, color: "var(--text-dim)", marginBottom: 8 }}>Your data</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={onExportCSV} style={dataBtnStyle} title="Export as CSV">
                <Download size={13} /> CSV
              </button>
              <button onClick={onExportJSON} style={dataBtnStyle} title="Export as JSON">
                <Download size={13} /> JSON
              </button>
              <button onClick={onImportClick} style={dataBtnStyle} title="Import a CSV or JSON export">
                <Upload size={13} /> Import
              </button>
            </div>
            {/* TEMPORARY: pilot test data (see lib/demoData.js). */}
            <button
              onClick={onToggleDemoData}
              style={{ ...dataBtnStyle, width: "100%", marginTop: 6, borderStyle: "dashed", background: "transparent", color: "var(--text-dim)" }}
            >
              <FlaskConical size={13} /> {hasDemoData ? "Remove test data" : "Add test data"}
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              aria-hidden
              style={{ width: 30, height: 30, borderRadius: 999, background: "var(--surface-3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "var(--text-dim)", flexShrink: 0 }}
            >
              {(userEmail || "?").charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userEmail}</div>
            <button onClick={onLogout} className="icon-btn" title="Log out" aria-label="Log out" style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", display: "flex", padding: 7, borderRadius: 8 }}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
