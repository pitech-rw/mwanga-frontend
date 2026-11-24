"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { authFetch } from "../lib/auth";
import { userMessageForNetwork, userMessageFromResponse } from "../lib/api-errors";
import { userDisplayName } from "../lib/user-display";
import { useT } from "./locale";
import { DataTable, type Column } from "./data-table";

type ErasureRow = {
  id: number;
  userId: number;
  status: string;
  requestedAt: string;
  reason: string | null;
  user?: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    type: string;
    erasedAt?: string | null;
  };
};

type ErasureRequestsPanelProps = {
  onForbidden?: () => void;
};

function formatAccountType(type: string): string {
  return type.replace(/_/g, " ");
}

export function ErasureRequestsPanel({ onForbidden }: ErasureRequestsPanelProps) {
  const t = useT();
  const [rows, setRows] = useState<ErasureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch("/admin/erasure-requests");
      if (response.status === 401) {
        onForbidden?.();
        return;
      }
      if (!response.ok) {
        setError(await userMessageFromResponse("load", response));
        setRows([]);
        return;
      }
      const data = (await response.json()) as unknown;
      setRows(Array.isArray(data) ? (data as ErasureRow[]) : []);
    } catch {
      setError(userMessageForNetwork("load"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [onForbidden, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = useCallback(
    async (id: number, action: "approve" | "reject") => {
      setActingId(id);
      try {
        const response = await authFetch(`/admin/erasure-requests/${id}/${action}`, { method: "POST" });
        if (!response.ok) {
          setError(await userMessageFromResponse("profileUpdate", response));
          return;
        }
        setError(null);
        await load();
      } finally {
        setActingId(null);
      }
    },
    [load],
  );

  const columns = useMemo((): Column<ErasureRow>[] => {
    return [
      {
        key: "user",
        header: t("erasure.admin.colUser"),
        sortable: true,
        sortValue: (row) => (row.user ? userDisplayName(row.user) : `User #${row.userId}`),
        searchValue: (row) => {
          const u = row.user;
          if (!u) {
            return String(row.userId);
          }
          return [userDisplayName(u), u.username, u.type].filter(Boolean).join(" ");
        },
        render: (row) => {
          const label = row.user ? userDisplayName(row.user) : `User #${row.userId}`;
          const meta = row.user?.username ? `@${row.user.username}` : null;
          return (
            <span className="erasure-user-cell">
              <strong>{label}</strong>
              {meta ? <span className="erasure-user-meta">{meta}</span> : null}
            </span>
          );
        },
      },
      {
        key: "type",
        header: t("erasure.admin.colType"),
        sortable: true,
        sortValue: (row) => row.user?.type ?? "",
        render: (row) => {
          const type = row.user?.type;
          if (!type) {
            return "—";
          }
          return <span className="badge info">{formatAccountType(type)}</span>;
        },
      },
      {
        key: "requestedAt",
        header: t("erasure.admin.colRequested"),
        sortable: true,
        sortValue: (row) => new Date(row.requestedAt).getTime(),
        render: (row) => (
          <time dateTime={row.requestedAt}>{new Date(row.requestedAt).toLocaleString()}</time>
        ),
      },
      {
        key: "reason",
        header: t("erasure.admin.colReason"),
        sortable: true,
        cellClassName: "data-table-cell-ellipsis",
        sortValue: (row) => row.reason?.trim() ?? "",
        searchValue: (row) => row.reason?.trim() ?? "",
        render: (row) => {
          const text = row.reason?.trim() || "—";
          return (
            <span className="data-table-ellipsis-inner" title={text === "—" ? undefined : text}>
              {text}
            </span>
          );
        },
      },
      {
        key: "actions",
        header: t("erasure.admin.colActions"),
        sortable: false,
        render: (row) => (
          <div className="table-inline-actions">
            <button
              type="button"
              className="btn primary btn-sm"
              disabled={actingId === row.id}
              onClick={(event) => {
                event.stopPropagation();
                void act(row.id, "approve");
              }}
            >
              {t("erasure.admin.approve")}
            </button>
            <button
              type="button"
              className="btn btn-sm"
              disabled={actingId === row.id}
              onClick={(event) => {
                event.stopPropagation();
                void act(row.id, "reject");
              }}
            >
              {t("erasure.admin.reject")}
            </button>
          </div>
        ),
      },
    ];
  }, [act, actingId, t]);

  const headCount =
    loading && rows.length === 0
      ? t("common.loading")
      : error
        ? "—"
        : t("erasure.admin.count", { count: rows.length });

  return (
    <article className="card panel erasure-requests-panel">
      <div className="panel-head">
        <h2>{t("erasure.admin.title")}</h2>
        <span>{headCount}</span>
      </div>
      <p className="panel-lead">{t("erasure.admin.description")}</p>

      {error ? (
        <p className="resource-error" role="alert">
          {error}
        </p>
      ) : null}

      <DataTable
        className="data-table-panel"
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        loading={loading}
        empty={error ? t("table.emptyLoadError") : t("erasure.admin.empty")}
        searchPlaceholder={t("erasure.admin.searchPlaceholder")}
        defaultPageSize={25}
        showSearch={rows.length > 0 || loading}
      />
    </article>
  );
}