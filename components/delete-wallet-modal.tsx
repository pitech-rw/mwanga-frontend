"use client";

import { FormEvent, useEffect, useState } from "react";
import { userMessageForNetwork, userMessageFromResponse } from "../lib/api-errors";
import { authFetch } from "../lib/auth";
import { Modal } from "./modal";

type DeleteWalletModalProps = {
  open: boolean;
  walletId: number | null;
  ownerLabel: string;
  onClose: () => void;
  onDeleted?: () => void;
  onError?: (message: string) => void;
};

export function DeleteWalletModal({
  open,
  walletId,
  ownerLabel,
  onClose,
  onDeleted,
  onError,
}: DeleteWalletModalProps) {
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setConfirmText("");
      setError(null);
    }
  }, [open, walletId]);

  if (walletId === null) {
    return null;
  }

  const formId = "delete-wallet-form";
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
      const response = await authFetch(`/wallets/${walletId}`, {
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
      title="Delete wallet"
      description={`This removes the wallet for ${ownerLabel}. This cannot be undone if the account relies on it for payments.`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={deleting}>
            Cancel
          </button>
          <button type="submit" form={formId} className="btn primary btn-danger" disabled={deleting || !canSubmit}>
            {deleting ? "Deleting…" : "Delete wallet"}
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
            aria-label="Type DELETE to confirm wallet deletion"
          />
        </label>
      </form>
    </Modal>
  );
}
