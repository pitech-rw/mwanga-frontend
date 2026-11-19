"use client";

import { useT } from "./locale";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { userMessageForNetwork, userMessageFromResponse } from "../lib/api-errors";
import { authFetch } from "../lib/auth";
import type { ResourceSection } from "../lib/resource-create-config";
import type { FieldSpec } from "../lib/resource-create-config";
import { getMenuItem } from "../lib/nav";
import { localizedMenuItem } from "../lib/nav-i18n";
import { localizeField } from "../lib/i18n/localize";
import { buildUpdatePatchPayload, initialValuesForUpdate } from "../lib/resource-edit-payload";
import { mergeUserEditExtras, userAccountType } from "../lib/user-update-fields";
import { ownerOptionLine, type OwnerListRow } from "../lib/owner-list-format";
import { emptyFileState, mergeUploadedFiles } from "../lib/resource-form-files";
import { recordLabelForRow } from "../lib/resource-record-label";
import { STATION_LOCATION_FIELD_NAMES } from "../lib/station-form-fields";
import { PlacesLocationPicker } from "./places-location-picker";
import { ResourceFormField } from "./resource-form-field";
import { Modal } from "./modal";

export type EditResourceTarget = {
  section: ResourceSection;
  id: number;
  row: Record<string, unknown>;
  fields: FieldSpec[];
};

type EditResourceModalProps = {
  open: boolean;
  target: EditResourceTarget | null;
  onClose: () => void;
  onSaved?: () => void;
  onError?: (message: string) => void;
};

