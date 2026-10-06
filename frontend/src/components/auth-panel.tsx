"use client";

import type { FormEvent } from "react";

type AuthMode = "login" | "register";

type AuthPanelProps = {
  mode: AuthMode;
  loading: boolean;
  error: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleMode: () => void;
};

export function AuthPanel({ mode, loading, error, onSubmit, onToggleMode }: AuthPanelProps) {
  return (
    <main className="auth-shell">
      <section className="auth-intro">
        <p className="eyebrow">A quieter place to talk</p>
        <h1>Good conversations have room to breathe.</h1>
        <p className="intro-copy">A small, focused chat space for the people and ideas you want close.</p>
        <div className="intro-mark" aria-hidden="true"><span>••</span><i /></div>
      </section>
      <section className="auth-card">
        <div className="auth-card-top"><div className="brand-mark">ch<span>at</span></div><span className="status-dot">Private beta</span></div>
        <div className="auth-heading"><p className="eyebrow">{mode === "login" ? "Welcome back" : "Make an account"}</p><h2>{mode === "login" ? "Pick up where you left off." : "Start a new thread."}</h2></div>
        <form className="auth-form" onSubmit={onSubmit}>
          {mode === "register" && <label><span>Your name</span><input name="name" required placeholder="Ada Lovelace" /></label>}
          <label><span>Email address</span><input name="email" type="email" required placeholder="you@example.com" /></label>
          <label><span>Password</span><input name="password" type="password" minLength={8} required placeholder="8 characters minimum" /></label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button" disabled={loading}>{loading ? "One moment..." : mode === "login" ? "Enter chat" : "Create account"}<span>→</span></button>
        </form>
        <button className="text-button" onClick={onToggleMode}>{mode === "login" ? "Need an account? Create one" : "Already have an account? Sign in"}</button>
      </section>
    </main>
  );
}
