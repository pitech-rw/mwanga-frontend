"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { userMessageForNetwork, userMessageFromResponse } from "../lib/api-errors";
import { authFetch } from "../lib/auth";

type FloatWallet = {
  id: number;
  balance: string | number;
  currency: string;
};

type LedgerLine = {
  direction: string;
  amount: string | number;
  walletId: number | null;
};

type LedgerRow = {
  id: number;
  kind: string;
  description: string | null;
  externalReference: string | null;
  createdAt: string;
  lines: LedgerLine[];
};

type TopUpTarget = {
  kind: "rider" | "owner";
  name: string;
  walletId: number;
};

function money(value: string | number): string {
  const amount = Number(value);
  if (Number.isNaN(amount)) {
    return String(value);
  }
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function AgentTopUpPanel() {
  const [wallet, setWallet] = useState<FloatWallet | null>(null);
  const [history, setHistory] = useState<LedgerRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [target, setTarget] = useState<TopUpTarget | null>(null);
  const [amount, setAmount] = useState("");
  const [externalReference, setExternalReference] = useState("");
  const [description, setDescription] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadFloat = useCallback(async () => {
    const response = await authFetch("/wallets");
    if (!response.ok) {
      throw new Error(await userMessageFromResponse("load", response));
    }
    const wallets = (await response.json()) as FloatWallet[];
    const floatWallet = wallets[0] ?? null;
    setWallet(floatWallet);
    if (!floatWallet) {
      setHistory([]);
      return;
    }
    const ledger = await authFetch(`/wallets/${floatWallet.id}/transactions`);
    if (!ledger.ok) {
      throw new Error(await userMessageFromResponse("load", ledger));
    }
    setHistory((await ledger.json()) as LedgerRow[]);
  }, []);

  useEffect(() => {
    let active = true;
    loadFloat()
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        setLoadError(error instanceof Error ? error.message : userMessageForNetwork("load"));
      });
    return () => {
      active = false;
    };
  }, [loadFloat]);

  const lookup = async () => {
    const trimmed = phone.trim();
    setFormError(null);
    setNotice(null);
    setTarget(null);
    if (trimmed.length < 2) {
      setFormError("Enter the rider or owner phone number.");
      return;
    }
    setLookingUp(true);
    try {
      const response = await authFetch(`/agents/top-up-targets?phone=${encodeURIComponent(trimmed)}`);
      if (!response.ok) {
        setFormError(await userMessageFromResponse("load", response));
        return;
      }
      setTarget((await response.json()) as TopUpTarget);
    } catch {
      setFormError(userMessageForNetwork("load"));
    } finally {
      setLookingUp(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setNotice(null);
    if (!target) {
      setFormError("Look up a rider or owner before applying the top-up.");
      return;
    }
    const parsed = Number(amount.trim());
    if (amount.trim() === "" || Number.isNaN(parsed) || parsed <= 0) {
      setFormError("Enter an amount greater than zero.");
      return;
    }
    if (externalReference.trim().length < 2) {
      setFormError("Enter the cash receipt reference.");
      return;
    }
    setSaving(true);
    try {
      const response = await authFetch("/agents/top-ups", {
        method: "POST",
        body: JSON.stringify({
          walletId: target.walletId,
          amount: parsed,
          externalReference: externalReference.trim(),
          description: description.trim() || undefined,
        }),
      });
      if (!response.ok) {
        setFormError(await userMessageFromResponse("create", response));
        return;
      }
      const created = (await response.json()) as LedgerRow;
      setNotice(`Topped up ${target.name} · ${created.externalReference ?? externalReference.trim()}`);
      setAmount("");
      setExternalReference("");
      setDescription("");
      setPhone("");
      setTarget(null);
      await loadFloat();
    } catch {
      setFormError(userMessageForNetwork("create"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="stats" style={{ alignItems: "start" }}>
      <article className="card stat">
        <span>Float balance</span>
        <strong>
          {wallet ? `${money(wallet.balance)} ${wallet.currency}` : loadError ? "—" : "…"}
        </strong>
        {loadError ? <p className="login-error">{loadError}</p> : null}
      </article>

      <article className="card" style={{ gridColumn: "span 2" }}>
        <h2>Top up a wallet</h2>
        <p>Look up a rider or owner by phone, then move float into their wallet.</p>
        <form className="form" onSubmit={submit}>
          {formError ? (
            <div className="login-error" role="alert">
              {formError}
            </div>
          ) : null}
          {notice ? <p>{notice}</p> : null}

          <label className="field">
            <span>Phone</span>
            <input
              type="text"
              value={phone}
              disabled={saving || lookingUp}
              onChange={(event) => {
                setPhone(event.target.value);
                setTarget(null);
              }}
              placeholder="Exact rider or owner phone"
              aria-label="Rider or owner phone"
            />
          </label>
          <button type="button" className="btn" onClick={lookup} disabled={saving || lookingUp}>
            {lookingUp ? "Looking up…" : "Find wallet"}
          </button>
          {target ? (
            <p>
              {target.kind === "rider" ? "Rider" : "Owner"} · {target.name}
            </p>
          ) : null}

          <label className="field">
            <span>Amount ({wallet?.currency ?? "CDF"})</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              disabled={saving}
              onChange={(event) => setAmount(event.target.value)}
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
              aria-label="Top-up notes"
            />
          </label>
          <button type="submit" className="btn primary" disabled={saving || !wallet}>
            {saving ? "Saving…" : "Apply top-up"}
          </button>
        </form>
      </article>

      <article className="card" style={{ gridColumn: "1 / -1" }}>
        <h2>Recent float movements</h2>
        {history.length === 0 ? (
          <p>No ledger lines yet.</p>
        ) : (
          <ul>
            {history.map((row) => {
              const line = row.lines.find((entry) => entry.walletId === wallet?.id);
              const signed =
                line == null ? "" : `${line.direction === "debit" ? "−" : "+"}${money(line.amount)}`;
              return (
                <li key={row.id}>
                  {row.kind.replaceAll("_", " ")} {signed}
                  {row.externalReference ? ` · ${row.externalReference}` : ""}
                  {row.description ? ` · ${row.description}` : ""}
                </li>
              );
            })}
          </ul>
        )}
      </article>
    </section>
  );
}
