"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Badge } from "./badge";
import { DataTable, type Column } from "./data-table";
import { LedgerTransactionDetailModal } from "./ledger-transaction-detail-modal";

type LedgerLine = {
  direction: string;
  amount: string | number;
  companyAccountId?: number | null;
  walletId?: number | null;
  revenueAccountId?: number | null;
};

export type LedgerTransactionRow = {
  id: number;
  kind: string;
  externalReference?: string | null;
  description?: string | null;
  createdAt: string;
  lines?: LedgerLine[];
};

function formatAmount(value: string | number): string {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(value);
}

function formatKind(kind: string): string {
  return kind.replace(/_/g, " ");
}

function formatLedgerDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

function lineCell(line: LedgerLine | undefined): string {
  if (!line) {
    return "—";
  }
  const target =
    line.companyAccountId != null
      ? `company #${line.companyAccountId}`
      : line.walletId != null
        ? `wallet #${line.walletId}`
        : line.revenueAccountId != null
          ? `revenue #${line.revenueAccountId}`
          : "";
  return target ? `${formatAmount(line.amount)} · ${target}` : formatAmount(line.amount);
}

function lineForDirection(tx: LedgerTransactionRow, direction: "debit" | "credit"): LedgerLine | undefined {
  return tx.lines?.find((line) => line.direction === direction);
}

function ellipsisCell(value: string): ReactNode {
  if (!value || value === "—") {
    return "—";
  }
  return (
    <span className="data-table-ellipsis-inner" title={value}>
      {value}
    </span>
  );
}

type LedgerTransactionListProps = {
  transactions: LedgerTransactionRow[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  searchPlaceholder?: string;
};

export function LedgerTransactionList({
  transactions,
  loading = false,
  error = null,
  emptyMessage = "No ledger transactions yet.",
  searchPlaceholder = "Search transactions…",
}: LedgerTransactionListProps) {
  const [detail, setDetail] = useState<LedgerTransactionRow | null>(null);

  const columns = useMemo((): Column<LedgerTransactionRow>[] => {
    return [
      {
        key: "createdAt",
        header: "Date",
        cellClassName: "ledger-col-date",
        sortValue: (row) => new Date(row.createdAt).getTime(),
        searchValue: (row) => new Date(row.createdAt).toLocaleString(),
        render: (row) => (
          <span className="data-table-ellipsis-inner" title={new Date(row.createdAt).toLocaleString()}>
            {formatLedgerDate(row.createdAt)}
          </span>
        ),
      },
      {
        key: "kind",
        header: "Type",
        cellClassName: "ledger-col-kind",
        sortValue: (row) => row.kind,
        searchValue: (row) => formatKind(row.kind),
        render: (row) => <Badge status={formatKind(row.kind)} />,
      },
      {
        key: "externalReference",
        header: "Reference",
        cellClassName: "data-table-cell-ellipsis ledger-col-reference",
        sortValue: (row) => row.externalReference ?? "",
        searchValue: (row) => row.externalReference ?? "",
        render: (row) => ellipsisCell(row.externalReference?.trim() || "—"),
      },
      {
        key: "description",
        header: "Description",
        cellClassName: "data-table-cell-ellipsis ledger-col-description",
        sortValue: (row) => row.description ?? "",
        searchValue: (row) => row.description ?? "",
        render: (row) => ellipsisCell(row.description?.trim() || "—"),
      },
      {
        key: "debit",
        header: "Debit",
        cellClassName: "data-table-cell-ellipsis ledger-col-amount",
        sortable: false,
        searchValue: (row) => lineCell(lineForDirection(row, "debit")),
        render: (row) => ellipsisCell(lineCell(lineForDirection(row, "debit"))),
      },
      {
        key: "credit",
        header: "Credit",
        cellClassName: "data-table-cell-ellipsis ledger-col-amount",
        sortable: false,
        searchValue: (row) => lineCell(lineForDirection(row, "credit")),
        render: (row) => ellipsisCell(lineCell(lineForDirection(row, "credit"))),
      },
    ];
  }, []);

  if (error) {
    return (
      <div className="login-error" role="alert">
        {error}
      </div>
    );
  }

  return (
    <>
      <DataTable
        className="data-table-ledger"
        columns={columns}
        rows={transactions}
        rowKey={(row) => row.id}
        loading={loading}
        empty={emptyMessage}
        searchPlaceholder={searchPlaceholder}
        defaultPageSize={25}
        pageSizeOptions={[10, 25, 50, 100]}
        onRowClick={(row) => setDetail(row)}
      />
      <LedgerTransactionDetailModal
        open={detail !== null}
        transaction={detail}
        onClose={() => setDetail(null)}
      />
    </>
  );
}
