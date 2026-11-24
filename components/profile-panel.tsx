"use client";

import Link from "next/link";
import { useLocale, useT } from "./locale";
import { roleOrUserTypeLabel } from "../lib/role-labels";

import { FormEvent, useCallback, useEffect, useId, useMemo, useState } from "react";
import { userMessageForNetwork } from "../lib/api-errors";
import { googleMapsSearchUrl } from "../lib/google-maps-url";
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
import { profileHref, type ProfileTab } from "../lib/nav-path";
import { PasswordInput } from "./password-input";
import { PlacesLocationPicker } from "./places-location-picker";
import { ProfileLocationMap } from "./profile-location-map";

/** Matches server `STAFF_ERASURE_USER_TYPES` — requires admin approval before erasure. */
const ERASURE_REQUIRES_ADMIN_APPROVAL = new Set([
  "admin",
  "office",
  "office_manager",
  "swapper",
]);

type ProfilePanelProps = {
  tab: ProfileTab;
  pathPrefix: string;
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
  image: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  currentPassword: string;
  password: string;
};

function coordInputValue(value: number | null): string {
  return value === null ? "" : String(value);
}

function parseCoordInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function emptyForm(): FormState {
  return {
    username: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    image: "",
    address: "",
    latitude: null,
    longitude: null,
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
    image: profile.image ?? "",
    address: profile.address ?? "",
    latitude: profile.latitude ?? null,
    longitude: profile.longitude ?? null,
    currentPassword: "",
    password: "",
  };
}