export function EditResourceModal({ open, target, onClose, onSaved, onError }: EditResourceModalProps) {
  const t = useT();
  const [values, setValues] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stations, setStations] = useState<{ id: number; code: string; name: string }[]>([]);
  const [owners, setOwners] = useState<OwnerListRow[]>([]);
  const [loadingUserLinks, setLoadingUserLinks] = useState(false);

  useEffect(() => {
    if (open && target) {
      const base = initialValuesForUpdate(target.section, target.row, target.fields);
      if (target.section === "users") {
        base.address = typeof target.row.address === "string" ? target.row.address : "";
        base.stationId = target.row.stationId != null ? String(target.row.stationId) : "";
        base.ownerId = target.row.ownerId != null ? String(target.row.ownerId) : "";
        base.reactivate = "false";
      }
      setValues(base);
      setFiles(emptyFileState(target.fields));
      setError(null);
    }
  }, [open, target]);

  useEffect(() => {
    if (!open || !target || target.section !== "users") {
      return;
    }

    const accountType = values.type?.trim() || userAccountType(target.row);
    if (accountType !== "swapper" && accountType !== "rider") {
      return;
    }

    let active = true;
    setLoadingUserLinks(true);

    const load = async () => {
      try {
        if (accountType === "swapper") {
          const response = await authFetch("/stations");
          if (response.ok) {
            const data = (await response.json()) as unknown;
            if (active) {
              setStations(Array.isArray(data) ? (data as typeof stations) : []);
            }
          }
        }
        if (accountType === "rider") {
          const response = await authFetch("/owners");
          if (response.ok) {
            const data = (await response.json()) as unknown;
            if (active) {
              setOwners(Array.isArray(data) ? (data as OwnerListRow[]) : []);
            }
          }
        }
      } finally {
        if (active) {
          setLoadingUserLinks(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [open, target, values.type]);

  const onStationPlaceSelected = useCallback(
    (place: { address: string; latitude: number; longitude: number }) => {
      setValues((prev) => ({
        ...prev,
        address: place.address,
        latitude: String(place.latitude),
        longitude: String(place.longitude),
      }));
    },
    [],
  );

  const onUserAddressSelected = useCallback((place: { address: string }) => {
    setValues((prev) => ({ ...prev, address: place.address }));
  }, []);

  const userAccountTypeLive = target
    ? values.type?.trim() || userAccountType(target.row)
    : "";

  const stationOptions = useMemo(
    () =>
      [...stations].sort((a, b) =>
        `${a.code} ${a.name}`.localeCompare(`${b.code} ${b.name}`, undefined, { sensitivity: "base" }),
      ),
    [stations],
  );

  const ownerOptions = useMemo(
    () =>
      [...owners].sort((a, b) =>
        ownerOptionLine(a).localeCompare(ownerOptionLine(b), undefined, { sensitivity: "base" }),
      ),
    [owners],
  );

  if (!target) {
    return null;
  }

  const { section, id, fields } = target;
  const menu = localizedMenuItem(section, t);
  const recordLabel = recordLabelForRow(section, target.row);
  const formId = `edit-resource-${section}-${id}`;
  const localizedFields = fields.map((field) => localizeField(field, t));
  const stationLocationFields =
    section === "stations"
      ? localizedFields.filter((field) => STATION_LOCATION_FIELD_NAMES.has(field.name))
      : [];
  const stationDetailFields =
    section === "stations"
      ? localizedFields.filter((field) => !STATION_LOCATION_FIELD_NAMES.has(field.name))
      : section === "users"
        ? localizedFields
        : localizedFields;

  const userInactive = section === "users" && target.row.isActive === false;
  const userEditLocked = userInactive && values.reactivate !== "true";

  const renderField = (field: FieldSpec) => (
    <ResourceFormField
      key={field.name}
      field={field}
      value={values[field.name] ?? ""}
      disabled={saving || userEditLocked}
      onValueChange={(next) => setValues({ ...values, [field.name]: next })}
      file={files[field.name] ?? null}
      onFileChange={(next) => setFiles({ ...files, [field.name]: next })}
      existingFileUrl={
        field.type === "file" && typeof target.row[field.name] === "string"
          ? (target.row[field.name] as string)
          : null
      }
    />
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    setSaving(true);
    setError(null);

    try {
      const valuesForPatch = { ...values };
      await mergeUploadedFiles(fields, files, valuesForPatch);

      let body = buildUpdatePatchPayload(section, target.row, fields, valuesForPatch);
      if (section === "users") {
        if (userInactive && values.reactivate !== "true") {
          setError(t("modals.edit.user.fieldsLockedHint"));
          setSaving(false);
          return;
        }
        if (userInactive && values.reactivate === "true" && !(values.password?.trim() ?? "")) {
          setError(t("modals.edit.user.reactivatePasswordRequired"));
          setSaving(false);
          return;
        }
        body = mergeUserEditExtras(target.row, values, body);
      }
      if (body === null) {
        setError(t("validation.noChanges"));
        setSaving(false);
        return;
      }
      const response = await authFetch(`${menu.apiPath}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const message = await userMessageFromResponse("create", response);
        setError(message);
        onError?.(message);
        return;
      }

      onSaved?.();
      onClose();
    } catch {
      const message = userMessageForNetwork("create");
      setError(message);
      onError?.(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      variant="panel"
      title={t("modals.edit.title", { label: menu.label })}
      description={t("modals.edit.description", { record: recordLabel })}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={saving}>
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            form={formId}
            className="btn primary"
            disabled={saving || (userInactive && values.reactivate !== "true")}
          >
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

        {section === "stations" ? (
          <fieldset className="edit-station-location">
            <legend className="sub">{t("create.drawer.tab.location")}</legend>
            <PlacesLocationPicker disabled={saving} onPlaceSelected={onStationPlaceSelected} />
            {stationLocationFields.map((field) => renderField(field))}
          </fieldset>
        ) : null}

        {section === "users" ? (
          <>
            {userInactive ? (
              <div className="edit-user-reactivate" role="region">
                <p className="edit-user-sign-in-value">{t("modals.edit.user.statusInactive")}</p>
                <p className="sub">{t("modals.edit.user.reactivateHint")}</p>
                <label className="field field-checkbox">
                  <input
                    type="checkbox"
                    checked={values.reactivate === "true"}
                    disabled={saving}
                    onChange={(event) =>
                      setValues({ ...values, reactivate: event.target.checked ? "true" : "false" })
                    }
                  />
                  <span>{t("modals.edit.user.reactivateEnable")}</span>
                </label>
                {userEditLocked ? (
                  <p className="sub">{t("modals.edit.user.fieldsLockedHint")}</p>
                ) : null}
              </div>
            ) : null}
            <fieldset className="edit-user-address" disabled={userEditLocked}>
              <legend className="sub">{t("modals.edit.user.addressLegend")}</legend>
              <PlacesLocationPicker disabled={saving || userEditLocked} onPlaceSelected={onUserAddressSelected} />
              <label className="field">
                <span>{t("detail.labels.address")}</span>
                <textarea
                  rows={2}
                  value={values.address ?? ""}
                  disabled={saving || userEditLocked}
                  onChange={(event) => setValues({ ...values, address: event.target.value })}
                />
              </label>
            </fieldset>
          </>
        ) : null}

        {stationDetailFields.map((field) => renderField(field))}

        {section === "users" && userAccountTypeLive === "swapper" ? (
          <label className="field">
            <span>{t("modals.edit.user.stationField")}</span>
            <select
              value={values.stationId ?? ""}
              disabled={saving || loadingUserLinks || userEditLocked}
              onChange={(event) => setValues({ ...values, stationId: event.target.value })}
            >
              <option value="">{t("modals.edit.user.noStation")}</option>
              {stationOptions.map((station) => (
                <option key={station.id} value={String(station.id)}>
                  {station.code} — {station.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {section === "users" && userAccountTypeLive === "rider" ? (
          <label className="field">
            <span>{t("modals.edit.user.fleetOwnerField")}</span>
            <select
              value={values.ownerId ?? ""}
              disabled={saving || loadingUserLinks || ownerOptions.length === 0 || userEditLocked}
              required
              onChange={(event) => setValues({ ...values, ownerId: event.target.value })}
            >
              {ownerOptions.length === 0 ? (
                <option value="">{t("modals.edit.user.noFleetOwner")}</option>
              ) : null}
              {ownerOptions.map((owner) => (
                <option key={owner.id} value={String(owner.id)}>
                  {ownerOptionLine(owner)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </form>
    </Modal>
  );
}
