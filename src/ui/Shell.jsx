export default function Shell({ children }) {
  return (
    <div
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
        height: "100vh",
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
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
        textarea, input, select { font-family: inherit; }
      `}</style>
      {children}
    </div>
  );
}
