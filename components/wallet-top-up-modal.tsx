"use client";

import { FormEvent, useEffect, useState } from "react";
import { userMessageForNetwork, userMessageFromResponse } from "../lib/api-errors";
import { authFetch } from "../lib/auth";
import type { WalletTopUpTargetRow } from "../lib/wallet-row-helpers";
import { Modal } from "./modal";

export type WalletTopUpTarget = WalletTopUpTargetRow;

type CompanyAccountOption = {
  id: number;
  name: string;
  bankName: string | null;
  accountNumber: string | null;
  currency: string;
};

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
  const [companyAccountId, setCompanyAccountId] = useState("");
  const [externalReference, setExternalReference] = useState("");
  const [description, setDescription] = useState("");
  const [companyAccounts, setCompanyAccounts] = useState<CompanyAccountOption[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && wallet) {
      setAmount("");
      setCompanyAccountId("");
      setExternalReference("");
      setDescription("");
      setError(null);
    }
  }, [open, wallet]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    setAccountsLoading(true);

    void (async () => {
      try {
        const response = await authFetch("/company-accounts");
        if (!response.ok || cancelled) {
          return;
        }
        const data = (await response.json()) as CompanyAccountOption[];
        if (!cancelled) {
          setCompanyAccounts(data);
          if (data.length === 1) {
            setCompanyAccountId(String(data[0].id));
          }
        }
      } catch {
        if (!cancelled) {
          setCompanyAccounts([]);
        }
      } finally {
        if (!cancelled) {
          setAccountsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

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

    const accountId = Number(companyAccountId);
    if (!companyAccountId || Number.isNaN(accountId) || accountId < 1) {
      setError("Select the company account that received the transfer.");
      return;
    }

    const bankRef = externalReference.trim();
    if (bankRef.length < 2) {
      setError("Enter the bank transfer reference from the proof of payment.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await authFetch(`/wallets/${wallet.id}/float-credit`, {
        method: "POST",
        body: JSON.stringify({
          amount: add,
          companyAccountId: accountId,
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
      description={`Credit float for ${wallet.ownerLabel} after verifying bank payment. Current balance: ${wallet.currentBalance.toLocaleString()} ${wallet.currency}`}
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
          <span>Company account</span>
          <select
            value={companyAccountId}
            disabled={saving || accountsLoading || companyAccounts.length === 0}
            onChange={(event) => setCompanyAccountId(event.target.value)}
            aria-label="Company account"
          >
            <option value="">Select account…</option>
            {companyAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
                {account.accountNumber ? ` · ${account.accountNumber}` : ""} ({account.currency})
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Bank transfer reference</span>
          <input
            type="text"
            value={externalReference}
            disabled={saving}
            onChange={(event) => setExternalReference(event.target.value)}
            placeholder="e.g. TXN-2026-00412"
            aria-label="Bank transfer reference"
          />
        </label>

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

        <label className="field">
          <span>Notes (optional)</span>
          <input
            type="text"
            value={description}
            disabled={saving}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Internal note"
            aria-label="Top-up description"
          />
        </label>
      </form>
    </Modal>
  );
}
