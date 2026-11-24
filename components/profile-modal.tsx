"use client";

import { useT } from "./locale";

import { FormEvent, useEffect, useId, useState } from "react";
import { userMessageForNetwork } from "../lib/api-errors";
import {
  clearSession,
  confirmErasureRequest,
  createErasureRequest,
  fetchLatestErasureRequest,
  fetchMyProfile,
  updateMyProfile,
  type ErasureRequestSummary,
  type MyProfile,
} from "../lib/auth";
import { Modal } from "./modal";
import { PasswordInput } from "./password-input";

/** Matches server `STAFF_ERASURE_USER_TYPES` — requires admin approval before erasure. */
const ERASURE_REQUIRES_ADMIN_APPROVAL = new Set([
  "admin",
  "office",
  "office_manager",
  "swapper",
]);

type ProfileModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved?: (profile: MyProfile) => void;
  onError?: (message: string) => void;
  onAccountErased?: () => void;
};

type FormState = {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  image: string;
  currentPassword: string;
  password: string;
};

function emptyForm(): FormState {
  return {
    username: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    image: "",
    currentPassword: "",
    password: "",
  };
}

function formFromProfile(profile: MyProfile): FormState {
  return {
    username: profile.username ?? "",
    firstName: profile.firstName ?? "",
    lastName: profile.lastName ?? "",
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    address: profile.address ?? "",
    image: profile.image ?? "",
    currentPassword: "",
    password: "",
  };
}

