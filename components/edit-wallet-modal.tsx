"use client";

import { FormEvent, useEffect, useState } from "react";
import { userMessageForNetwork, userMessageFromResponse } from "../lib/api-errors";
import { authFetch } from "../lib/auth";
import type { WalletEditTarget } from "../lib/wallet-row-helpers";
import { Modal } from "./modal";

type EditWalletModalProps = {
  open: boolean;
  wallet: WalletEditTarget | null;
  onClose: () => void;
  onSaved?: () => void;
  onError?: (message: string) => void;
};

function parseBalance(raw: string): number | null {
  const t = raw.trim();
  if (t === "") {
    return null;
  }
  const n = Number(t);
  if (Number.isNaN(n) || n < 0) {
    return null;
  }
  return n;
}

export function EditWalletModal({ open, wallet, onClose, onSaved, onError }: EditWalletModalProps) {
  const [balance, setBalance] = useState("");
  const [currency, setCurrency] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && wallet) {
      setBalance(String(wallet.currentBalance));
      setCurrency(wallet.currency);
      setError(null);
    }
  }, [open, wallet]);

  if (!wallet) {
    return null;
  }

  const formId = "edit-wallet-form";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const bal = parseBalance(balance);
    if (bal === null) {
      setError("Enter a valid balance (0 or greater).");
      return;
    }

    const cur = currency.trim();
    if (cur.length > 10) {
      setError("Currency code must be at most 10 characters.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const body: Record<string, unknown> = { balance: bal };
      if (cur) {
        body.currency = cur;
      }

      const response = await authFetch(`/wallets/${wallet.id}`, {
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
      title="Edit wallet"
      description={`Set balance and currency for ${wallet.ownerLabel}.`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form={formId} className="btn primary" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
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
          <span>Balance</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={balance}
            disabled={saving}
            onChange={(event) => setBalance(event.target.value)}
            aria-label="Wallet balance"
          />
        </label>

        <label className="field">
          <span>Currency</span>
          <input
            type="text"
            value={currency}
            maxLength={10}
            disabled={saving}
            onChange={(event) => setCurrency(event.target.value)}
            placeholder="e.g. CDF"
            aria-label="Currency code"
          />
        </label>
      </form>
    </Modal>
  );
}
