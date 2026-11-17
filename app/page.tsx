"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { PasswordInput } from "../components/password-input";
import { getAccessToken, getStoredUser, login, setSession } from "../lib/auth";

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
      const user = getStoredUser();
      router.replace(user?.type === "agent" ? "/account/top-up" : "/account");
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
      router.replace(response.user.type === "agent" ? "/account/top-up" : "/account");
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
            src="/assets/logo.png"
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
              <PasswordInput
                required
                autoComplete="current-password"
                minLength={8}
                value={password}
                onChange={setPassword}
                placeholder="At least 8 characters"
              />
            </label>

            <button type="submit" className="btn primary login-submit" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in "}
            </button>

            <p className="login-form-footer">
              <Link href="/forgot-password" className="login-inline-link">
                Forgot password?
              </Link>
            </p>
          </form>
        </div>

        <p className="landing-note">
          Need access? Contact your administrator — staff accounts are created in the operations console.
        </p>
      </section>
    </div>
  );
}
