"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { userMessageForNetwork, userMessageFromResponse } from "../lib/api-errors";
import { authFetch, type AuthUser } from "../lib/auth";
import type { Section } from "../lib/nav";
import {
  getAvailableRowActions,
  TABLE_ROW_ACTION_IDS,
  type TableRowActionDef,
} from "../lib/table-row-actions";
import {
  AttachBatteryBikeModal,
  type BatteryBikeAttachTarget,
} from "./attach-battery-bike-modal";
import { AttachBatteryStationModal, type BatteryAttachTarget } from "./attach-battery-station-modal";
import { AssignSwapperStationModal, type SwapperAssignTarget } from "./assign-swapper-station-modal";
import { Badge } from "./badge";
import { CreateResourceButton } from "./create-resource-button";
import { DataTable, type Column } from "./data-table";
import { TableRowActionsMenu, type TableRowMenuItem } from "./table-row-actions-menu";

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

    if (typeof record.plateNumber === "string") {
      const serial = typeof record.serialNumber === "string" ? record.serialNumber : "";
      return serial ? `${record.plateNumber} · ${serial}` : record.plateNumber;
    }

    if (typeof record.serialNumber === "string") {
      return record.serialNumber;
    }

    return JSON.stringify(value);
  }

  return String(value);
}

function buildDetailPayload(
  row: Row,
  fallbackTitle: string,
): { title: string; rows: [string, string][] } {
  const detailRows = Object.entries(row)
    .filter(([key]) => !SKIP_KEYS.has(key))
    .slice(0, 12)
    .map(([key, value]) => [key, cellValue(value)] as [string, string]);

  return { title: cellValue(row.id ?? fallbackTitle), rows: detailRows };
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

function buildBatteryDataColumns(): Column<Row>[] {
  return [
    {
      key: "serialNumber",
      header: "Serial",
      sortValue: (row) => String(row.serialNumber ?? ""),
      searchValue: (row) => String(row.serialNumber ?? ""),
      render: (row) => cellValue(row.serialNumber),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (row) => String(row.status ?? ""),
      searchValue: (row) => String(row.status ?? ""),
      render: (row) => <Badge status={String(row.status ?? "—")} />,
    },
    {
      key: "station",
      header: "Station",
      sortValue: (row) => {
        const station = row.station;
        if (station && typeof station === "object") {
          const record = station as Record<string, unknown>;
          const name = typeof record.name === "string" ? record.name : "";
          const code = typeof record.code === "string" ? record.code : "";
          if (code && name) {
            return `${code} — ${name}`;
          }
          return name || code || "";
        }
        return row.stationId != null ? String(row.stationId) : "";
      },
      searchValue: (row) => {
        const station = row.station;
        const parts: string[] = [];
        if (row.stationId != null) {
          parts.push(String(row.stationId));
        }
        if (station && typeof station === "object") {
          const record = station as Record<string, unknown>;
          if (typeof record.name === "string") {
            parts.push(record.name);
          }
          if (typeof record.code === "string") {
            parts.push(record.code);
          }
        }
        return parts.join(" ");
      },
      render: (row) => {
        const station = row.station;
        if (station && typeof station === "object") {
          const record = station as Record<string, unknown>;
          const name = typeof record.name === "string" ? record.name : "";
          const code = typeof record.code === "string" ? record.code : "";
          if (code && name) {
            return `${code} — ${name}`;
          }
          return name || code || "—";
        }
        return row.stationId != null ? String(row.stationId) : "—";
      },
    },
    {
      key: "bike",
      header: "Bike",
      sortValue: (row) => {
        const bike = row.bike;
        if (bike && typeof bike === "object") {
          const record = bike as Record<string, unknown>;
          const plate = typeof record.plateNumber === "string" ? record.plateNumber : "";
          return plate;
        }
        return "";
      },
      searchValue: (row) => {
        const bike = row.bike;
        const parts: string[] = [];
        if (bike && typeof bike === "object") {
          const record = bike as Record<string, unknown>;
          if (typeof record.id === "number") {
            parts.push(String(record.id));
          }
          if (typeof record.plateNumber === "string") {
            parts.push(record.plateNumber);
          }
          if (typeof record.serialNumber === "string") {
            parts.push(record.serialNumber);
          }
          if (typeof record.model === "string") {
            parts.push(record.model);
          }
        }
        return parts.join(" ");
      },
      render: (row) => {
        const bike = row.bike;
        if (bike && typeof bike === "object") {
          const record = bike as Record<string, unknown>;
          const plate = typeof record.plateNumber === "string" ? record.plateNumber : "";
          const serial = typeof record.serialNumber === "string" ? record.serialNumber : "";
          if (plate && serial) {
            return `${plate} · ${serial}`;
          }
          return plate || serial || "—";
        }
        return "—";
      },
    },
    {
      key: "soc",
      header: "SOC",
      align: "right",
      sortValue: (row) => Number(row.soc ?? 0),
      render: (row) => (row.soc != null ? `${row.soc}%` : "—"),
    },
  ];
}

function buildUserColumns(): Column<Row>[] {
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
  ];
}

