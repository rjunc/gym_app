import {
  X,
  Home,
  Dumbbell,
  Swords,
  ClipboardList,
  NotebookPen,
  BookOpen,
  Route,
  Download,
  Upload,
  LogOut,
} from "lucide-react";
import { secondaryBtnStyle } from "./styles.js";

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
    ],
  },
  {
    key: "jits",
    label: "BJJ",
    Icon: Swords,
    accent: "--accent4",
    items: [
      { key: "rolls", label: "Rolls", Icon: ClipboardList },
      { key: "techniques", label: "Techniques", Icon: BookOpen },
      { key: "flow", label: "Flow", Icon: Route },
    ],
  },
];

function NavItem({ active, accent = "--accent", Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "9px 12px",
        borderRadius: 8,
        border: "none",
        background: active ? `var(${accent}-dim)` : "transparent",
        color: active ? `var(${accent})` : "var(--text)",
        fontWeight: active ? 700 : 500,
        fontSize: 13,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}

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
  onLogout,
}) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 180ms ease",
          zIndex: 20,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: 260,
          maxWidth: "80%",
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 220ms ease",
          zIndex: 21,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 14px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 14 }}>Menu</span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", display: "flex" }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 14 }}>
          <NavItem active={page === "home"} Icon={Home} label="Home" onClick={() => onNavigate("home")} />

          {GROUPS.map((group) => (
            <div key={group.key}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "0 12px 6px",
                  color: `var(${group.accent})`,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                }}
              >
                <group.Icon size={12} />
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
        </div>

        <div style={{ borderTop: "1px solid var(--border)", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          {syncError && <div style={{ color: "var(--danger)", fontSize: 12 }}>{syncError}</div>}
          {importError && <div style={{ color: "var(--danger)", fontSize: 12 }}>{importError}</div>}
          <div style={{ fontSize: 10, color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {userEmail}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button onClick={onExportCSV} style={secondaryBtnStyle}>
              <Download size={14} /> CSV
            </button>
            <button onClick={onExportJSON} style={secondaryBtnStyle}>
              <Download size={14} /> JSON
            </button>
            <button onClick={onImportClick} style={secondaryBtnStyle}>
              <Upload size={14} /> Import
            </button>
            <button onClick={onLogout} style={{ ...secondaryBtnStyle, marginLeft: "auto" }} title="Log out">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
