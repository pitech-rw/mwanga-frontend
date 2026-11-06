"use client";

import { FormEvent, useEffect, useState } from "react";
import { userMessageForNetwork, userMessageFromResponse } from "../lib/api-errors";
import { authFetch } from "../lib/auth";
import type { ResourceSection } from "../lib/resource-create-config";
import { getMenuItem } from "../lib/nav";
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

  const menu = getMenuItem(section);
  const recordLabel = recordLabelForRow(section, row);
  const formId = `delete-resource-${section}-${recordId}`;
  const canSubmit = confirmText.trim().toUpperCase() === "DELETE";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) {
      setError('Type DELETE to confirm.');
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const response = await authFetch(`${menu.apiPath}/${recordId}`, {
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
      title={`Delete ${menu.label}`}
      description={`This permanently deletes ${recordLabel}. This cannot be undone.`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={deleting}>
            Cancel
          </button>
          <button type="submit" form={formId} className="btn primary btn-danger" disabled={deleting || !canSubmit}>
            {deleting ? "Deleting…" : "Delete"}
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
          <span>Type DELETE to confirm</span>
          <input
            type="text"
            autoComplete="off"
            value={confirmText}
            disabled={deleting}
            onChange={(event) => setConfirmText(event.target.value)}
            placeholder="DELETE"
            aria-label="Type DELETE to confirm deletion"
          />
        </label>
      </form>
    </Modal>
  );
}
