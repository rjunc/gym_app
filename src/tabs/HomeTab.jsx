import { cardStyle } from "../ui/styles.js";

export default function HomeTab() {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>
      <div
        style={{
          ...cardStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 160,
          color: "var(--text-dim)",
          fontSize: 13,
          textAlign: "center",
        }}
      >
        Activity dashboard coming soon
      </div>
    </div>
  );
}
