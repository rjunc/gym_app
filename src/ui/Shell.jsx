export default function Shell({ children }) {
  return (
    <div
      className="app-shell"
      style={{
        "--bg": "#15160F",
        "--surface": "#1E1F17",
        "--surface-2": "#262819",
        "--border": "#3A3C2E",
        "--text": "#EDEBDD",
        "--text-dim": "#9B9C8D",
        "--accent": "#C9A227",
        "--accent-dim": "rgba(201,162,39,0.16)",
        "--accent2": "#6FA88F",
        "--accent2-dim": "rgba(111,168,143,0.16)",
        "--accent3": "#8C93C9",
        "--accent3-dim": "rgba(140,147,201,0.16)",
        "--danger": "#C2604A",
        background: "var(--bg)",
        color: "var(--text)",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        maxWidth: 480,
        margin: "0 auto",
        maxHeight: 800,
        borderRadius: 18,
        overflow: "hidden",
        border: "1px solid var(--border)",
        position: "relative",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        /* 100dvh tracks the *currently visible* viewport as mobile browser
           chrome (e.g. Safari's address bar) shows/hides; 100vh alone is
           computed against the largest possible viewport, so on load (chrome
           expanded) a plain 100vh box is taller than what's on screen and
           pushes content below the fold. Keep 100vh as a fallback for
           browsers that don't support dvh yet. */
        .app-shell { height: 100vh; height: 100dvh; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
        textarea, input, select { font-family: inherit; }
      `}</style>
      {children}
    </div>
  );
}
