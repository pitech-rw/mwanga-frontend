"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { requestPasswordReset } from "../../lib/auth";

export default function ForgotPasswordPage() {
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
      setSuccess(result.message);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Request failed.");
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
            <h2>Reset password</h2>
            <p>Enter the email on your account and we will send reset instructions.</p>
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
              <span>Email</span>
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
              {submitting ? "Sending…" : "Send reset link"}
            </button>

            <p className="login-form-footer">
              <Link href="/" className="login-inline-link">
                Back to sign in
              </Link>
            </p>
          </form>
        </div>

        <p className="landing-note">Reset links expire after one hour for security.</p>
      </section>
    </div>
  );
}