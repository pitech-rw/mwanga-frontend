"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { getAccessToken, login, setSession } from "../lib/auth";

export default function HomePage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const finish = () => {
      if (!cancelled) {
        setCheckingSession(false);
      }
    };

    if (getAccessToken()) {
      router.replace("/account");
      queueMicrotask(finish);
      return () => {
        cancelled = true;
      };
    }

    queueMicrotask(finish);
    return () => {
      cancelled = true;
    };
  }, [router]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await login(identifier.trim(), password);
      setSession(response);
      router.replace("/account");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Sign in failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="landing-shell landing-loading">
        <p className="brand-tagline">Loading…</p>
      </div>
    );
  }

  return (
    <div className="landing-shell">
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <Image
            src="/assets/mwanga-high-res-logo-grayscale.png"
            alt="Mwanga"
            width={200}
            height={56}
            className="landing-logo"
            priority
          />
          <p className="eyebrow">Renewable energy</p>
          <h1>Battery swap operations for electric mobility</h1>
          <p className="landing-lead">
            Monitor stations, dispatch packs, and keep riders moving with a single operations workspace.
          </p>
        </div>
      </section>

      <section className="landing-panel">
        <div className="login-card card">
          <div className="login-card-head">
            <h2>Sign in</h2>
            <p>Use your username or email and password.</p>
          </div>

          <form className="form" onSubmit={submit}>
            {error ? (
              <div className="login-error" role="alert">
                {error}
              </div>
            ) : null}

            <label className="field">
              <span>Username or email</span>
              <input
                required
                autoComplete="username"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="you@mwanga.com"
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                required
                type="password"
                autoComplete="current-password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
              />
            </label>

            <button type="submit" className="btn primary login-submit" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in "}
            </button>
          </form>
        </div>

        <p className="landing-note">
          Need access? Contact your administrator — staff accounts are created in the operations console.
        </p>
      </section>
    </div>
  );
}
