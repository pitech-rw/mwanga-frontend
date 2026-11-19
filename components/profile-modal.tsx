"use client";

import { useT } from "./locale";

import { FormEvent, useEffect, useId, useState } from "react";
import { userMessageForNetwork } from "../lib/api-errors";
import { fetchMyProfile, updateMyProfile, type MyProfile } from "../lib/auth";
import { canManageOtherUsers } from "../lib/nav-permissions";
import { Modal } from "./modal";
import { PasswordInput } from "./password-input";

type ProfileModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved?: (profile: MyProfile) => void;
  onError?: (message: string) => void;
  onOpenUserAdministration?: () => void;
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

export function ProfileModal({ open, onClose, onSaved, onError, onOpenUserAdministration }: ProfileModalProps) {
  const t = useT();
  const formId = useId();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ role: string; type: string; canManageUsers: boolean } | null>(null);
  const [values, setValues] = useState<FormState>(emptyForm);
  const [initial, setInitial] = useState<FormState>(emptyForm);

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
          canManageUsers: canManageOtherUsers(profile.permissions),
        });
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

  return (
    <Modal
      open={open}
      variant="panel"
      title={t("modals.profile.title")}
      description={t("modals.profile.description")}
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

        <fieldset className="profile-form-section profile-form-section--readonly" disabled={loading}>
          <legend>{t("modals.profile.sectionAccount")}</legend>
          <p className="profile-form-section-hint">
            {meta?.canManageUsers ? t("modals.profile.hintAdmin") : t("modals.profile.hintDefault")}
          </p>
          {meta?.canManageUsers && onOpenUserAdministration ? (
            <button
              type="button"
              className="btn profile-form-admin-link"
              onClick={() => {
                onClose();
                onOpenUserAdministration();
              }}
            >
              {t("common.userAdministration")}
            </button>
          ) : null}
          <label className="field">
            <span>{t("modals.profile.fields.role")}</span>
            <input
              type="text"
              value={meta ? meta.role.replace(/_/g, " ") : "—"}
              disabled
              readOnly
              tabIndex={-1}
            />
          </label>
          <label className="field">
            <span>{t("modals.profile.fields.accountType")}</span>
            <input
              type="text"
              value={meta ? meta.type.replace(/_/g, " ") : "—"}
              disabled
              readOnly
              tabIndex={-1}
            />
          </label>
        </fieldset>

        <fieldset className="profile-form-section">
          <legend>{t("modals.profile.sectionPersonal")}</legend>
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

        <fieldset className="profile-form-section">
          <legend>{t("modals.profile.sectionSecurity")}</legend>
          <p className="profile-form-section-hint">{t("modals.profile.hintPasswordBlank")}</p>
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