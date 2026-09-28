import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import AuthGate from "./AuthGate.jsx";
import "./ui/theme.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthGate>{({ uid, email, logout }) => <App uid={uid} userEmail={email} onLogout={logout} />}</AuthGate>
  </React.StrictMode>
);
