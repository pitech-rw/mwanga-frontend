"use client";

import { useT } from "../../components/locale";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { PasswordInput } from "../../components/password-input";
import { resetPassword, userMessageFromApiCode } from "../../lib/auth";

function ResetPasswordForm() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) {
      setError("This reset link is missing a token. Request a new link from the sign-in page.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      const result = await resetPassword(token, password);
      setSuccess(
        userMessageFromApiCode(result.code, result.params, undefined, result.message, "auth.passwordUpdated"),
      );
      window.setTimeout(() => router.replace("/"), 2000);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Reset failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-card card">
      <div className="login-card-head">
        <h2>Choose a new password</h2>
        <p>Enter a new password for your Mwanga account.</p>
      </div>

      {!token ? (
        <div className="login-error" role="alert">
          This reset link is invalid.{" "}
          <Link href="/forgot-password" className="login-inline-link">
            Request a new one
          </Link>
          .
        </div>
      ) : (
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
            <span>New password</span>
            <PasswordInput
              required
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={setPassword}
              placeholder="At least 8 characters"
              disabled={Boolean(success)}
            />
          </label>

          <label className="field">
            <span>Confirm password</span>
            <PasswordInput
              required
              autoComplete="new-password"
              minLength={8}
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Repeat password"
              disabled={Boolean(success)}
            />
          </label>

          <button
            type="submit"
            className="btn primary login-submit"
            disabled={submitting || Boolean(success)}
          >
            {submitting ? "Updating…" : "Update password"}
          </button>

          <p className="login-form-footer">
            <Link href="/" className="login-inline-link">
              Back to sign in
            </Link>
          </p>
        </form>
      )}

      {!token ? (
        <p className="login-form-footer">
          <Link href="/" className="login-inline-link">
            Back to sign in
          </Link>
        </p>
      ) : null}
    </div>
  );
}

export default function ResetPasswordPage() {
  const t = useT();
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
        <Suspense
          fallback={
            <div className="login-card card">
              <p className="brand-tagline">Loading…</p>
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>

        <p className="landing-note">Use at least 8 characters for your new password.</p>
      </section>
    </div>
  );
}