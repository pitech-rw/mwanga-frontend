"use client";

import { FormEvent, useEffect, useState } from "react";
import { userMessageForNetwork, userMessageFromResponse } from "../lib/api-errors";
import { authFetch } from "../lib/auth";
import type { WalletTopUpTargetRow } from "../lib/wallet-row-helpers";
import { Modal } from "./modal";

export type WalletTopUpTarget = WalletTopUpTargetRow;

type WalletTopUpModalProps = {
  open: boolean;
  wallet: WalletTopUpTarget | null;
  onClose: () => void;
  onSaved?: () => void;
  onError?: (message: string) => void;
};

function parseAmount(raw: string): number | null {
  const n = Number(raw.trim());
  if (raw.trim() === "" || Number.isNaN(n) || n <= 0) {
    return null;
  }
  return n;
}

export function WalletTopUpModal({ open, wallet, onClose, onSaved, onError }: WalletTopUpModalProps) {
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && wallet) {
      setAmount("");
      setError(null);
    }
  }, [open, wallet]);

  if (!wallet) {
    return null;
  }

  const formId = "wallet-top-up-form";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const add = parseAmount(amount);
    if (add === null) {
      setError("Enter a positive amount to add.");
      return;
    }

    setSaving(true);
    setError(null);

    const newBalance = wallet.currentBalance + add;

    try {
      const response = await authFetch(`/wallets/${wallet.id}`, {
        method: "PATCH",
        body: JSON.stringify({ balance: newBalance }),
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
      title="Top up wallet"
      description={`Add credit for ${wallet.ownerLabel}. Current balance: ${wallet.currentBalance.toLocaleString()} ${wallet.currency}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form={formId} className="btn primary" disabled={saving}>
            {saving ? "Saving…" : "Apply top-up"}
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
          <span>Amount to add ({wallet.currency})</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={amount}
            disabled={saving}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="e.g. 5000"
            aria-label="Top-up amount"
          />
        </label>
      </form>
    </Modal>
  );
}
