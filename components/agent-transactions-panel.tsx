"use client";

import { useEffect, useState } from "react";
import { userMessageForNetwork, userMessageFromResponse } from "../lib/api-errors";
import { authFetch } from "../lib/auth";
import { LedgerTransactionList, type LedgerTransactionRow } from "./ledger-transaction-list";

type AgentTransactionsPanelProps = {
  reloadKey?: number;
  onForbidden?: () => void;
};

export function AgentTransactionsPanel({ reloadKey = 0, onForbidden }: AgentTransactionsPanelProps) {
  const [transactions, setTransactions] = useState<LedgerTransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await authFetch("/agents/me/transactions");

        if (res.status === 401 || res.status === 403) {
          onForbidden?.();
          return;
        }

        if (!res.ok) {
          throw new Error(await userMessageFromResponse("load", res));
        }

        if (!active) {
          return;
        }

        setTransactions((await res.json()) as LedgerTransactionRow[]);
      } catch (loadError) {
        if (!active) {
          return;
        }
        const message = loadError instanceof Error ? loadError.message : userMessageForNetwork("load");
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [reloadKey, onForbidden]);

  return (
    <article className="card panel">
      <div className="panel-head">
        <div>
          <h2>My transactions</h2>
          <p className="sub">Top-ups you sent from your float to rider and owner wallets.</p>
        </div>
      </div>
      <LedgerTransactionList transactions={transactions} loading={loading} error={error} />
    </article>
  );
}
