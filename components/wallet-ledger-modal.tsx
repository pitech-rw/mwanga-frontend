"use client";

import { useEffect, useState } from "react";
import { userMessageForNetwork, userMessageFromResponse } from "../lib/api-errors";
import { authFetch } from "../lib/auth";
import type { AccountLedgerTarget } from "../lib/wallet-row-helpers";
import { LedgerTransactionList, type LedgerTransactionRow } from "./ledger-transaction-list";
import { Modal } from "./modal";

type WalletLedgerModalProps = {
  open: boolean;
  account: AccountLedgerTarget | null;
  onClose: () => void;
};

export function WalletLedgerModal({ open, account, onClose }: WalletLedgerModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<LedgerTransactionRow[]>([]);

  useEffect(() => {
    if (!open || !account) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setTransactions([]);

    void (async () => {
      try {
        const response = await authFetch(account.transactionsPath);
        if (cancelled) {
          return;
        }
        if (!response.ok) {
          setError(await userMessageFromResponse("load", response));
          return;
        }
        const data = (await response.json()) as LedgerTransactionRow[];
        setTransactions(data);
      } catch {
        if (!cancelled) {
          setError(userMessageForNetwork("load"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, account]);

  if (!account) {
    return null;
  }

  return (
    <Modal
      open={open}
      variant="panel"
      title="Wallet ledger"
      description={`Immutable ledger for ${account.label}`}
      onClose={onClose}
      footer={
        <button type="button" className="btn" onClick={onClose}>
          Close
        </button>
      }
    >
      <LedgerTransactionList transactions={transactions} loading={loading} error={error} />
    </Modal>
  );
}
