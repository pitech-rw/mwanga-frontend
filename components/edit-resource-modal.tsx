"use client";

import { useT } from "./locale";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { userMessageForNetwork, userMessageFromResponse } from "../lib/api-errors";
import { authFetch } from "../lib/auth";
import type { ResourceSection } from "../lib/resource-create-config";
import type { FieldSpec } from "../lib/resource-create-config";
import { getMenuItem } from "../lib/nav";
import { localizedMenuItem } from "../lib/nav-i18n";
import { localizeField } from "../lib/i18n/localize";
import { buildUpdatePatchPayload, initialValuesForUpdate } from "../lib/resource-edit-payload";
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

  useEffect(() => {
    if (open && target) {
      setValues(initialValuesForUpdate(target.section, target.row, target.fields));
      setFiles(emptyFileState(target.fields));
      setError(null);
    }
  }, [open, target]);

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
      : localizedFields;

  const renderField = (field: FieldSpec) => (
    <ResourceFormField
      key={field.name}
      field={field}
      value={values[field.name] ?? ""}
      disabled={saving}
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

      const body = buildUpdatePatchPayload(section, target.row, fields, valuesForPatch);
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
          <button type="submit" form={formId} className="btn primary" disabled={saving}>
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

        {stationDetailFields.map((field) => renderField(field))}
      </form>
    </Modal>
  );
}
