"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { PasswordInput } from "../components/password-input";
import { useT } from "../components/locale";
import { getAccessToken, getStoredUser, login, setSession } from "../lib/auth";

export default function HomePage() {
  const t = useT();
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

  useEffect(() => {
    document.title = t("meta.title");
  }, [t]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await login(identifier.trim(), password);
      setSession(response);
      router.replace(response.user.type === "agent" ? "/account/top-up" : "/account");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : t("auth.signInFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="landing-shell landing-loading">
        <p className="brand-tagline">{t("common.loading")}</p>
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
          <p className="eyebrow">{t("auth.eyebrow")}</p>
          <h1>{t("auth.heroTitle")}</h1>
          <p className="landing-lead">{t("auth.heroLead")}</p>
        </div>
      </section>

      <section className="landing-panel">
        <div className="login-card card">
          <div className="login-card-head">
            <h2>{t("auth.signIn")}</h2>
            <p>{t("auth.signInHint")}</p>
          </div>

          <form className="form" onSubmit={submit}>
            {error ? (
              <div className="login-error" role="alert">
                {error}
              </div>
            ) : null}

            <label className="field">
              <span>{t("auth.identifier")}</span>
              <input
                required
                autoComplete="username"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="you@mwanga.com"
              />
            </label>

            <label className="field">
              <span>{t("auth.password")}</span>
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
              {submitting ? t("auth.signingIn") : t("auth.signIn")}
            </button>

            <p className="login-form-footer">
              <Link href="/forgot-password" className="login-inline-link">
                {t("auth.forgotPassword")}
              </Link>
            </p>
          </form>
        </div>

        <p className="landing-note">{t("auth.needAccess")}</p>
      </section>
    </div>
  );
}