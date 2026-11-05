"use client";

import { useEffect, useMemo, useState } from "react";
import { authFetch } from "../lib/auth";
import { Badge } from "./badge";
import { DataTable, type Column } from "./data-table";

type Row = Record<string, unknown>;

const SKIP_KEYS = new Set([
  "passwordHash",
  "createdAt",
  "updatedAt",
  "transactions",
  "bikes",
  "cards",
  "permissions",
  "ledgerEntries",
  "readings",
  "wallet",
  "owner",
  "rider",
  "role",
  "currentBattery",
  "station",
  "battery",
  "bike",
  "swapTransaction",
  "user",
]);

function cellValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (typeof record.name === "string") {
      return record.name;
    }

    if (typeof record.fullName === "string") {
      return record.fullName;
    }

    if (typeof record.serialNumber === "string") {
      return record.serialNumber;
    }

    return JSON.stringify(value);
  }

  return String(value);
}

function statusLike(key: string, value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }

  return /status|state|online|kyc/i.test(key);
}

function buildColumns(rows: Row[]): Column<Row>[] {
  if (rows.length === 0) {
    return [{ key: "id", header: "ID", render: (row) => cellValue(row.id) }];
  }

  const keys = Object.keys(rows[0]).filter((key) => !SKIP_KEYS.has(key) && typeof rows[0][key] !== "object");

  const preferred = ["id", "serialNumber", "plateNumber", "fullName", "name", "email", "username", "phone", "status", "type", "amount", "balance"];

  const ordered = [...preferred.filter((key) => keys.includes(key)), ...keys.filter((key) => !preferred.includes(key))].slice(0, 6);

  return ordered.map((key) => ({
    key,
    header: key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase()),
    render: (row) => {
      const value = row[key];

      if (statusLike(key, value)) {
        return <Badge status={String(value)} />;
      }

      return cellValue(value);
    },
  }));
}

function rowMatches(row: Row, needle: string): boolean {
  return Object.values(row).some((value) => cellValue(value).toLowerCase().includes(needle));
}

type ApiResourcePanelProps = {
  apiPath: string;
  title: string;
  query: string;
  onForbidden?: () => void;
  onDetail?: (payload: { title: string; rows: [string, string][] }) => void;
};

export function ApiResourcePanel({ apiPath, title, query, onForbidden, onDetail }: ApiResourcePanelProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await authFetch(apiPath);

        if (response.status === 401) {
          onForbidden?.();
          return;
        }

        if (response.status === 403) {
          if (active) {
            setRows([]);
            setError("You do not have permission to view this resource.");
          }
          return;
        }

        if (!response.ok) {
          throw new Error("Could not load records.");
        }

        const data = (await response.json()) as unknown;

        if (!active) {
          return;
        }

        setRows(Array.isArray(data) ? (data as Row[]) : []);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setRows([]);
        setError(loadError instanceof Error ? loadError.message : "Request failed.");
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
  }, [apiPath, onForbidden]);

  const needle = query.trim().toLowerCase();
  const visibleRows = useMemo(() => (needle ? rows.filter((row) => rowMatches(row, needle)) : rows), [needle, rows]);
  const columns = useMemo(() => buildColumns(visibleRows.length > 0 ? visibleRows : rows), [rows, visibleRows]);

  return (
    <article className="card panel">
      <div className="panel-head">
        <h2>{title}</h2>
        <span>
          {loading ? "Loading…" : error ? "Unavailable" : `${visibleRows.length} shown`}
        </span>
      </div>
      {error ? <p className="resource-error">{error}</p> : null}
      <DataTable
        columns={columns}
        rows={visibleRows}
        rowKey={(row) => String(row.id ?? JSON.stringify(row))}
        empty={loading ? "Loading records…" : needle ? "No rows match this search." : "No records yet."}
        onRowClick={
          onDetail
            ? (row) => {
                const detailRows = Object.entries(row)
                  .filter(([key]) => !SKIP_KEYS.has(key))
                  .slice(0, 12)
                  .map(([key, value]) => [key, cellValue(value)] as [string, string]);

                onDetail({ title: cellValue(row.id ?? title), rows: detailRows });
              }
            : undefined
        }
      />
    </article>
  );
}