export function ProfilePanel({ tab, pathPrefix, onSaved, onError, onAccountErased }: ProfilePanelProps) {
  const t = useT();
  const { locale } = useLocale();
  const detailsFormId = useId();
  const locationFormId = useId();
  const securityFormId = useId();
  const tablistId = useId();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ role: string; type: string } | null>(null);
  const [values, setValues] = useState<FormState>(emptyForm);
  const [initial, setInitial] = useState<FormState>(emptyForm);
  const [erasureRequest, setErasureRequest] = useState<ErasureRequestSummary | null>(null);
  const [erasurePassword, setErasurePassword] = useState("");
  const [erasureForfeit, setErasureForfeit] = useState(false);
  const [erasureBusy, setErasureBusy] = useState(false);

  const tabs: { id: ProfileTab; label: string }[] = [
    { id: "details", label: t("profile.tab.details") },
    { id: "location", label: t("profile.tab.location") },
    { id: "security", label: t("profile.tab.security") },
    { id: "privacy", label: t("profile.tab.privacy") },
  ];

  const mapsExternalUrl = useMemo(
  () =>
    googleMapsSearchUrl({
      address: values.address,
      latitude: values.latitude,
      longitude: values.longitude,
    }),
    [values.address, values.latitude, values.longitude],
  );

  const onPlaceSelected = useCallback((place: { address: string; latitude: number; longitude: number }) => {
    setValues((prev) => ({
      ...prev,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
    }));
  }, []);

  const clearLocation = () => {
    setValues((prev) => ({ ...prev, address: "", latitude: null, longitude: null }));
  };

  useEffect(() => {
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
  }, [onError, t]);

  const submitDetails = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const patch: Parameters<typeof updateMyProfile>[0] = {};
    const keys = ["username", "firstName", "lastName", "email", "phone", "image"] as const;

    for (const key of keys) {
      const trimmed = values[key].trim();
      const previous = initial[key].trim();
      if (trimmed !== previous) {
        patch[key] = trimmed;
      }
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
      setValues({ ...next, currentPassword: values.currentPassword, password: values.password });
      onSaved?.(profile);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : userMessageForNetwork("profileUpdate");
      setError(message);
      onError?.(message);
    } finally {
      setSaving(false);
    }
  };

  const submitLocation = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const patch: Parameters<typeof updateMyProfile>[0] = {};
    const nextAddress = values.address.trim();
    const prevAddress = initial.address.trim();
    if (nextAddress !== prevAddress) {
      patch.address = nextAddress;
    }
    if (values.latitude !== initial.latitude) {
      patch.latitude = values.latitude;
    }
    if (values.longitude !== initial.longitude) {
      patch.longitude = values.longitude;
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
      setValues({ ...next, currentPassword: values.currentPassword, password: values.password });
      onSaved?.(profile);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : userMessageForNetwork("profileUpdate");
      setError(message);
      onError?.(message);
    } finally {
      setSaving(false);
    }
  };

  const submitSecurity = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    if (!values.password.trim()) {
      setError(t("validation.noChanges"));
      setSaving(false);
      return;
    }

    if (!values.currentPassword.trim()) {
      setError(t("validation.currentPasswordRequired"));
      setSaving(false);
      return;
    }

    try {
      const profile = await updateMyProfile({
        currentPassword: values.currentPassword,
        password: values.password,
      });
      const next = formFromProfile(profile);
      setInitial(next);
      setValues({ ...next, currentPassword: "", password: "" });
      onSaved?.(profile);
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
    <section className={`profile-page card${tab === "location" ? " profile-page--wide" : ""}`}>
      <nav className="profile-page-tabs drawer-tabs" role="tablist" aria-label={t("modals.profile.title")} id={tablistId}>
        {tabs.map((item) => {
          const selected = tab === item.id;
          return (
            <Link
              key={item.id}
              href={profileHref(pathPrefix, item.id)}
              role="tab"
              aria-selected={selected}
              className={selected ? "drawer-tab drawer-tab-active" : "drawer-tab"}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="profile-page-body">
        {error ? (
          <div className="login-error" role="alert">
            {error}
          </div>
        ) : null}

        {tab === "details" ? (
          <form id={detailsFormId} className="form profile-page-form" onSubmit={submitDetails}>
            {meta ? (
              <div
                className="profile-account-chips"
                aria-label={t("modals.profile.sectionAccount")}
              >
                <span className="profile-account-chip">
                  <span className="profile-account-chip-label">{t("modals.profile.fields.accountType")}</span>
                  <span className="profile-account-chip-value">{roleOrUserTypeLabel(locale, meta.type)}</span>
                </span>
                <span className="profile-account-chip">
                  <span className="profile-account-chip-label">{t("modals.profile.fields.role")}</span>
                  <span className="profile-account-chip-value">{roleOrUserTypeLabel(locale, meta.role)}</span>
                </span>
              </div>
            ) : null}
            {meta ? <p className="sub profile-account-hint">{t("profile.accountReadonlyHint")}</p> : null}
            <fieldset className="profile-form-section" disabled={loading}>
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
            <footer className="profile-page-footer">
              <button type="submit" className="btn primary" disabled={disabled}>
                {saving ? t("common.saving") : t("common.saveChanges")}
              </button>
            </footer>
          </form>
        ) : null}

        {tab === "location" ? (
          <form id={locationFormId} className="form profile-page-form" onSubmit={submitLocation}>
            <fieldset className="profile-form-section" disabled={loading}>
              <PlacesLocationPicker disabled={disabled} onPlaceSelected={onPlaceSelected} />
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
                <span>{t("fields.keys.latitude")}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={coordInputValue(values.latitude)}
                  disabled={disabled}
                  onChange={(event) => setValues({ ...values, latitude: parseCoordInput(event.target.value) })}
                />
              </label>
              <label className="field">
                <span>{t("fields.keys.longitude")}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={coordInputValue(values.longitude)}
                  disabled={disabled}
                  onChange={(event) => setValues({ ...values, longitude: parseCoordInput(event.target.value) })}
                />
              </label>
              <ProfileLocationMap
                latitude={values.latitude}
                longitude={values.longitude}
                address={values.address}
              />
              <div className="profile-location-actions">
                <button type="button" className="btn" disabled={disabled} onClick={clearLocation}>
                  {t("profile.location.clear")}
                </button>
                {mapsExternalUrl ? (
                  <a className="btn" href={mapsExternalUrl} target="_blank" rel="noopener noreferrer">
                    {t("profile.location.openInMaps")}
                  </a>
                ) : null}
              </div>
            </fieldset>
            <footer className="profile-page-footer">
              <button type="submit" className="btn primary" disabled={disabled}>
                {saving ? t("common.saving") : t("common.saveChanges")}
              </button>
            </footer>
          </form>
        ) : null}

        {tab === "security" ? (
          <form id={securityFormId} className="form profile-page-form" onSubmit={submitSecurity}>
            <fieldset className="profile-form-section" disabled={loading}>
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
            <footer className="profile-page-footer">
              <button type="submit" className="btn primary" disabled={disabled}>
                {saving ? t("common.saving") : t("common.saveChanges")}
              </button>
            </footer>
          </form>
        ) : null}

        {tab === "privacy" ? (
          <div className="profile-page-form">
            <fieldset className="profile-form-section profile-form-section--danger" disabled={loading}>
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
          </div>
        ) : null}
      </div>
    </section>
  );
}