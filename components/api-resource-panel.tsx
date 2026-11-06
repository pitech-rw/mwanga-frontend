"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { userMessageForNetwork, userMessageFromResponse } from "../lib/api-errors";
import { authFetch } from "../lib/auth";
import type { Section } from "../lib/nav";
import { AssignSwapperStationModal, type SwapperAssignTarget } from "./assign-swapper-station-modal";
import { Badge } from "./badge";
import { CreateResourceButton } from "./create-resource-button";
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
  "user",
  "role",
  "currentBattery",
  "station",
  "battery",
  "bike",
  "swapTransaction",
  "user",
  "assignedStation",
  "stationId",
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
    return [
      {
        key: "id",
        header: "ID",
        sortValue: (row) => Number(row.id ?? 0),
        render: (row) => cellValue(row.id),
      },
    ];
  }

  const keys = Object.keys(rows[0]).filter((key) => !SKIP_KEYS.has(key) && typeof rows[0][key] !== "object");

  const preferred = ["id", "serialNumber", "plateNumber", "fullName", "name", "email", "username", "phone", "status", "type", "amount", "balance"];

  const ordered = [...preferred.filter((key) => keys.includes(key)), ...keys.filter((key) => !preferred.includes(key))].slice(0, 6);

  return ordered.map((key) => ({
    key,
    header: key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase()),
    sortValue: (row) => {
      const value = row[key];
      return typeof value === "number" ? value : String(value ?? "");
    },
    searchValue: (row) => cellValue(row[key]),
    render: (row) => {
      const value = row[key];

      if (statusLike(key, value)) {
        return <Badge status={String(value)} />;
      }

      return cellValue(value);
    },
  }));
}

function stationLabel(row: Row): string {
  const assigned = row.assignedStation;

  if (assigned && typeof assigned === "object") {
    const record = assigned as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name : "";
    const code = typeof record.code === "string" ? record.code : "";

    if (code && name) {
      return `${code} — ${name}`;
    }

    return name || code || "—";
  }

  return "Unassigned";
}

function userDisplayName(row: Row): string {
  const first = typeof row.firstName === "string" ? row.firstName : "";
  const last = typeof row.lastName === "string" ? row.lastName : "";
  const combined = [first, last].filter(Boolean).join(" ").trim();

  return combined || cellValue(row.username);
}

function buildUserColumns(onAssign: (user: SwapperAssignTarget) => void): Column<Row>[] {
  return [
    {
      key: "username",
      header: "Username",
      sortValue: (row) => String(row.username ?? ""),
      searchValue: (row) =>
        [row.username, row.firstName, row.lastName, row.email].map((value) => cellValue(value)).join(" "),
      render: (row) => cellValue(row.username),
    },
    {
      key: "name",
      header: "Name",
      sortValue: (row) => userDisplayName(row),
      render: (row) => userDisplayName(row),
    },
    {
      key: "email",
      header: "Email",
      sortValue: (row) => String(row.email ?? ""),
      render: (row) => cellValue(row.email),
    },
    {
      key: "type",
      header: "Type",
      sortValue: (row) => String(row.type ?? ""),
      render: (row) => <Badge status={String(row.type ?? "—")} />,
    },
    {
      key: "station",
      header: "Station",
      sortValue: (row) => stationLabel(row),
      render: (row) => (row.type === "swapper" ? stationLabel(row) : "—"),
    },
    {
      key: "assign",
      header: "",
      sortable: false,
      render: (row) => {
        if (row.type !== "swapper") {
          return "—";
        }

        return (
          <button
            type="button"
            className="btn ghost"
            onClick={(event) => {
              event.stopPropagation();
              onAssign(row as unknown as SwapperAssignTarget);
            }}
          >
            Assign station
          </button>
        );
      },
    },
  ];
}

type ApiResourcePanelProps = {
  section: Section;
  apiPath: string;
  title: string;
  onForbidden?: () => void;
  onDetail?: (payload: { title: string; rows: [string, string][] }) => void;
  onRecordsChange?: (count: number) => void;
  onCreateError?: (message: string) => void;
  onCreateSuccess?: () => void;
  onAssignSuccess?: () => void;
  onAssignError?: (message: string) => void;
};

export function ApiResourcePanel({
  section,
  apiPath,
  title,
  onForbidden,
  onDetail,
  onRecordsChange,
  onCreateError,
  onCreateSuccess,
  onAssignSuccess,
  onAssignError,
}: ApiResourcePanelProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [assignUser, setAssignUser] = useState<SwapperAssignTarget | null>(null);
  const onForbiddenRef = useRef(onForbidden);
  const onRecordsChangeRef = useRef(onRecordsChange);

  useEffect(() => {
    onForbiddenRef.current = onForbidden;
    onRecordsChangeRef.current = onRecordsChange;
  });

  const reload = useCallback(() => {
    setReloadToken((value) => value + 1);
  }, []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await authFetch(apiPath);

        if (response.status === 401) {
          onForbiddenRef.current?.();
          return;
        }

        if (response.status === 403) {
          if (active) {
            setRows([]);
            setError(await userMessageFromResponse("load", response));
            onRecordsChangeRef.current?.(0);
          }
          return;
        }

        if (!response.ok) {
          if (active) {
            setRows([]);
            setError(await userMessageFromResponse("load", response));
            onRecordsChangeRef.current?.(0);
          }
          return;
        }

        const data = (await response.json()) as unknown;

        if (!active) {
          return;
        }

        const nextRows = Array.isArray(data) ? (data as Row[]) : [];
        setRows(nextRows);
        onRecordsChangeRef.current?.(nextRows.length);
      } catch {
        if (!active) {
          return;
        }

        setRows([]);
        setError(userMessageForNetwork("load"));
        onRecordsChangeRef.current?.(0);
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
  }, [apiPath, reloadToken]);

  const openAssign = useCallback((user: SwapperAssignTarget) => {
    setAssignUser(user);
  }, []);

  const columns = useMemo(() => {
    if (section === "users") {
      return buildUserColumns(openAssign);
    }

    return buildColumns(rows);
  }, [openAssign, rows, section]);

  return (
    <>
      <article className="card panel">
      <div className="panel-head">
        <h2>{title}</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span>
            {loading && rows.length > 0 ? "Refreshing…" : loading ? "Loading…" : error ? "Unavailable" : `${rows.length} records`}
          </span>
          <CreateResourceButton
            section={section}
            onCreated={() => {
              reload();
              onCreateSuccess?.();
            }}
            onError={onCreateError}
          />
        </div>
      </div>
      {error ? <p className="resource-error">{error}</p> : null}
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        rowKey={(row) => String(row.id ?? JSON.stringify(row))}
        empty={error ? "Unable to load records." : "No records yet."}
        searchPlaceholder={section === "users" ? "Search users…" : undefined}
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

      <AssignSwapperStationModal
        open={assignUser !== null}
        user={assignUser}
        onClose={() => setAssignUser(null)}
        onSaved={() => {
          reload();
          onAssignSuccess?.();
        }}
        onError={onAssignError}
      />
    </>
  );
}
