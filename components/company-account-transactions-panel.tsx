"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { userMessageForNetwork, userMessageFromResponse } from "../lib/api-errors";
import { authFetch } from "../lib/auth";
import { sectionHref } from "../lib/nav-path";
import { LedgerTransactionList, type LedgerTransactionRow } from "./ledger-transaction-list";

type CompanyAccount = {
  id: number;
  name: string;
  bankName?: string | null;
  accountNumber?: string | null;
  currency: string;
  balance: string | number;
};

type CompanyAccountTransactionsPanelProps = {
  accountId: number;
  pathPrefix: string;
  onForbidden?: () => void;
};

export function CompanyAccountTransactionsPanel({
  accountId,
  pathPrefix,
  onForbidden,
}: CompanyAccountTransactionsPanelProps) {
  const [account, setAccount] = useState<CompanyAccount | null>(null);
  const [transactions, setTransactions] = useState<LedgerTransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [accountRes, txRes] = await Promise.all([
          authFetch(`/company-accounts/${accountId}`),
          authFetch(`/company-accounts/${accountId}/transactions`),
        ]);

        if (accountRes.status === 401 || accountRes.status === 403 || txRes.status === 401 || txRes.status === 403) {
          onForbidden?.();
          return;
        }

        if (!accountRes.ok) {
          throw new Error(await userMessageFromResponse("load", accountRes));
        }

        if (!txRes.ok) {
          throw new Error(await userMessageFromResponse("load", txRes));
        }

        if (!active) {
          return;
        }

        setAccount((await accountRes.json()) as CompanyAccount);
        setTransactions((await txRes.json()) as LedgerTransactionRow[]);
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
  }, [accountId, onForbidden]);

  const balance =
    account?.balance != null
      ? Number(account.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : "—";

  return (
    <article className="card panel">
      <div className="panel-head">
        <div>
          <h2>{account?.name ?? `Account #${accountId}`}</h2>
          {account ? (
            <p className="sub">
              {account.bankName ? `${account.bankName} · ` : ""}
              {account.accountNumber ?? "—"} · Balance {balance} {account.currency}
            </p>
          ) : null}
        </div>
        <Link className="btn" href={sectionHref(pathPrefix, "companyAccounts")}>
          Back to accounts
        </Link>
      </div>
      <LedgerTransactionList transactions={transactions} loading={loading} error={error} />
    </article>
  );
}