export function ProfileModal({
  open,
  onClose,
  onSaved,
  onError,
  onAccountErased,
}: ProfileModalProps) {
  const t = useT();
  const formId = useId();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ role: string; type: string } | null>(null);
  const [values, setValues] = useState<FormState>(emptyForm);
  const [initial, setInitial] = useState<FormState>(emptyForm);
  const [erasureRequest, setErasureRequest] = useState<ErasureRequestSummary | null>(null);
  const [erasurePassword, setErasurePassword] = useState("");
  const [erasureForfeit, setErasureForfeit] = useState(false);
  const [erasureBusy, setErasureBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const profile = await fetchMyProfile("full");
        if (!active) {
          return;
        }
        const next = formFromProfile(profile);
        setValues(next);
        setInitial(next);
        setMeta({
          role: profile.role.name,
          type: profile.type,
        });
        const erasure = await fetchLatestErasureRequest().catch(() => null);
        if (active) {
          setErasureRequest(erasure);
        }
      } catch (loadError) {
        if (!active) {
          return;
        }
        const message = loadError instanceof Error ? loadError.message : t("validation.loadProfile");
        setError(message);
        onError?.(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [open, onError]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const patch: Parameters<typeof updateMyProfile>[0] = {};
    const keys = ["username", "firstName", "lastName", "email", "phone", "address", "image"] as const;

    for (const key of keys) {
      const trimmed = values[key].trim();
      const previous = initial[key].trim();
      if (trimmed !== previous) {
        patch[key] = trimmed;
      }
    }

    if (values.password.trim()) {
      if (!values.currentPassword.trim()) {
        setError(t("validation.currentPasswordRequired"));
        setSaving(false);
        return;
      }
      patch.currentPassword = values.currentPassword;
      patch.password = values.password;
    }

    if (Object.keys(patch).length === 0) {
      setError(t("validation.noChanges"));
      setSaving(false);
      return;
    }

    try {
      const profile = await updateMyProfile(patch);
      const next = formFromProfile(profile);
      setInitial(next);
      setValues({ ...next, currentPassword: "", password: "" });
      onSaved?.(profile);
      onClose();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : userMessageForNetwork("profileUpdate");
      setError(message);
      onError?.(message);
    } finally {
      setSaving(false);
    }
  };

  const disabled = loading || saving;

  const requestErasure = async () => {
    setErasureBusy(true);
    setError(null);
    try {
      const row = await createErasureRequest();
      setErasureRequest(row);
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : userMessageForNetwork("profileUpdate");
      setError(message);
      onError?.(message);
    } finally {
      setErasureBusy(false);
    }
  };

  const confirmErasure = async () => {
    if (!erasurePassword.trim()) {
      setError(t("erasure.profile.passwordRequired"));
      return;
    }
    setErasureBusy(true);
    setError(null);
    try {
      await confirmErasureRequest({
        password: erasurePassword,
        acknowledgeBalanceForfeiture: erasureForfeit,
      });
      clearSession();
      onClose();
      onAccountErased?.();
    } catch (confirmError) {
      const message =
        confirmError instanceof Error ? confirmError.message : userMessageForNetwork("profileUpdate");
      setError(message);
      onError?.(message);
    } finally {
      setErasureBusy(false);
    }
  };

  const needsAdminApproval = meta?.type ? ERASURE_REQUIRES_ADMIN_APPROVAL.has(meta.type) : false;

  return (
    <Modal
      open={open}
      variant="panel"
      title={t("modals.profile.title")}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={saving}>
            {t("common.cancel")}
          </button>
          <button type="submit" form={formId} className="btn primary" disabled={disabled}>
            {saving ? t("common.saving") : t("common.saveChanges")}
          </button>
        </>
      }
    >
      <form id={formId} className="form form-modal-panel" onSubmit={submit}>
        {error ? (
          <div className="login-error" role="alert">
            {error}
          </div>
        ) : null}

        <dl className="profile-form-meta" aria-label={t("modals.profile.sectionAccount")}>
          <div>
            <dt>{t("modals.profile.fields.role")}</dt>
            <dd>{meta ? meta.role.replace(/_/g, " ") : "—"}</dd>
          </div>
          <div>
            <dt>{t("modals.profile.fields.accountType")}</dt>
            <dd>{meta ? meta.type.replace(/_/g, " ") : "—"}</dd>
          </div>
        </dl>

        <fieldset className="profile-form-section">
          <label className="field">
            <span>{t("modals.profile.fields.username")}</span>
            <input
              type="text"
              autoComplete="username"
              minLength={2}
              maxLength={40}
              value={values.username}
              disabled={disabled}
              onChange={(event) => setValues({ ...values, username: event.target.value })}
            />
          </label>
          <label className="field">
            <span>{t("modals.profile.fields.firstName")}</span>
            <input
              type="text"
              autoComplete="given-name"
              minLength={2}
              maxLength={80}
              value={values.firstName}
              disabled={disabled}
              onChange={(event) => setValues({ ...values, firstName: event.target.value })}
            />
          </label>
          <label className="field">
            <span>{t("modals.profile.fields.lastName")}</span>
            <input
              type="text"
              autoComplete="family-name"
              minLength={2}
              maxLength={80}
              value={values.lastName}
              disabled={disabled}
              onChange={(event) => setValues({ ...values, lastName: event.target.value })}
            />
          </label>
          <label className="field">
            <span>{t("modals.profile.fields.email")}</span>
            <input
              type="email"
              autoComplete="email"
              value={values.email}
              disabled={disabled}
              onChange={(event) => setValues({ ...values, email: event.target.value })}
            />
          </label>
          <label className="field">
            <span>{t("modals.profile.fields.phone")}</span>
            <input
              type="tel"
              autoComplete="tel"
              maxLength={30}
              value={values.phone}
              disabled={disabled}
              onChange={(event) => setValues({ ...values, phone: event.target.value })}
            />
          </label>
          <label className="field">
            <span>{t("modals.profile.fields.address")}</span>
            <textarea
              maxLength={200}
              rows={3}
              value={values.address}
              disabled={disabled}
              onChange={(event) => setValues({ ...values, address: event.target.value })}
            />
          </label>
          <label className="field">
            <span>{t("modals.profile.fields.imageUrl")}</span>
            <input
              type="url"
              placeholder={t("modals.profile.placeholderImage")}
              maxLength={500}
              value={values.image}
              disabled={disabled}
              onChange={(event) => setValues({ ...values, image: event.target.value })}
            />
          </label>
        </fieldset>

        <fieldset className="profile-form-section profile-form-section--danger">
          <legend>{t("erasure.profile.section")}</legend>
          <p className="profile-form-section-hint">{t("erasure.profile.hint")}</p>
          {erasureRequest?.status === "completed" ? (
            <p className="muted">{t("erasure.profile.statusCompleted")}</p>
          ) : needsAdminApproval ? (
            <>
              {erasureRequest?.status === "pending_approval" ? (
                <p className="muted">{t("erasure.profile.statusPendingApproval")}</p>
              ) : (
                <button
                  type="button"
                  className="btn danger"
                  disabled={disabled || erasureBusy}
                  onClick={() => void requestErasure()}
                >
                  {t("erasure.profile.requestStaff")}
                </button>
              )}
            </>
          ) : (
            <>
              <p className="muted">{t("erasure.profile.confirmHint")}</p>
              <label className="field">
                <span>{t("modals.profile.fields.currentPassword")}</span>
                <PasswordInput
                  value={erasurePassword}
                  autoComplete="current-password"
                  disabled={disabled || erasureBusy}
                  onChange={setErasurePassword}
                />
              </label>
              <label className="field field-checkbox">
                <input
                  type="checkbox"
                  checked={erasureForfeit}
                  disabled={disabled || erasureBusy}
                  onChange={(event) => setErasureForfeit(event.target.checked)}
                />
                <span>{t("erasure.profile.forfeitBalance")}</span>
              </label>
              <button
                type="button"
                className="btn danger"
                disabled={disabled || erasureBusy}
                onClick={() => void confirmErasure()}
              >
                {t("erasure.profile.confirm")}
              </button>
            </>
          )}
        </fieldset>

        <fieldset className="profile-form-section">
          <legend>{t("modals.profile.sectionSecurity")}</legend>
          <label className="field">
            <span>{t("modals.profile.fields.currentPassword")}</span>
            <PasswordInput
              value={values.currentPassword}
              autoComplete="current-password"
              placeholder={t("modals.profile.placeholderCurrentPassword")}
              disabled={disabled}
              onChange={(currentPassword) => setValues({ ...values, currentPassword })}
            />
          </label>
          <label className="field">
            <span>{t("modals.profile.fields.newPassword")}</span>
            <PasswordInput
              value={values.password}
              autoComplete="new-password"
              minLength={8}
              placeholder={t("modals.profile.placeholderNewPassword")}
              disabled={disabled}
              onChange={(password) => setValues({ ...values, password })}
            />
          </label>
        </fieldset>
      </form>
    </Modal>
  );
}