function buildRowActionMenuItems(
  row: Row,
  available: TableRowActionDef[],
  onDetail: ((payload: { title: string; rows: [string, string][] }) => void) | undefined,
  title: string,
  openAssign: (user: SwapperAssignTarget) => void,
  openBatteryStationAttach: (battery: BatteryAttachTarget) => void,
  openBatteryBikeAttach: (battery: BatteryBikeAttachTarget) => void,
): TableRowMenuItem[] {
  const items: TableRowMenuItem[] = [];

  if (onDetail) {
    items.push({
      id: "view",
      label: "View",
      onSelect: () => onDetail(buildDetailPayload(row, title)),
    });
  }

  for (const def of available) {
    if (def.visibleForRow && !def.visibleForRow(row)) {
      continue;
    }

    if (def.id === TABLE_ROW_ACTION_IDS.attachBatteryStation) {
      const id = row.id;
      if (typeof id !== "number") {
        continue;
      }

      const serial = typeof row.serialNumber === "string" ? row.serialNumber : undefined;

      items.push({
        id: def.id,
        label: def.label,
        onSelect: () => openBatteryStationAttach({ id, serialNumber: serial }),
      });
      continue;
    }

    if (def.id === TABLE_ROW_ACTION_IDS.attachBatteryBike) {
      const id = row.id;
      if (typeof id !== "number") {
        continue;
      }

      const serial = typeof row.serialNumber === "string" ? row.serialNumber : undefined;

      items.push({
        id: def.id,
        label: def.label,
        onSelect: () => openBatteryBikeAttach({ id, serialNumber: serial }),
      });
      continue;
    }

    if (def.id === TABLE_ROW_ACTION_IDS.assignSwapperStation) {
      items.push({
        id: def.id,
        label: def.label,
        onSelect: () => openAssign(row as unknown as SwapperAssignTarget),
      });
    }
  }

  return items;
}

