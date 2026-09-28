import React, { useEffect, useState } from "react";
import { Dumbbell, AlertTriangle } from "lucide-react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth, firebaseConfigured } from "./firebase.js";
import Shell from "./ui/Shell.jsx";
import { cardStyle, inputStyle, labelStyle, primaryBtnStyle, ghostLinkStyle } from "./ui/styles.js";

// Shared wrapper for all three AuthGate screens (setup notice, loading,
// login form): a centred column on the app's background (see theme.css).
function AuthShell({ children }) {
  return (
    <Shell center>
      <div style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", alignItems: "center", gap: 20, textAlign: "center" }}>{children}</div>
    </Shell>
  );
}

function Brand({ subtitle }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div style={{ width: 48, height: 48, borderRadius: 14, background: "var(--accent)", color: "var(--on-accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Dumbbell size={26} strokeWidth={2.25} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em" }}>Session Log</div>
        {subtitle && <div style={{ color: "var(--text-dim)", fontSize: 14, marginTop: 4 }}>{subtitle}</div>}
      </div>
    </div>
  );
}

// If Firebase env vars haven't been set yet, show setup instructions instead
// of a broken app.
function SetupNeeded() {
  return (
    <AuthShell>
      <Brand />
      <div style={{ ...cardStyle, textAlign: "left", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>Firebase isn't configured yet</div>
        <div style={{ color: "var(--text-dim)", fontSize: 13, lineHeight: 1.55 }}>
        Add your Firebase project credentials as environment variables (see the README) and
        redeploy. Locally, create a <code>.env.local</code> file with the
        <code> VITE_FIREBASE_*</code> keys and restart <code>npm run dev</code>.
        </div>
      </div>
    </AuthShell>
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
    <AuthShell>
      <Brand subtitle={mode === "login" ? "Log in to sync your training log" : "Create an account to sync your training log"} />

      <form onSubmit={submit} style={{ ...cardStyle, padding: 20, display: "flex", flexDirection: "column", gap: 14, width: "100%", textAlign: "left" }}>
        <div>
          <label htmlFor="auth-email" style={labelStyle}>
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label htmlFor="auth-password" style={labelStyle}>
            Password
          </label>
          <input
            id="auth-password"
            type="password"
            required
            minLength={6}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder={mode === "login" ? "Your password" : "At least 6 characters"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
        </div>
        {error && (
          <div role="alert" style={{ display: "flex", gap: 8, alignItems: "flex-start", color: "var(--danger)", background: "var(--danger-dim)", borderRadius: 10, padding: "8px 10px", fontSize: 13 }}>
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            {error}
          </div>
        )}
        <button type="submit" disabled={busy} style={{ ...primaryBtnStyle, width: "100%", minHeight: 44, marginTop: 2, opacity: busy ? 0.6 : 1 }}>
          {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
        </button>
      </form>

      <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
        {mode === "login" ? "Need an account? " : "Already have an account? "}
        <button
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError("");
          }}
          style={ghostLinkStyle}
        >
          {mode === "login" ? "Sign up" : "Log in"}
        </button>
      </div>
    </AuthShell>
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
  if (user === undefined)
    return (
      <AuthShell>
        <div role="status" className="spinner" aria-label="Loading" />
      </AuthShell>
    );
  if (user === null) return <LoginForm />;

  return children({ uid: user.uid, email: user.email, logout: () => signOut(auth) });
}
