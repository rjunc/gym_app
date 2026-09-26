// The slide-up panel behind every form and summary: dims the page, sits at
// the bottom, scrolls when tall, and closes on a tap outside it. `gap` is the
// space between its direct children.
export default function BottomSheet({ onClose, gap = 14, children }) {
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
          gap,
          overflowY: "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}