function appendActionsColumn(
  baseColumns: Column<Row>[],
  available: TableRowActionDef[],
  onDetail: ((payload: { title: string; rows: [string, string][] }) => void) | undefined,
  title: string,
  openAssign: (user: SwapperAssignTarget) => void,
  openBatteryStationAttach: (battery: BatteryAttachTarget) => void,
  openBatteryBikeAttach: (battery: BatteryBikeAttachTarget) => void,
): Column<Row>[] {
  return [
    ...baseColumns,
    {
      key: "actions",
      header: "Actions",
      align: "right",
      sortable: false,
      searchValue: (row) => {
        const menuItems = buildRowActionMenuItems(
          row,
          available,
          onDetail,
          title,
          openAssign,
          openBatteryStationAttach,
          openBatteryBikeAttach,
        );
        return menuItems.map((item) => item.label).join(" ");
      },
      render: (row) => {
        const menuItems = buildRowActionMenuItems(
          row,
          available,
          onDetail,
          title,
          openAssign,
          openBatteryStationAttach,
          openBatteryBikeAttach,
        );

        if (menuItems.length === 0) {
          return <span className="table-actions-placeholder">—</span>;
        }

        return (
          <div className="table-actions-cell">
            <TableRowActionsMenu items={menuItems} />
          </div>
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
  onBatteryStationSuccess?: () => void;
  onBatteryStationError?: (message: string) => void;
  onBatteryBikeSuccess?: () => void;
  onBatteryBikeError?: (message: string) => void;
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
  onBatteryStationSuccess,
  onBatteryStationError,
  onBatteryBikeSuccess,
  onBatteryBikeError,
}: ApiResourcePanelProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [sessionPermissions, setSessionPermissions] = useState<string[]>([]);
  const [assignUser, setAssignUser] = useState<SwapperAssignTarget | null>(null);
  const [attachBatteryStation, setAttachBatteryStation] = useState<BatteryAttachTarget | null>(null);
  const [attachBatteryBike, setAttachBatteryBike] = useState<BatteryBikeAttachTarget | null>(null);
  const onForbiddenRef = useRef(onForbidden);
  const onRecordsChangeRef = useRef(onRecordsChange);

  useEffect(() => {
    onForbiddenRef.current = onForbidden;
    onRecordsChangeRef.current = onRecordsChange;
  });

  useEffect(() => {
    let active = true;

    const loadPermissions = async () => {
      try {
        const response = await authFetch("/auth/me");

        if (response.status === 401) {
          onForbiddenRef.current?.();
          return;
        }

        if (!response.ok) {
          if (active) {
            setSessionPermissions([]);
          }
          return;
        }

        const data = (await response.json()) as unknown;

        if (!active || !data || typeof data !== "object") {
          return;
        }

        const permissions = (data as AuthUser).permissions;
        setSessionPermissions(Array.isArray(permissions) ? [...permissions] : []);
      } catch {
        if (active) {
          setSessionPermissions([]);
        }
      }
    };

    void loadPermissions();

    return () => {
      active = false;
    };
  }, []);

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

  const openBatteryStationAttach = useCallback((battery: BatteryAttachTarget) => {
    setAttachBatteryStation(battery);
  }, []);

  const openBatteryBikeAttach = useCallback((battery: BatteryBikeAttachTarget) => {
    setAttachBatteryBike(battery);
  }, []);

  const allRowActionsForSection = useMemo(() => getAvailableRowActions(section, sessionPermissions), [section, sessionPermissions]);

  const columns = useMemo(() => {
    let base: Column<Row>[];

    if (section === "users") {
      base = buildUserColumns();
    } else if (section === "batteries") {
      base = buildBatteryDataColumns();
    } else {
      base = buildColumns(rows);
    }

    return appendActionsColumn(
      base,
      allRowActionsForSection,
      onDetail,
      title,
      openAssign,
      openBatteryStationAttach,
      openBatteryBikeAttach,
    );
  }, [allRowActionsForSection, onDetail, openAssign, openBatteryBikeAttach, openBatteryStationAttach, rows, section, title]);

  const searchPlaceholderFromSection =
    section === "users"
      ? "Search users…"
      : section === "batteries"
        ? "Search batteries…"
        : section === "swaps"
          ? "Search swaps…"
          : undefined;

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
        className="data-table-panel"
        columns={columns}
        rows={rows}
        loading={loading}
        rowKey={(row) => String(row.id ?? JSON.stringify(row))}
        empty={error ? "Unable to load records." : "No records yet."}
        searchPlaceholder={searchPlaceholderFromSection}
        onRowClick={onDetail ? (row) => onDetail(buildDetailPayload(row, title)) : undefined}
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

      <AttachBatteryStationModal
        open={attachBatteryStation !== null}
        battery={attachBatteryStation}
        onClose={() => setAttachBatteryStation(null)}
        onSaved={() => {
          reload();
          onBatteryStationSuccess?.();
        }}
        onError={onBatteryStationError}
      />

      <AttachBatteryBikeModal
        open={attachBatteryBike !== null}
        battery={attachBatteryBike}
        onClose={() => setAttachBatteryBike(null)}
        onSaved={() => {
          reload();
          onBatteryBikeSuccess?.();
        }}
        onError={onBatteryBikeError}
      />
    </>
  );
}
