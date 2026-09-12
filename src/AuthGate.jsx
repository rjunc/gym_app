import React, { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth, firebaseConfigured } from "./firebase.js";

const shellStyle = {
  "--bg": "#15160F",
  "--surface": "#1E1F17",
  "--surface-2": "#262819",
  "--border": "#3A3C2E",
  "--text": "#EDEBDD",
  "--text-dim": "#9B9C8D",
  "--accent": "#C9A227",
  "--danger": "#C2604A",
  background: "var(--bg)",
  color: "var(--text)",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  maxWidth: 480,
  margin: "0 auto",
  minHeight: "100vh",
  maxHeight: 800,
  borderRadius: 18,
  overflow: "hidden",
  border: "1px solid var(--border)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  gap: 14,
  textAlign: "center",
};

const inputStyle = {
  width: "100%",
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "10px 12px",
  color: "var(--text)",
  fontSize: 13,
  outline: "none",
};

const buttonStyle = {
  background: "var(--accent)",
  color: "#15160F",
  border: "none",
  borderRadius: 9,
  padding: "10px 0",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
  width: "100%",
};

// If Firebase env vars haven't been set yet, show setup instructions instead
// of a broken app.
function SetupNeeded() {
  return (
    <div style={shellStyle}>
      <div style={{ fontWeight: 700, fontSize: 16 }}>Firebase isn't configured yet</div>
      <div style={{ color: "var(--text-dim)", fontSize: 13, lineHeight: 1.5 }}>
        Add your Firebase project credentials as environment variables (see the README) and
        redeploy. Locally, create a <code>.env.local</code> file with the
        <code> VITE_FIREBASE_*</code> keys and restart <code>npm run dev</code>.
      </div>
    </div>
  );
}

function LoginForm() {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={shellStyle}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>Session Log</div>
        <div style={{ color: "var(--text-dim)", fontSize: 13, marginTop: 4 }}>
          {mode === "login" ? "Log in to sync your data" : "Create an account to sync your data"}
        </div>
      </div>

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />
        <input
          type="password"
          required
          minLength={6}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />
        {error && <div style={{ color: "var(--danger)", fontSize: 12 }}>{error}</div>}
        <button type="submit" disabled={busy} style={{ ...buttonStyle, opacity: busy ? 0.6 : 1 }}>
          {busy ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
        </button>
      </form>

      <button
        onClick={() => {
          setMode(mode === "login" ? "signup" : "login");
          setError("");
        }}
        style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
      >
        {mode === "login" ? "Need an account? Sign up" : "Already have an account? Log in"}
      </button>
    </div>
  );
}

function friendlyAuthError(err) {
  const code = err?.code || "";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) {
    return "Incorrect email or password.";
  }
  if (code.includes("email-already-in-use")) return "That email already has an account — try logging in.";
  if (code.includes("weak-password")) return "Password should be at least 6 characters.";
  if (code.includes("invalid-email")) return "That doesn't look like a valid email.";
  return "Something went wrong. Please try again.";
}

// Renders children (the real app) once a user is signed in, passing them
// { uid, logout }. Otherwise renders the login form or a setup screen.
export default function AuthGate({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = signed out

  useEffect(() => {
    if (!firebaseConfigured) return;
    return onAuthStateChanged(auth, setUser);
  }, []);

  if (!firebaseConfigured) return <SetupNeeded />;
  if (user === undefined) return <div style={shellStyle}>Loading…</div>;
  if (user === null) return <LoginForm />;

  return children({ uid: user.uid, email: user.email, logout: () => signOut(auth) });
}
