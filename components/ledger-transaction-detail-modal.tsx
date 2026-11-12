"use client";

import { Modal } from "./modal";
import type { LedgerTransactionRow } from "./ledger-transaction-list";

type LedgerTransactionDetailModalProps = {
  open: boolean;
  transaction: LedgerTransactionRow | null;
  onClose: () => void;
};

function formatAmount(value: string | number): string {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(value);
}

function formatKind(kind: string): string {
  return kind.replace(/_/g, " ");
}

function lineAccountLabel(line: NonNullable<LedgerTransactionRow["lines"]>[number]): string {
  if (line.companyAccountId != null) {
    return `Company account #${line.companyAccountId}`;
  }
  if (line.walletId != null) {
    return `Wallet #${line.walletId}`;
  }
  if (line.revenueAccountId != null) {
    return `Revenue account #${line.revenueAccountId}`;
  }
  return "—";
}

export function LedgerTransactionDetailModal({
  open,
  transaction,
  onClose,
}: LedgerTransactionDetailModalProps) {
  if (!transaction) {
    return null;
  }

  const ref = transaction.externalReference?.trim();
  const heading = ref ? `Ledger · ${ref}` : `Ledger transaction #${transaction.id}`;

  return (
    <Modal
      open={open}
      variant="panel"
      title={heading}
      description={formatKind(transaction.kind)}
      onClose={onClose}
      footer={
        <button type="button" className="btn" onClick={onClose}>
          Close
        </button>
      }
    >
      <div className="record-detail record-detail-panel">
        <div className="record-detail-summary" role="region" aria-label="Summary">
          <p className="record-detail-summary-label">Summary</p>
          <ul className="record-detail-summary-list">
            <li>
              <span>Transaction ID</span>
              <strong>{transaction.id}</strong>
            </li>
            <li>
              <span>Type</span>
              <strong>{formatKind(transaction.kind)}</strong>
            </li>
            <li>
              <span>Created</span>
              <strong>{new Date(transaction.createdAt).toLocaleString()}</strong>
            </li>
            <li>
              <span>Reference</span>
              <strong>{ref ?? "—"}</strong>
            </li>
            <li>
              <span>Description</span>
              <strong>{transaction.description?.trim() || "—"}</strong>
            </li>
          </ul>
        </div>

        {transaction.lines && transaction.lines.length > 0 ? (
          <>
            <p className="record-detail-fields-label">Ledger lines</p>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Direction</th>
                    <th>Amount</th>
                    <th>Account</th>
                  </tr>
                </thead>
                <tbody>
                  {transaction.lines.map((line, index) => (
                    <tr key={`${transaction.id}-line-${index}`}>
                      <td>{line.direction}</td>
                      <td>{formatAmount(line.amount)}</td>
                      <td>{lineAccountLabel(line)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  );
}
