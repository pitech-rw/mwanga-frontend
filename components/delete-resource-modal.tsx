"use client";

import { useT } from "./locale";

import { FormEvent, useEffect, useState } from "react";
import { userMessageForNetwork, userMessageFromResponse } from "../lib/api-errors";
import { authFetch } from "../lib/auth";
import type { ResourceSection } from "../lib/resource-create-config";
import { getMenuItem } from "../lib/nav";
import { localizedMenuItem } from "../lib/nav-i18n";
import { recordLabelForRow } from "../lib/resource-record-label";
import { Modal } from "./modal";

type DeleteResourceModalProps = {
  open: boolean;
  section: ResourceSection | null;
  recordId: number | null;
  row: Record<string, unknown> | null;
  onClose: () => void;
  onDeleted?: () => void;
  onError?: (message: string) => void;
};

export function DeleteResourceModal({
  open,
  section,
  recordId,
  row,
  onClose,
  onDeleted,
  onError,
}: DeleteResourceModalProps) {
  const t = useT();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setConfirmText("");
      setError(null);
    }
  }, [open, section, recordId]);

  if (!section || recordId === null || !row) {
    return null;
  }

  const menu = localizedMenuItem(section, t);
  const recordLabel = recordLabelForRow(section, row);
  const formId = `delete-resource-${section}-${recordId}`;
  const canSubmit = confirmText.trim().toUpperCase() === "DELETE";
  const isUserDeactivate = section === "users";
  const actionLabel = isUserDeactivate ? t("common.deactivate") : t("common.delete");
  const actionGerund = isUserDeactivate ? t("common.deactivating") : t("common.deleting");
  const description = isUserDeactivate
    ? t("modals.delete.descriptionDeactivate", { record: recordLabel })
    : t("modals.delete.descriptionDelete", { record: recordLabel });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) {
      setError(t("common.confirmDeleteError"));
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const response = await authFetch(`${getMenuItem(section).apiPath}/${recordId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const message = await userMessageFromResponse("create", response);
        setError(message);
        onError?.(message);
        return;
      }

      onDeleted?.();
      onClose();
    } catch {
      const message = userMessageForNetwork("create");
      setError(message);
      onError?.(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      open={open}
      variant="panel"
      title={
        isUserDeactivate
          ? t("modals.delete.titleDeactivate", { label: menu.label })
          : t("modals.delete.titleDelete", { label: menu.label })
      }
      description={description}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={deleting}>
            {t("common.cancel")}
          </button>
          <button type="submit" form={formId} className="btn primary btn-danger" disabled={deleting || !canSubmit}>
            {deleting ? actionGerund : actionLabel}
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

        <label className="field">
          <span>{t("common.confirmDeleteHint")}</span>
          <input
            type="text"
            autoComplete="off"
            value={confirmText}
            disabled={deleting}
            onChange={(event) => setConfirmText(event.target.value)}
            placeholder={t("common.confirmDeletePlaceholder")}
            aria-label={t("modals.delete.confirmAria")}
          />
        </label>
      </form>
    </Modal>
  );
}