"use client";

import { FormEvent, useEffect, useState } from "react";
import { userMessageForNetwork, userMessageFromResponse } from "../lib/api-errors";
import { authFetch } from "../lib/auth";
import type { AgentWalletTopUpTarget } from "../lib/wallet-row-helpers";
import { Modal } from "./modal";

type AgentWalletTopUpModalProps = {
  open: boolean;
  target: AgentWalletTopUpTarget | null;
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

export function AgentWalletTopUpModal({
  open,
  target,
  onClose,
  onSaved,
  onError,
}: AgentWalletTopUpModalProps) {
  const [amount, setAmount] = useState("");
  const [externalReference, setExternalReference] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && target) {
      setAmount("");
      setExternalReference("");
      setDescription("");
      setError(null);
    }
  }, [open, target]);

  if (!target) {
    return null;
  }

  const formId = "agent-wallet-top-up-form";
  const kindLabel = target.kind === "owner" ? "Owner" : "Rider";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const add = parseAmount(amount);
    if (add === null) {
      setError("Enter a positive amount.");
      return;
    }

    const bankRef = externalReference.trim();
    if (bankRef.length < 2) {
      setError("Enter the cash receipt reference.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await authFetch("/agents/top-ups", {
        method: "POST",
        body: JSON.stringify({
          walletId: target.walletId,
          amount: add,
          externalReference: bankRef,
          description: description.trim() || undefined,
        }),
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
      description={`Move float from your balance to this ${kindLabel.toLowerCase()}. ${kindLabel}: ${target.name}. Wallet balance: ${target.currentBalance.toLocaleString()} ${target.currency}`}
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
          <span>Amount ({target.currency})</span>
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

        <label className="field">
          <span>Receipt reference</span>
          <input
            type="text"
            value={externalReference}
            disabled={saving}
            onChange={(event) => setExternalReference(event.target.value)}
            placeholder="Cash receipt id"
            aria-label="Receipt reference"
          />
        </label>

        <label className="field">
          <span>Notes (optional)</span>
          <input
            type="text"
            value={description}
            disabled={saving}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Internal note"
            aria-label="Top-up notes"
          />
        </label>
      </form>
    </Modal>
  );
}
