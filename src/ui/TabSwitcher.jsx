import { ClipboardList, NotebookPen, BookOpen } from "lucide-react";

export default function TabSwitcher({ tab, setTab }) {
  const items = [
    { key: "sessions", label: "Sessions", Icon: ClipboardList },
    { key: "journals", label: "Journals", Icon: NotebookPen },
    { key: "routines", label: "Routines", Icon: BookOpen },
  ];
  return (
    <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
      {items.map(({ key, label, Icon }) => {
        const active = tab === key;
        return (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
              padding: "13px 0 11px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              cursor: "pointer",
              color: active ? "var(--text)" : "var(--text-dim)",
              fontWeight: active ? 700 : 500,
              fontSize: 13,
            }}
          >
            <Icon size={15} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
