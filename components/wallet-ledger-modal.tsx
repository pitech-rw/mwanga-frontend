"use client";

import { useEffect, useState } from "react";
import { userMessageForNetwork, userMessageFromResponse } from "../lib/api-errors";
import { authFetch } from "../lib/auth";
import type { WalletTopUpTargetRow } from "../lib/wallet-row-helpers";
import { Modal } from "./modal";

type LedgerLine = {
  direction: string;
  amount: string | number;
  companyAccountId?: number | null;
  walletId?: number | null;
  revenueAccountId?: number | null;
};

type LedgerTransaction = {
  id: number;
  kind: string;
  externalReference?: string | null;
  description?: string | null;
  createdAt: string;
  lines?: LedgerLine[];
};

type WalletLedgerModalProps = {
  open: boolean;
  wallet: WalletTopUpTargetRow | null;
  onClose: () => void;
};

function formatAmount(value: string | number): string {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(value);
}

function formatKind(kind: string): string {
  return kind.replace(/_/g, " ");
}

export function WalletLedgerModal({ open, wallet, onClose }: WalletLedgerModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);

  useEffect(() => {
    if (!open || !wallet) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setTransactions([]);

    void (async () => {
      try {
        const response = await authFetch(`/wallets/${wallet.id}/transactions`);
        if (cancelled) {
          return;
        }
        if (!response.ok) {
          setError(await userMessageFromResponse("read", response));
          return;
        }
        const data = (await response.json()) as LedgerTransaction[];
        setTransactions(data);
      } catch {
        if (!cancelled) {
          setError(userMessageForNetwork("read"));
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
  }, [open, wallet]);

  if (!wallet) {
    return null;
  }

  return (
    <Modal
      open={open}
      variant="panel"
      title="Wallet ledger"
      description={`Immutable ledger for ${wallet.ownerLabel}`}
      onClose={onClose}
      footer={
        <button type="button" className="btn" onClick={onClose}>
          Close
        </button>
      }
    >
      {loading ? <p>Loading transactions…</p> : null}
      {error ? (
        <div className="login-error" role="alert">
          {error}
        </div>
      ) : null}

      {!loading && !error && transactions.length === 0 ? (
        <p>No ledger transactions yet.</p>
      ) : null}

      {!loading && transactions.length > 0 ? (
        <ul className="wallet-ledger-list">
          {transactions.map((tx) => (
            <li key={tx.id} className="wallet-ledger-item">
              <div className="wallet-ledger-item-head">
                <span>
                  <strong>{formatKind(tx.kind)}</strong>
                  {tx.externalReference ? ` · ${tx.externalReference}` : ""}
                </span>
                <span>{new Date(tx.createdAt).toLocaleString()}</span>
              </div>
              {tx.description ? <p>{tx.description}</p> : null}
              {tx.lines && tx.lines.length > 0 ? (
                <ul className="wallet-ledger-lines">
                  {tx.lines.map((line, index) => (
                    <li key={`${tx.id}-${index}`}>
                      {line.direction} {formatAmount(line.amount)}
                      {line.companyAccountId != null ? ` · company #${line.companyAccountId}` : ""}
                      {line.walletId != null ? ` · wallet #${line.walletId}` : ""}
                      {line.revenueAccountId != null ? ` · revenue #${line.revenueAccountId}` : ""}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </Modal>
  );
}
