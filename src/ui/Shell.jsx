// The full-screen frame everything is drawn in (see .app-shell in theme.css).
// `center` lays a single message out in the middle (loading, errors).
export default function Shell({ children, center = false }) {
  return (
    <div
      className="app-shell"
      style={center ? { alignItems: "center", justifyContent: "center", flexDirection: "column", padding: 24 } : undefined}
    >
      {children}
    </div>
  );
}
