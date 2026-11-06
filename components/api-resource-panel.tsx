"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { userMessageForNetwork, userMessageFromResponse } from "../lib/api-errors";
import { authFetch, type AuthUser } from "../lib/auth";
import type { Section } from "../lib/nav";
import { buildResourceDetailPayload, type ResourceDetailPayload } from "../lib/resource-detail";
import type { ResourceSection } from "../lib/resource-create-config";
import { getResourceUpdateFields } from "../lib/resource-update-fields";
import {
  walletBalanceNumber,
  walletCurrency,
  walletDeleteLabelFromRow,
  walletEditTargetFromRow,
  walletOwnerCell,
  type WalletEditTarget,
} from "../lib/wallet-row-helpers";
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
import { DeleteResourceModal } from "./delete-resource-modal";
import { DeleteWalletModal } from "./delete-wallet-modal";
import { EditResourceModal, type EditResourceTarget } from "./edit-resource-modal";
import { EditWalletModal } from "./edit-wallet-modal";
import { WalletTopUpModal, type WalletTopUpTarget } from "./wallet-top-up-modal";

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

function buildWalletDataColumns(): Column<Row>[] {
  return [
    {
      key: "owner",
      header: "Owner",
      sortValue: (row) => walletOwnerCell(row).label,
      searchValue: (row) => {
        const { label, type } = walletOwnerCell(row);
        const parts = [label, type, row.userId != null ? String(row.userId) : ""];
        const user = row.user;
        if (user && typeof user === "object") {
          const u = user as Record<string, unknown>;
          if (typeof u.email === "string") {
            parts.push(u.email);
          }
          if (typeof u.username === "string") {
            parts.push(u.username);
          }
        }
        return parts.filter(Boolean).join(" ");
      },
      render: (row) => {
        const { label, type } = walletOwnerCell(row);
        return (
          <span className="wallet-owner-cell">
            <span className="wallet-owner-name">{label}</span>
            <Badge status={type} />
          </span>
        );
      },
    },
    {
      key: "balance",
      header: "Balance",
      align: "right",
      sortValue: (row) => walletBalanceNumber(row),
      searchValue: (row) => `${walletBalanceNumber(row)} ${walletCurrency(row)}`,
      render: (row) => `${walletBalanceNumber(row).toLocaleString()} ${walletCurrency(row)}`,
    },
  ];
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
  onDetail: ((payload: ResourceDetailPayload) => void) | undefined,
  section: Section,
  title: string,
  openAssign: (user: SwapperAssignTarget) => void,
  openBatteryStationAttach: (battery: BatteryAttachTarget) => void,
  openBatteryBikeAttach: (battery: BatteryBikeAttachTarget) => void,
  openWalletTopUp: (wallet: WalletTopUpTarget) => void,
  openWalletEdit: (wallet: WalletEditTarget) => void,
  openWalletDelete: (payload: { id: number; ownerLabel: string }) => void,
  openResourceEdit: (target: EditResourceTarget) => void,
  openResourceDelete: (payload: { section: ResourceSection; id: number; row: Row }) => void,
): TableRowMenuItem[] {
  const items: TableRowMenuItem[] = [];

  if (onDetail) {
    items.push({
      id: "view",
      label: "View",
      onSelect: () =>
        onDetail(buildResourceDetailPayload(section, title, row, cellValue)),
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
      continue;
    }

    if (def.id === TABLE_ROW_ACTION_IDS.walletTopUp) {
      const id = row.id;
      if (typeof id !== "number") {
        continue;
      }

      const { label } = walletOwnerCell(row);

      items.push({
        id: def.id,
        label: def.label,
        onSelect: () =>
          openWalletTopUp({
            id,
            ownerLabel: label,
            currency: walletCurrency(row),
            currentBalance: walletBalanceNumber(row),
          }),
      });
      continue;
    }

    if (def.id === TABLE_ROW_ACTION_IDS.walletEdit) {
      const target = walletEditTargetFromRow(row);
      if (!target) {
        continue;
      }
      items.push({
        id: def.id,
        label: def.label,
        onSelect: () => openWalletEdit(target),
      });
      continue;
    }

    if (def.id === TABLE_ROW_ACTION_IDS.walletDelete) {
      const id = row.id;
      if (typeof id !== "number") {
        continue;
      }
      items.push({
        id: def.id,
        label: def.label,
        onSelect: () =>
          openWalletDelete({ id, ownerLabel: walletDeleteLabelFromRow(row) }),
      });
      continue;
    }

    if (def.id === TABLE_ROW_ACTION_IDS.resourceEdit) {
      if (section === "wallets" || section === "overview") {
        continue;
      }
      const id = row.id;
      if (typeof id !== "number") {
        continue;
      }
      const fields = getResourceUpdateFields(section);
      if (!fields?.length) {
        continue;
      }
      items.push({
        id: def.id,
        label: def.label,
        onSelect: () => openResourceEdit({ section, id, row, fields }),
      });
      continue;
    }

    if (def.id === TABLE_ROW_ACTION_IDS.resourceDelete) {
      if (section === "wallets" || section === "overview") {
        continue;
      }
      const id = row.id;
      if (typeof id !== "number") {
        continue;
      }
      items.push({
        id: def.id,
        label: def.label,
        onSelect: () => openResourceDelete({ section, id, row }),
      });
      continue;
    }
  }

  return items;
}

function appendActionsColumn(
  baseColumns: Column<Row>[],
  available: TableRowActionDef[],
  onDetail: ((payload: ResourceDetailPayload) => void) | undefined,
  section: Section,
  title: string,
  openAssign: (user: SwapperAssignTarget) => void,
  openBatteryStationAttach: (battery: BatteryAttachTarget) => void,
  openBatteryBikeAttach: (battery: BatteryBikeAttachTarget) => void,
  openWalletTopUp: (wallet: WalletTopUpTarget) => void,
  openWalletEdit: (wallet: WalletEditTarget) => void,
  openWalletDelete: (payload: { id: number; ownerLabel: string }) => void,
  openResourceEdit: (target: EditResourceTarget) => void,
  openResourceDelete: (payload: { section: ResourceSection; id: number; row: Row }) => void,
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
          section,
          title,
          openAssign,
          openBatteryStationAttach,
          openBatteryBikeAttach,
          openWalletTopUp,
          openWalletEdit,
          openWalletDelete,
          openResourceEdit,
          openResourceDelete,
        );
        return menuItems.map((item) => item.label).join(" ");
      },
      render: (row) => {
        const menuItems = buildRowActionMenuItems(
          row,
          available,
          onDetail,
          section,
          title,
          openAssign,
          openBatteryStationAttach,
          openBatteryBikeAttach,
          openWalletTopUp,
          openWalletEdit,
          openWalletDelete,
          openResourceEdit,
          openResourceDelete,
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
  onDetail?: (payload: ResourceDetailPayload) => void;
  onRecordsChange?: (count: number) => void;
  onCreateError?: (message: string) => void;
  onCreateSuccess?: () => void;
  onAssignSuccess?: () => void;
  onAssignError?: (message: string) => void;
  onBatteryStationSuccess?: () => void;
  onBatteryStationError?: (message: string) => void;
  onBatteryBikeSuccess?: () => void;
  onBatteryBikeError?: (message: string) => void;
  onWalletTopUpSuccess?: () => void;
  onWalletTopUpError?: (message: string) => void;
  onWalletEditSuccess?: () => void;
  onWalletEditError?: (message: string) => void;
  onWalletDeleteSuccess?: () => void;
  onWalletDeleteError?: (message: string) => void;
  onResourceEditSuccess?: () => void;
  onResourceEditError?: (message: string) => void;
  onResourceDeleteSuccess?: () => void;
  onResourceDeleteError?: (message: string) => void;
  /** Bumps when parent wants a fresh fetch (e.g. after closing a global modal). */
  reloadKey?: number;
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
  onWalletTopUpSuccess,
  onWalletTopUpError,
  onWalletEditSuccess,
  onWalletEditError,
  onWalletDeleteSuccess,
  onWalletDeleteError,
  onResourceEditSuccess,
  onResourceEditError,
  onResourceDeleteSuccess,
  onResourceDeleteError,
  reloadKey = 0,
}: ApiResourcePanelProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [sessionPermissions, setSessionPermissions] = useState<string[]>([]);
  const [assignUser, setAssignUser] = useState<SwapperAssignTarget | null>(null);
  const [attachBatteryStation, setAttachBatteryStation] = useState<BatteryAttachTarget | null>(null);
  const [attachBatteryBike, setAttachBatteryBike] = useState<BatteryBikeAttachTarget | null>(null);
  const [walletTopUp, setWalletTopUp] = useState<WalletTopUpTarget | null>(null);
  const [walletEdit, setWalletEdit] = useState<WalletEditTarget | null>(null);
  const [walletDelete, setWalletDelete] = useState<{ id: number; ownerLabel: string } | null>(null);
  const [resourceEdit, setResourceEdit] = useState<EditResourceTarget | null>(null);
  const [resourceDelete, setResourceDelete] = useState<{ section: ResourceSection; id: number; row: Row } | null>(null);
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
  }, [apiPath, reloadKey, reloadToken]);

  const openAssign = useCallback((user: SwapperAssignTarget) => {
    setAssignUser(user);
  }, []);

  const openBatteryStationAttach = useCallback((battery: BatteryAttachTarget) => {
    setAttachBatteryStation(battery);
  }, []);

  const openBatteryBikeAttach = useCallback((battery: BatteryBikeAttachTarget) => {
    setAttachBatteryBike(battery);
  }, []);

  const openWalletTopUpModal = useCallback((wallet: WalletTopUpTarget) => {
    setWalletTopUp(wallet);
  }, []);

  const openWalletEditModal = useCallback((wallet: WalletEditTarget) => {
    setWalletEdit(wallet);
  }, []);

  const openWalletDeleteModal = useCallback((payload: { id: number; ownerLabel: string }) => {
    setWalletDelete(payload);
  }, []);

  const openResourceEditModal = useCallback((target: EditResourceTarget) => {
    setResourceEdit(target);
  }, []);

  const openResourceDeleteModal = useCallback((payload: { section: ResourceSection; id: number; row: Row }) => {
    setResourceDelete(payload);
  }, []);

  const allRowActionsForSection = useMemo(() => getAvailableRowActions(section, sessionPermissions), [section, sessionPermissions]);

  const columns = useMemo(() => {
    let base: Column<Row>[];

    if (section === "users") {
      base = buildUserColumns();
    } else if (section === "batteries") {
      base = buildBatteryDataColumns();
    } else if (section === "wallets") {
      base = buildWalletDataColumns();
    } else {
      base = buildColumns(rows);
    }

    return appendActionsColumn(
      base,
      allRowActionsForSection,
      onDetail,
      section,
      title,
      openAssign,
      openBatteryStationAttach,
      openBatteryBikeAttach,
      openWalletTopUpModal,
      openWalletEditModal,
      openWalletDeleteModal,
      openResourceEditModal,
      openResourceDeleteModal,
    );
  }, [
    allRowActionsForSection,
    onDetail,
    openAssign,
    openBatteryBikeAttach,
    openBatteryStationAttach,
    openWalletTopUpModal,
    openWalletEditModal,
    openWalletDeleteModal,
    openResourceEditModal,
    openResourceDeleteModal,
    rows,
    section,
    title,
  ]);

  const searchPlaceholderFromSection =
    section === "users"
      ? "Search users…"
      : section === "batteries"
        ? "Search batteries…"
        : section === "swaps"
          ? "Search swaps…"
          : section === "wallets"
            ? "Search wallets…"
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
        onRowClick={
          onDetail
            ? (row) => onDetail(buildResourceDetailPayload(section, title, row, cellValue))
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

      <WalletTopUpModal
        open={walletTopUp !== null}
        wallet={walletTopUp}
        onClose={() => setWalletTopUp(null)}
        onSaved={() => {
          reload();
          onWalletTopUpSuccess?.();
        }}
        onError={onWalletTopUpError}
      />

      <EditWalletModal
        open={walletEdit !== null}
        wallet={walletEdit}
        onClose={() => setWalletEdit(null)}
        onSaved={() => {
          reload();
          onWalletEditSuccess?.();
        }}
        onError={onWalletEditError}
      />

      <DeleteWalletModal
        open={walletDelete !== null}
        walletId={walletDelete?.id ?? null}
        ownerLabel={walletDelete?.ownerLabel ?? ""}
        onClose={() => setWalletDelete(null)}
        onDeleted={() => {
          reload();
          onWalletDeleteSuccess?.();
        }}
        onError={onWalletDeleteError}
      />

      <EditResourceModal
        open={resourceEdit !== null}
        target={resourceEdit}
        onClose={() => setResourceEdit(null)}
        onSaved={() => {
          reload();
          onResourceEditSuccess?.();
        }}
        onError={onResourceEditError}
      />

      <DeleteResourceModal
        open={resourceDelete !== null}
        section={resourceDelete?.section ?? null}
        recordId={resourceDelete?.id ?? null}
        row={resourceDelete?.row ?? null}
        onClose={() => setResourceDelete(null)}
        onDeleted={() => {
          reload();
          onResourceDeleteSuccess?.();
        }}
        onError={onResourceDeleteError}
      />
    </>
  );
}
