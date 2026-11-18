"use client";

import { useT } from "../../components/locale";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { requestPasswordReset, userMessageFromApiCode } from "../../lib/auth";

export default function ForgotPasswordPage() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const result = await requestPasswordReset(email);
      setSuccess(
        userMessageFromApiCode(
          result.code,
          result.params,
          undefined,
          result.message,
          "auth.passwordResetEmailSent",
        ),
      );
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("auth.requestFailed"));
    } finally {
      setSubmitting(false);
    }
  };

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
            <h2>{t("auth.forgotPageTitle")}</h2>
            <p>{t("auth.forgotPageLead")}</p>
          </div>

          <form className="form" onSubmit={submit}>
            {error ? (
              <div className="login-error" role="alert">
                {error}
              </div>
            ) : null}
            {success ? (
              <div className="login-success" role="status">
                {success}
              </div>
            ) : null}

            <label className="field">
              <span>{t("auth.emailLabel")}</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                disabled={Boolean(success)}
              />
            </label>

            <button
              type="submit"
              className="btn primary login-submit"
              disabled={submitting || Boolean(success)}
            >
              {submitting ? t("auth.sendingReset") : t("auth.sendResetLink")}
            </button>

            <p className="login-form-footer">
              <Link href="/" className="login-inline-link">
                {t("auth.backToSignIn")}
              </Link>
            </p>
          </form>
        </div>

        <p className="landing-note">{t("auth.resetExpiryNote")}</p>
      </section>
    </div>
  );
}