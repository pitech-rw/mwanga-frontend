"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { userMessageForNetwork, userMessageFromResponse } from "../lib/api-errors";
import { authFetch, type AuthUser } from "../lib/auth";
import type { Section } from "../lib/nav";
import { buildResourceDetailPayload, type ResourceDetailPayload } from "../lib/resource-detail";
import type { ResourceSection } from "../lib/resource-create-config";
import { roleOrUserTypeLabel } from "../lib/role-labels";
import { getLocalizedResourceUpdateFields, getResourceUpdateFields } from "../lib/resource-update-fields";
import { getUserUpdateFieldsForRow } from "../lib/user-update-fields";
import {
  walletBalanceNumber,
  walletCurrency,
  walletDeleteLabelFromRow,
  walletHolderCell,
  walletHolderSearchHaystack,
  walletLedgerTargetFromRow,
  companyAccountTransactionsHref,
  type AccountLedgerTarget,
  agentDirectoryLedgerTargetFromRow,
  agentDirectoryTopUpTargetFromRow,
  directoryFleetOwnerLabel,
  agentFloatTopUpTargetFromRow,
  type AgentWalletTopUpTarget,
} from "../lib/wallet-row-helpers";
import {
  getAvailableRowActions,
  TABLE_ROW_ACTION_IDS,
  userMayUsePermission,
  type TableRowActionDef,
} from "../lib/table-row-actions";
import { googleMapsSearchUrl } from "../lib/google-maps-url";
import { PERMISSIONS } from "../lib/permission-strings";
import {
  AttachBatteryBikeModal,
  type BatteryBikeAttachTarget,
} from "./attach-battery-bike-modal";
import {
  AttachBikeBatteryModal,
  type BikeBatteryAttachTarget,
} from "./attach-bike-battery-modal";
import {
  AttachBikeRiderModal,
  type BikeRiderAttachTarget,
} from "./attach-bike-rider-modal";
import {
  AssignCardRiderModal,
  type CardRiderAssignTarget,
} from "./assign-card-rider-modal";
import { AttachBatteryStationModal, type BatteryAttachTarget } from "./attach-battery-station-modal";
import { IssueInventoryModal, type InventoryIssueTarget } from "./issue-inventory-modal";
import {
  AssociateOwnerRiderModal,
  type OwnerRiderAssociateTarget,
} from "./associate-owner-rider-modal";
import {
  AssignRiderFleetOwnerModal,
  type RiderFleetOwnerAssignTarget,
} from "./assign-rider-fleet-owner-modal";
import {
  AssignStationSwapperModal,
  type StationSwapperAssignTarget,
} from "./assign-station-swapper-modal";
import { AssignSwapperStationModal, type SwapperAssignTarget } from "./assign-swapper-station-modal";
import { Badge } from "./badge";
import { CreateResourceButton } from "./create-resource-button";
import { DataTable, type Column } from "./data-table";
import { TableRowActionsMenu, type TableRowMenuItem } from "./table-row-actions-menu";
import { DeleteResourceModal } from "./delete-resource-modal";
import { DeleteWalletModal } from "./delete-wallet-modal";
import { EditResourceModal, type EditResourceTarget } from "./edit-resource-modal";
import { EditRolePermissionsModal, type RolePermissionsTarget } from "./edit-role-permissions-modal";
import { AgentWalletTopUpModal } from "./agent-wallet-top-up-modal";
import { WalletTopUpModal, type WalletTopUpTarget } from "./wallet-top-up-modal";
import { WalletLedgerModal } from "./wallet-ledger-modal";
import {
  buildResourceTableFilters,
  buildResourceTableSortOptions,
  resourceTableDefaultSortKey,
} from "../lib/resource-table-filters";
import { stationDetailHref } from "../lib/nav-path";
import { formatTableDateTime, isTableDateFieldKey } from "../lib/format-datetime";
import { translateFieldKey, type TranslateFn } from "../lib/i18n/translate";
import { erasedUserLabel, isErasedUser } from "../lib/user-display";
import { localizeRowActions } from "../lib/table-row-actions";
import { useLocale, useT } from "./locale";

type Row = Record<string, unknown>;

const SKIP_KEYS = new Set([
  "passwordHash",
  "createdAt",
  "updatedAt",
  "transactions",
  "bikes",
  "cards",
  "ledgerEntries",
  "readings",
  "wallet",
  "owner",
  "portalUser",
  "user",
  "role",
  "currentBattery",
  "station",
  "battery",
  "swapTransaction",
  "user",
  "assignedStation",
  "stationId",
  "movements",
  "bikeId",
  "batteryId",
]);

function cellValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    if (value.length > 0 && value.every((item) => typeof item === "string")) {
      return `${value.length} permission${value.length === 1 ? "" : "s"}`;
    }
    return value.map((item) => String(item)).join(", ");
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

function addressCellDisplay(value: unknown): string {
  const text = cellValue(value);
  return text === "—" ? "" : text;
}

function buildColumns(
  rows: Row[],
  locale: import("../lib/locale-storage").LocaleCode,
  section?: ResourceSection,
): Column<Row>[] {
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
    header: translateFieldKey(locale, key),
    cellClassName: key === "address" ? "data-table-cell-ellipsis" : undefined,
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

      if (key === "address") {
        const full = addressCellDisplay(value);
        if (!full) {
          return "—";
        }
        const mapsHref = googleMapsSearchUrl(row);
        if (!mapsHref) {
          return (
            <span className="data-table-ellipsis-inner" title={full}>
              {full}
            </span>
          );
        }
        return (
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="data-table-ellipsis-inner data-table-maps-link"
            title={full}
            onClick={(event) => event.stopPropagation()}
          >
            {full}
          </a>
        );
      }

      if (isTableDateFieldKey(key)) {
        const formatted = formatTableDateTime(value);
        if (formatted) {
          const title =
            value instanceof Date
              ? value.toLocaleString()
              : typeof value === "string"
                ? new Date(value).toLocaleString()
                : formatted;
          return (
            <span className="data-table-ellipsis-inner" title={title}>
              {formatted}
            </span>
          );
        }
      }

      if (section === "roles" && key === "name" && typeof value === "string") {
        return roleOrUserTypeLabel(locale, value);
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

function cardRiderUsernameCell(row: Row, unassignedLabel: string): string {
  const user = row.user;
  if (user && typeof user === "object") {
    const u = user as Record<string, unknown>;
    const id =
      typeof u.id === "number" ? u.id : typeof row.userId === "number" ? row.userId : null;
    if (id != null) {
      if (
        isErasedUser({
          erasedAt: typeof u.erasedAt === "string" ? u.erasedAt : null,
          username: typeof u.username === "string" ? u.username : null,
        })
      ) {
        return erasedUserLabel(id);
      }
    }
    const username = typeof u.username === "string" ? u.username.trim() : "";
    if (username) {
      return username;
    }
  }
  if (row.userId == null) {
    return unassignedLabel;
  }
  return "—";
}

function cardRiderSearchHaystack(row: Row): string {
  const parts: string[] = [];
  const user = row.user;
  if (user && typeof user === "object") {
    const u = user as Record<string, unknown>;
    for (const key of ["username", "firstName", "lastName", "email"] as const) {
      const value = u[key];
      if (typeof value === "string" && value.trim()) {
        parts.push(value.trim());
      }
    }
    if (typeof u.id === "number") {
      parts.push(String(u.id));
    }
  }
  if (row.userId != null) {
    parts.push(String(row.userId));
  }
  return parts.join(" ");
}

function buildCardDataColumns(
  t: TranslateFn,
  locale: import("../lib/locale-storage").LocaleCode,
): Column<Row>[] {
  const unassigned = t("tables.headers.unassigned");
  return [
    {
      key: "serialNumber",
      header: translateFieldKey(locale, "serialNumber"),
      sortValue: (row) => String(row.serialNumber ?? ""),
      searchValue: (row) => cellValue(row.serialNumber),
      render: (row) => cellValue(row.serialNumber),
    },
    {
      key: "token",
      header: translateFieldKey(locale, "token"),
      sortValue: (row) => String(row.token ?? ""),
      searchValue: (row) => cellValue(row.token),
      render: (row) => {
        const token = typeof row.token === "string" ? row.token : "";
        if (!token) {
          return "—";
        }
        const shown = token.length > 20 ? `${token.slice(0, 16)}…` : token;
        return (
          <span className="data-table-ellipsis-inner" title={token}>
            {shown}
          </span>
        );
      },
    },
    {
      key: "type",
      header: translateFieldKey(locale, "type"),
      sortValue: (row) => String(row.type ?? ""),
      searchValue: (row) => cellValue(row.type),
      render: (row) => cellValue(row.type),
    },
    {
      key: "status",
      header: translateFieldKey(locale, "status"),
      sortValue: (row) => String(row.status ?? ""),
      searchValue: (row) => cellValue(row.status),
      render: (row) => <Badge status={String(row.status ?? "—")} />,
    },
    {
      key: "username",
      header: translateFieldKey(locale, "username"),
      sortValue: (row) => cardRiderUsernameCell(row, unassigned),
      searchValue: (row) => cardRiderSearchHaystack(row),
      render: (row) => cardRiderUsernameCell(row, unassigned),
    },
  ];
}

function buildWalletDataColumns(t: TranslateFn): Column<Row>[] {
  return [
    {
      key: "holder",
      header: t("tables.headers.holder"),
      sortValue: (row) => walletHolderCell(row).label,
      searchValue: (row) => walletHolderSearchHaystack(row),
      render: (row) => {
        const { label, type } = walletHolderCell(row);
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

function inventoryAssetLabel(row: Row): string {
  if (row.kind === "bike" && row.bike && typeof row.bike === "object") {
    const bike = row.bike as Record<string, unknown>;
    const plate = typeof bike.plateNumber === "string" ? bike.plateNumber : "";
    if (plate) {
      return plate;
    }
  }
  if (row.kind === "battery" && row.battery && typeof row.battery === "object") {
    const battery = row.battery as Record<string, unknown>;
    const serial = typeof battery.serialNumber === "string" ? battery.serialNumber : "";
    if (serial) {
      return serial;
    }
  }
  return row.id != null ? `#${row.id}` : "—";
}

function buildInventoryDataColumns(): Column<Row>[] {
  return [
    {
      key: "kind",
      header: "Kind",
      sortValue: (row) => String(row.kind ?? ""),
      searchValue: (row) => String(row.kind ?? ""),
      render: (row) => cellValue(row.kind),
    },
    {
      key: "asset",
      header: "Asset",
      sortValue: (row) => inventoryAssetLabel(row),
      searchValue: (row) => inventoryAssetLabel(row),
      render: (row) => inventoryAssetLabel(row),
    },
    {
      key: "receivedAt",
      header: "Received",
      sortValue: (row) => {
        const v = row.receivedAt;
        return v instanceof Date ? v.getTime() : typeof v === "string" ? Date.parse(v) : 0;
      },
      searchValue: (row) => {
        const v = row.receivedAt;
        const formatted = formatTableDateTime(v);
        return formatted ?? cellValue(v);
      },
      render: (row) => {
        const v = row.receivedAt;
        const formatted = formatTableDateTime(v);
        if (!formatted) {
          return cellValue(v);
        }
        const title = v instanceof Date ? v.toLocaleString() : typeof v === "string" ? new Date(v).toLocaleString() : formatted;
        return (
          <span className="data-table-ellipsis-inner" title={title}>
            {formatted}
          </span>
        );
      },
    },
    {
      key: "notes",
      header: "Notes",
      sortValue: (row) => String(row.notes ?? ""),
      searchValue: (row) => String(row.notes ?? ""),
      render: (row) => {
        const text = typeof row.notes === "string" ? row.notes : "";
        return text ? text.slice(0, 80) : "—";
      },
    },
  ];
}

function bikeHasBattery(row: Row): boolean {
  if (row.currentBatteryId != null) {
    return true;
  }
  const pack = row.currentBattery;
  return pack != null && typeof pack === "object";
}

function buildBikeDataColumns(
  t: TranslateFn,
  locale: import("../lib/locale-storage").LocaleCode,
): Column<Row>[] {
  return [
    {
      key: "plateNumber",
      header: translateFieldKey(locale, "plateNumber"),
      sortValue: (row) => String(row.plateNumber ?? ""),
      searchValue: (row) => String(row.plateNumber ?? ""),
      render: (row) => cellValue(row.plateNumber),
    },
    {
      key: "model",
      header: translateFieldKey(locale, "model"),
      sortValue: (row) => String(row.model ?? ""),
      searchValue: (row) => String(row.model ?? ""),
      render: (row) => cellValue(row.model),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (row) => String(row.status ?? ""),
      searchValue: (row) => String(row.status ?? ""),
      render: (row) => <Badge status={String(row.status ?? "—")} />,
    },
    {
      key: "batteryInstalled",
      header: t("tables.headers.batteryInstalled"),
      sortValue: (row) => (bikeHasBattery(row) ? 1 : 0),
      searchValue: (row) => (bikeHasBattery(row) ? t("common.yes") : t("common.no")),
      render: (row) => {
        const installed = bikeHasBattery(row);
        const pack = row.currentBattery;
        const serial =
          pack && typeof pack === "object"
            ? typeof (pack as Record<string, unknown>).serialNumber === "string"
              ? (pack as Record<string, unknown>).serialNumber
              : null
            : null;
        return installed ? (
          <span title={serial ? String(serial) : undefined}>{t("common.yes")}</span>
        ) : (
          t("common.no")
        );
      },
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
      key: "capacity",
      header: "Capacity",
      align: "right",
      sortValue: (row) => Number(row.capacity ?? 0),
      searchValue: (row) => (row.capacity != null ? `${row.capacity} kWh` : ""),
      render: (row) => (row.capacity != null ? `${row.capacity} kWh` : "—"),
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

function buildAgentColumns(): Column<Row>[] {
  return [
    {
      key: "name",
      header: "Name",
      sortValue: (row) => String(row.name ?? ""),
      searchValue: (row) => {
        const parts = [row.name, row.email, row.phone, row.userId != null ? String(row.userId) : ""];
        const portalUser = row.portalUser;
        if (portalUser && typeof portalUser === "object") {
          const u = portalUser as Record<string, unknown>;
          parts.push(cellValue(u.username), cellValue(u.email));
        }
        return parts.map((value) => cellValue(value)).join(" ");
      },
      render: (row) => cellValue(row.name),
    },
    {
      key: "phone",
      header: "Phone",
      sortValue: (row) => String(row.phone ?? ""),
      searchValue: (row) => String(row.phone ?? ""),
      render: (row) => cellValue(row.phone),
    },
    {
      key: "wallet",
      header: "Wallet",
      align: "right",
      sortValue: (row) => {
        const wallet = row.wallet;
        if (wallet && typeof wallet === "object") {
          return walletBalanceNumber(wallet as Record<string, unknown>);
        }
        return -1;
      },
      searchValue: (row) => {
        const wallet = row.wallet;
        if (!wallet || typeof wallet !== "object") {
          return "no wallet";
        }
        const w = wallet as Record<string, unknown>;
        return `${walletBalanceNumber(w)} ${walletCurrency(w)}`;
      },
      render: (row) => {
        const wallet = row.wallet;
        if (!wallet || typeof wallet !== "object") {
          return "—";
        }
        const w = wallet as Record<string, unknown>;
        return `${walletBalanceNumber(w).toLocaleString()} ${walletCurrency(w)}`;
      },
    },
    {
      key: "status",
      header: "Status",
      sortValue: (row) => String(row.status ?? ""),
      searchValue: (row) => String(row.status ?? ""),
      render: (row) => <Badge status={String(row.status ?? "—")} />,
    },
  ];
}

function topUpDirectoryWallet(row: Row): Record<string, unknown> | null {
  if (row.directoryKind === "owner") {
    const wallet = row.wallet;
    return wallet && typeof wallet === "object" ? (wallet as Record<string, unknown>) : null;
  }
  const riderWallet = row.riderWallet ?? row.wallet;
  return riderWallet && typeof riderWallet === "object" ? (riderWallet as Record<string, unknown>) : null;
}

function topUpDirectoryName(row: Row): string {
  if (row.directoryKind === "owner") {
    return cellValue(row.name);
  }
  return userDisplayName(row);
}

function topUpDirectoryKind(row: Row): string {
  return row.directoryKind === "owner" ? "owner" : "rider";
}

function buildAgentTopUpDirectoryColumns(t: TranslateFn): Column<Row>[] {
  const unassigned = t("tables.headers.unassigned");
  const fleetOwnerHeader = t("detail.labels.fleetOwner" as import("../lib/i18n/translate").MessageKey);

  return [
    {
      key: "kind",
      header: "Kind",
      sortValue: (row) => topUpDirectoryKind(row),
      searchValue: (row) => topUpDirectoryKind(row),
      render: (row) => <Badge status={topUpDirectoryKind(row)} />,
    },
    {
      key: "name",
      header: "Name",
      sortValue: (row) => topUpDirectoryName(row),
      searchValue: (row) => {
        const parts = [topUpDirectoryName(row), row.phone, row.email, row.username].map((value) =>
          cellValue(value),
        );
        return parts.join(" ");
      },
      render: (row) => topUpDirectoryName(row),
    },
    {
      key: "fleetOwner",
      header: fleetOwnerHeader,
      sortValue: (row) => directoryFleetOwnerLabel(row) || unassigned,
      searchValue: (row) => {
        const label = directoryFleetOwnerLabel(row);
        const parts = [label, row.ownerId != null ? String(row.ownerId) : ""];
        return parts.filter(Boolean).join(" ") || unassigned;
      },
      render: (row) => {
        if (row.directoryKind === "owner") {
          return "—";
        }
        const label = directoryFleetOwnerLabel(row);
        return label || unassigned;
      },
    },
    {
      key: "phone",
      header: "Phone",
      sortValue: (row) => String(row.phone ?? ""),
      searchValue: (row) => String(row.phone ?? ""),
      render: (row) => cellValue(row.phone),
    },
    {
      key: "email",
      header: "Email",
      sortValue: (row) => String(row.email ?? ""),
      searchValue: (row) => String(row.email ?? ""),
      render: (row) => cellValue(row.email),
    },
    {
      key: "wallet",
      header: "Wallet",
      sortValue: (row) => {
        const wallet = topUpDirectoryWallet(row);
        return wallet ? walletBalanceNumber(wallet) : -1;
      },
      searchValue: (row) => {
        const wallet = topUpDirectoryWallet(row);
        if (!wallet) {
          return "no wallet";
        }
        return `${walletBalanceNumber(wallet)} ${walletCurrency(wallet)}`;
      },
      render: (row) => {
        const wallet = topUpDirectoryWallet(row);
        if (!wallet) {
          return "—";
        }
        return `${walletBalanceNumber(wallet).toLocaleString()} ${walletCurrency(wallet)}`;
      },
    },
    {
      key: "status",
      header: "Status",
      sortValue: (row) => {
        if (row.directoryKind === "owner") {
          return String(row.status ?? "");
        }
        return row.isActive === false ? "inactive" : "active";
      },
      searchValue: (row) => {
        if (row.directoryKind === "owner") {
          return String(row.status ?? "");
        }
        return row.isActive === false ? "inactive" : "active";
      },
      render: (row) => {
        if (row.directoryKind === "owner") {
          return <Badge status={String(row.status ?? "—")} />;
        }
        return <Badge status={row.isActive === false ? "inactive" : "active"} />;
      },
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
      key: "active",
      header: "Status",
      sortValue: (row) => (row.isActive === false ? "inactive" : "active"),
      searchValue: (row) => (row.isActive === false ? "inactive" : "active"),
      render: (row) => <Badge status={row.isActive === false ? "inactive" : "active"} />,
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
  section: ResourceSection,
  title: string,
  openAssign: (user: SwapperAssignTarget) => void,
  openAssignStationSwapper: (station: StationSwapperAssignTarget) => void,
  openAssignRiderFleetOwner: (user: RiderFleetOwnerAssignTarget) => void,
  openAssociateOwnerRider: (owner: OwnerRiderAssociateTarget) => void,
  openBatteryStationAttach: (battery: BatteryAttachTarget) => void,
  openBatteryBikeAttach: (battery: BatteryBikeAttachTarget) => void,
  openBikeRiderAttach: (bike: BikeRiderAttachTarget) => void,
  openBikeBatteryAttach: (bike: BikeBatteryAttachTarget) => void,
  openCardRiderAssign: (card: CardRiderAssignTarget) => void,
  openWalletTopUp: (wallet: WalletTopUpTarget) => void,
  openAgentWalletTopUp: (target: AgentWalletTopUpTarget) => void,
  openWalletLedger: (account: AccountLedgerTarget) => void,
  navigateToCompanyAccountTransactions: (href: string) => void,
  navigateToStationDetail: (href: string) => void,
  pathPrefix: string,
  openWalletDelete: (payload: { id: number; ownerLabel: string }) => void,
  openResourceEdit: (target: EditResourceTarget) => void,
  openResourceDelete: (payload: { section: ResourceSection; id: number; row: Row }) => void,
  openRolePermissions: (target: RolePermissionsTarget) => void,
  openInventoryIssue?: (target: InventoryIssueTarget) => void,
  returnBatteryToInventory?: (batteryId: number) => void,
  translate?: TranslateFn,
  detailLocale?: import("../lib/locale-storage").LocaleCode,
): TableRowMenuItem[] {
  const items: TableRowMenuItem[] = [];

  if (onDetail) {
    items.push({
      id: "view",
      label: translate ? translate("actions.row.view") : "View",
      onSelect: () =>
        onDetail(buildResourceDetailPayload(section, title, row, cellValue, translate, detailLocale)),
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

    if (def.id === TABLE_ROW_ACTION_IDS.attachBikeBattery) {
      const id = row.id;
      if (typeof id !== "number") {
        continue;
      }

      const plateNumber = typeof row.plateNumber === "string" ? row.plateNumber : undefined;
      const serialNumber = typeof row.serialNumber === "string" ? row.serialNumber : undefined;

      items.push({
        id: def.id,
        label: def.label,
        onSelect: () => openBikeBatteryAttach({ id, plateNumber, serialNumber }),
      });
      continue;
    }

    if (def.id === TABLE_ROW_ACTION_IDS.attachBikeRider) {
      const id = row.id;
      if (typeof id !== "number") {
        continue;
      }

      const plateNumber = typeof row.plateNumber === "string" ? row.plateNumber : undefined;
      const serialNumber = typeof row.serialNumber === "string" ? row.serialNumber : undefined;
      const currentUserId =
        typeof row.userId === "number" ? row.userId : row.userId === null ? null : undefined;

      items.push({
        id: def.id,
        label: def.label,
        onSelect: () =>
          openBikeRiderAttach({
            id,
            plateNumber,
            serialNumber,
            currentUserId,
            hasBatteryInstalled: bikeHasBattery(row),
          }),
      });
      continue;
    }

    if (def.id === TABLE_ROW_ACTION_IDS.assignCardRider) {
      const id = row.id;
      if (typeof id !== "number") {
        continue;
      }

      const serialNumber = typeof row.serialNumber === "string" ? row.serialNumber : undefined;
      const token = typeof row.token === "string" ? row.token : undefined;
      const currentUserId =
        typeof row.userId === "number" ? row.userId : row.userId === null ? null : undefined;

      items.push({
        id: def.id,
        label: def.label,
        onSelect: () => openCardRiderAssign({ id, serialNumber, token, currentUserId }),
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

    if (def.id === TABLE_ROW_ACTION_IDS.assignStationSwapper) {
      const id = row.id;
      if (typeof id !== "number") {
        continue;
      }
      const code = typeof row.code === "string" ? row.code : `#${id}`;
      const name = typeof row.name === "string" ? row.name : `Station #${id}`;
      items.push({
        id: def.id,
        label: def.label,
        onSelect: () => openAssignStationSwapper({ id, code, name }),
      });
      continue;
    }

    if (def.id === TABLE_ROW_ACTION_IDS.assignRiderFleetOwner) {
      items.push({
        id: def.id,
        label: def.label,
        onSelect: () => openAssignRiderFleetOwner(row as unknown as RiderFleetOwnerAssignTarget),
      });
      continue;
    }

    if (def.id === TABLE_ROW_ACTION_IDS.associateOwnerRider) {
      const id = row.id;
      const name = typeof row.name === "string" ? row.name : `Owner #${id ?? "—"}`;
      if (typeof id !== "number") {
        continue;
      }
      items.push({
        id: def.id,
        label: def.label,
        onSelect: () => openAssociateOwnerRider({ id, name }),
      });
      continue;
    }

    if (def.id === TABLE_ROW_ACTION_IDS.walletTopUp) {
      if (section === "riders") {
        const target = agentDirectoryTopUpTargetFromRow(row);
        if (!target) {
          continue;
        }
        items.push({
          id: def.id,
          label: def.label,
          onSelect: () => openAgentWalletTopUp(target),
        });
        continue;
      }

      if (section === "agents") {
        const target = agentFloatTopUpTargetFromRow(row);
        if (!target) {
          continue;
        }
        items.push({
          id: def.id,
          label: def.label,
          onSelect: () => openWalletTopUp(target),
        });
        continue;
      }

      const id = row.id;
      if (typeof id !== "number") {
        continue;
      }

      const { label } = walletHolderCell(row);

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

    if (def.id === TABLE_ROW_ACTION_IDS.walletLedger) {
      const target =
        section === "riders" ? agentDirectoryLedgerTargetFromRow(row) : walletLedgerTargetFromRow(row);
      if (!target) {
        continue;
      }
      items.push({
        id: def.id,
        label: def.label,
        onSelect: () => openWalletLedger(target),
      });
      continue;
    }

    if (def.id === TABLE_ROW_ACTION_IDS.companyAccountLedger) {
      const href = companyAccountTransactionsHref(row, pathPrefix);
      if (!href) {
        continue;
      }
      items.push({
        id: def.id,
        label: def.label,
        onSelect: () => navigateToCompanyAccountTransactions(href),
      });
      continue;
    }

    if (def.id === TABLE_ROW_ACTION_IDS.stationOpen) {
      const id = row.id;
      if (typeof id !== "number") {
        continue;
      }
      items.push({
        id: def.id,
        label: def.label,
        onSelect: () => navigateToStationDetail(stationDetailHref(pathPrefix, id)),
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

    if (def.id === TABLE_ROW_ACTION_IDS.issueInventoryBike && openInventoryIssue) {
      const id = row.id;
      if (typeof id !== "number") {
        continue;
      }
      items.push({
        id: def.id,
        label: def.label,
        onSelect: () =>
          openInventoryIssue({
            inventoryId: id,
            mode: "bike",
            label: inventoryAssetLabel(row),
          }),
      });
      continue;
    }

    if (def.id === TABLE_ROW_ACTION_IDS.issueInventoryBatteryStation && openInventoryIssue) {
      const id = row.id;
      if (typeof id !== "number") {
        continue;
      }
      items.push({
        id: def.id,
        label: def.label,
        onSelect: () =>
          openInventoryIssue({
            inventoryId: id,
            mode: "battery-station",
            label: inventoryAssetLabel(row),
          }),
      });
      continue;
    }

    if (def.id === TABLE_ROW_ACTION_IDS.issueInventoryBatteryBike && openInventoryIssue) {
      const id = row.id;
      if (typeof id !== "number") {
        continue;
      }
      items.push({
        id: def.id,
        label: def.label,
        onSelect: () =>
          openInventoryIssue({
            inventoryId: id,
            mode: "battery-bike",
            label: inventoryAssetLabel(row),
          }),
      });
      continue;
    }

    if (def.id === TABLE_ROW_ACTION_IDS.sendBatteryToInventory && returnBatteryToInventory) {
      const id = row.id;
      if (typeof id !== "number") {
        continue;
      }
      items.push({
        id: def.id,
        label: def.label,
        onSelect: () => returnBatteryToInventory(id),
      });
      continue;
    }

    if (def.id === TABLE_ROW_ACTION_IDS.rolePermissions) {
      const id = row.id;
      const name = typeof row.name === "string" ? row.name : "";
      if (typeof id !== "number" || !name) {
        continue;
      }
      const permissions = Array.isArray(row.permissions)
        ? row.permissions.filter((p): p is string => typeof p === "string")
        : [];
      items.push({
        id: def.id,
        label: def.label,
        onSelect: () => openRolePermissions({ id, name, permissions }),
      });
      continue;
    }

    if (def.id === TABLE_ROW_ACTION_IDS.resourceEdit) {
      if (section === "wallets") {
        continue;
      }
      const id = row.id;
      if (typeof id !== "number") {
        continue;
      }
      const editSection: ResourceSection =
        section === "riders" && row.directoryKind === "owner" ? "owners" : section;
      const fields = translate
        ? getLocalizedResourceUpdateFields(editSection, translate, row)
        : editSection === "users"
          ? getUserUpdateFieldsForRow(row)
          : getResourceUpdateFields(editSection);
      if (!fields?.length) {
        continue;
      }
      items.push({
        id: def.id,
        label: def.label,
        onSelect: () => openResourceEdit({ section: editSection, id, row, fields }),
      });
      continue;
    }

    if (def.id === TABLE_ROW_ACTION_IDS.resourceDelete) {
      if (section === "wallets") {
        continue;
      }
      const id = row.id;
      if (typeof id !== "number") {
        continue;
      }
      const deleteSection: ResourceSection =
        section === "riders" && row.directoryKind === "owner" ? "owners" : section;
      items.push({
        id: def.id,
        label: def.label,
        onSelect: () => openResourceDelete({ section: deleteSection, id, row }),
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
  section: ResourceSection,
  title: string,
  openAssign: (user: SwapperAssignTarget) => void,
  openAssignStationSwapper: (station: StationSwapperAssignTarget) => void,
  openAssignRiderFleetOwner: (user: RiderFleetOwnerAssignTarget) => void,
  openAssociateOwnerRider: (owner: OwnerRiderAssociateTarget) => void,
  openBatteryStationAttach: (battery: BatteryAttachTarget) => void,
  openBatteryBikeAttach: (battery: BatteryBikeAttachTarget) => void,
  openBikeRiderAttach: (bike: BikeRiderAttachTarget) => void,
  openBikeBatteryAttach: (bike: BikeBatteryAttachTarget) => void,
  openCardRiderAssign: (card: CardRiderAssignTarget) => void,
  openWalletTopUp: (wallet: WalletTopUpTarget) => void,
  openAgentWalletTopUp: (target: AgentWalletTopUpTarget) => void,
  openWalletLedger: (account: AccountLedgerTarget) => void,
  navigateToCompanyAccountTransactions: (href: string) => void,
  navigateToStationDetail: (href: string) => void,
  pathPrefix: string,
  openWalletDelete: (payload: { id: number; ownerLabel: string }) => void,
  openResourceEdit: (target: EditResourceTarget) => void,
  openResourceDelete: (payload: { section: ResourceSection; id: number; row: Row }) => void,
  openRolePermissions: (target: RolePermissionsTarget) => void,
  openInventoryIssue?: (target: InventoryIssueTarget) => void,
  returnBatteryToInventory?: (batteryId: number) => void,
  translate?: TranslateFn,
  detailLocale?: import("../lib/locale-storage").LocaleCode,
): Column<Row>[] {
  return [
    ...baseColumns,
    {
      key: "actions",
      header: translate ? translate("tables.headers.actions") : "Actions",
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
          openAssignStationSwapper,
          openAssignRiderFleetOwner,
          openAssociateOwnerRider,
          openBatteryStationAttach,
          openBatteryBikeAttach,
          openBikeRiderAttach,
          openBikeBatteryAttach,
          openCardRiderAssign,
          openWalletTopUp,
          openAgentWalletTopUp,
          openWalletLedger,
          navigateToCompanyAccountTransactions,
          navigateToStationDetail,
          pathPrefix,
          openWalletDelete,
          openResourceEdit,
          openResourceDelete,
          openRolePermissions,
          openInventoryIssue,
          returnBatteryToInventory,
          translate,
          detailLocale,
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
          openAssignStationSwapper,
          openAssignRiderFleetOwner,
          openAssociateOwnerRider,
          openBatteryStationAttach,
          openBatteryBikeAttach,
          openBikeRiderAttach,
          openBikeBatteryAttach,
          openCardRiderAssign,
          openWalletTopUp,
          openAgentWalletTopUp,
          openWalletLedger,
          navigateToCompanyAccountTransactions,
          navigateToStationDetail,
          pathPrefix,
          openWalletDelete,
          openResourceEdit,
          openResourceDelete,
          openRolePermissions,
          openInventoryIssue,
          returnBatteryToInventory,
          translate,
          detailLocale,
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
  section: ResourceSection;
  apiPath: string;
  title: string;
  /** Account route prefix, e.g. `/account` — used for in-app navigation from row actions. */
  pathPrefix?: string;
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
  onBikeRiderSuccess?: () => void;
  onBikeRiderError?: (message: string) => void;
  onCardRiderSuccess?: () => void;
  onCardRiderError?: (message: string) => void;
  onWalletTopUpSuccess?: () => void;
  onWalletTopUpError?: (message: string) => void;
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
  pathPrefix = "/account",
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
  onBikeRiderSuccess,
  onBikeRiderError,
  onCardRiderSuccess,
  onCardRiderError,
  onWalletTopUpSuccess,
  onWalletTopUpError,
  onWalletDeleteSuccess,
  onWalletDeleteError,
  onResourceEditSuccess,
  onResourceEditError,
  onResourceDeleteSuccess,
  onResourceDeleteError,
  reloadKey = 0,
}: ApiResourcePanelProps) {
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [sessionPermissions, setSessionPermissions] = useState<string[]>([]);
  const [assignUser, setAssignUser] = useState<SwapperAssignTarget | null>(null);
  const [assignStationSwapper, setAssignStationSwapper] = useState<StationSwapperAssignTarget | null>(null);
  const [assignRiderFleetOwner, setAssignRiderFleetOwner] = useState<RiderFleetOwnerAssignTarget | null>(null);
  const [associateOwnerRider, setAssociateOwnerRider] = useState<OwnerRiderAssociateTarget | null>(null);
  const [attachBatteryStation, setAttachBatteryStation] = useState<BatteryAttachTarget | null>(null);
  const [attachBatteryBike, setAttachBatteryBike] = useState<BatteryBikeAttachTarget | null>(null);
  const [attachBikeRider, setAttachBikeRider] = useState<BikeRiderAttachTarget | null>(null);
  const [attachBikeBattery, setAttachBikeBattery] = useState<BikeBatteryAttachTarget | null>(null);
  const [assignCardRider, setAssignCardRider] = useState<CardRiderAssignTarget | null>(null);
  const [walletTopUp, setWalletTopUp] = useState<WalletTopUpTarget | null>(null);
  const [agentWalletTopUp, setAgentWalletTopUp] = useState<AgentWalletTopUpTarget | null>(null);
  const [walletLedger, setWalletLedger] = useState<AccountLedgerTarget | null>(null);
  const [walletDelete, setWalletDelete] = useState<{ id: number; ownerLabel: string } | null>(null);
  const [resourceEdit, setResourceEdit] = useState<EditResourceTarget | null>(null);
  const [resourceDelete, setResourceDelete] = useState<{ section: ResourceSection; id: number; row: Row } | null>(null);
  const [rolePermissionsEdit, setRolePermissionsEdit] = useState<RolePermissionsTarget | null>(null);
  const [inventoryIssue, setInventoryIssue] = useState<InventoryIssueTarget | null>(null);
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

  const openAssignStationSwapper = useCallback((station: StationSwapperAssignTarget) => {
    setAssignStationSwapper(station);
  }, []);

  const openAssignRiderFleetOwner = useCallback((user: RiderFleetOwnerAssignTarget) => {
    setAssignRiderFleetOwner(user);
  }, []);

  const openAssociateOwnerRider = useCallback((owner: OwnerRiderAssociateTarget) => {
    setAssociateOwnerRider(owner);
  }, []);

  const openBatteryStationAttach = useCallback((battery: BatteryAttachTarget) => {
    setAttachBatteryStation(battery);
  }, []);

  const openBatteryBikeAttach = useCallback((battery: BatteryBikeAttachTarget) => {
    setAttachBatteryBike(battery);
  }, []);

  const openBikeRiderAttach = useCallback((bikeTarget: BikeRiderAttachTarget) => {
    setAttachBikeRider(bikeTarget);
  }, []);

  const openBikeBatteryAttach = useCallback((bikeTarget: BikeBatteryAttachTarget) => {
    setAttachBikeBattery(bikeTarget);
  }, []);

  const openCardRiderAssign = useCallback((cardTarget: CardRiderAssignTarget) => {
    setAssignCardRider(cardTarget);
  }, []);

  const openWalletTopUpModal = useCallback((wallet: WalletTopUpTarget) => {
    setWalletTopUp(wallet);
  }, []);

  const openAgentWalletTopUpModal = useCallback((target: AgentWalletTopUpTarget) => {
    setAgentWalletTopUp(target);
  }, []);

  const openWalletLedgerModal = useCallback((target: AccountLedgerTarget) => {
    setWalletLedger(target);
  }, []);

  const navigateToCompanyAccountTransactions = useCallback(
    (href: string) => {
      router.push(href);
    },
    [router],
  );

  const navigateToStationDetail = useCallback(
    (href: string) => {
      router.push(href);
    },
    [router],
  );

  const openStationFromRow = useCallback(
    (row: Row) => {
      const id = row.id;
      if (typeof id === "number") {
        router.push(stationDetailHref(pathPrefix, id));
        return;
      }
      onDetail?.(buildResourceDetailPayload(section, title, row, cellValue, t, locale));
    },
    [onDetail, pathPrefix, router, section, title],
  );

  const openWalletDeleteModal = useCallback((payload: { id: number; ownerLabel: string }) => {
    setWalletDelete(payload);
  }, []);

  const openResourceEditModal = useCallback((target: EditResourceTarget) => {
    setResourceEdit(target);
  }, []);

  const openResourceDeleteModal = useCallback((payload: { section: ResourceSection; id: number; row: Row }) => {
    setResourceDelete(payload);
  }, []);

  const openRolePermissionsModal = useCallback((target: RolePermissionsTarget) => {
    setRolePermissionsEdit(target);
  }, []);

  const returnBatteryToInventory = useCallback(
    async (batteryId: number) => {
      try {
        const response = await authFetch(`/inventory/return/battery/${batteryId}`, { method: "POST" });
        if (!response.ok) {
          const message = await userMessageFromResponse("create", response);
          onCreateError?.(message);
          return;
        }
        reload();
        onCreateSuccess?.();
      } catch {
        onCreateError?.(userMessageForNetwork("create"));
      }
    },
    [onCreateError, onCreateSuccess, reload],
  );

  const allRowActionsForSection = useMemo(
    () => localizeRowActions(getAvailableRowActions(section, sessionPermissions), t, section),
    [section, sessionPermissions, t],
  );

  const columns = useMemo(() => {
    let base: Column<Row>[];

    if (section === "riders") {
      base = buildAgentTopUpDirectoryColumns(t);
    } else if (section === "users") {
      base = buildUserColumns();
    } else if (section === "batteries") {
      base = buildBatteryDataColumns();
    } else if (section === "bikes") {
      base = buildBikeDataColumns(t, locale);
    } else if (section === "inventory") {
      base = buildInventoryDataColumns();
    } else if (section === "wallets") {
      base = buildWalletDataColumns(t);
    } else if (section === "agents") {
      base = buildAgentColumns();
    } else if (section === "cards") {
      base = buildCardDataColumns(t, locale);
    } else {
      base = buildColumns(rows, locale, section);
    }

    return appendActionsColumn(
      base,
      allRowActionsForSection,
      onDetail,
      section,
      title,
      openAssign,
      openAssignStationSwapper,
      openAssignRiderFleetOwner,
      openAssociateOwnerRider,
      openBatteryStationAttach,
      openBatteryBikeAttach,
      openBikeRiderAttach,
      openBikeBatteryAttach,
      openCardRiderAssign,
      openWalletTopUpModal,
      openAgentWalletTopUpModal,
      openWalletLedgerModal,
      navigateToCompanyAccountTransactions,
      navigateToStationDetail,
      pathPrefix,
      openWalletDeleteModal,
      openResourceEditModal,
      openResourceDeleteModal,
      openRolePermissionsModal,
      setInventoryIssue,
      returnBatteryToInventory,
      t,
      locale,
    );
  }, [
    allRowActionsForSection,
    onDetail,
    openAssign,
    openAssignStationSwapper,
    openAssignRiderFleetOwner,
    openAssociateOwnerRider,
    openBikeRiderAttach,
    openBikeBatteryAttach,
    openCardRiderAssign,
    openBatteryBikeAttach,
    openBatteryStationAttach,
    openWalletTopUpModal,
    openAgentWalletTopUpModal,
    openWalletLedgerModal,
    navigateToCompanyAccountTransactions,
    navigateToStationDetail,
    pathPrefix,
    openWalletDeleteModal,
    openResourceEditModal,
    openResourceDeleteModal,
    openRolePermissionsModal,
    returnBatteryToInventory,
    rows,
    section,
    title,
    t,
    locale,
  ]);

  const tableSelectFilters = useMemo(() => buildResourceTableFilters(section, rows), [rows, section]);

  const tableSortOptions = useMemo(() => buildResourceTableSortOptions(section, columns), [columns, section]);

  const tableDefaultSortKey = useMemo(() => resourceTableDefaultSortKey(section, columns), [columns, section]);

  const searchPlaceholderFromSection =
    section === "users"
      ? "Search users…"
      : section === "riders"
        ? "Search riders and owners…"
        : section === "batteries"
        ? "Search batteries…"
        : section === "inventory"
          ? "Search warehouse stock…"
        : section === "swaps"
          ? "Search swaps…"
          : section === "wallets"
            ? "Search wallets…"
            : section === "agents"
              ? "Search agents…"
              : section === "companyAccounts"
                ? "Search company accounts…"
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
            permissions={sessionPermissions}
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
        key={section}
        className="data-table-panel"
        columns={columns}
        rows={rows}
        loading={loading}
        rowKey={(row) => String(row.id ?? JSON.stringify(row))}
        empty={error ? t("table.emptyLoadError") : t("table.noRecordsYet")}
        searchPlaceholder={searchPlaceholderFromSection}
        selectFilters={tableSelectFilters}
        sortOptions={tableSortOptions}
        defaultSortKey={tableDefaultSortKey}
        defaultSortDirection={section === "swaps" ? "desc" : "asc"}
        onRowClick={
          section === "stations"
            ? openStationFromRow
            : onDetail
              ? (row) => onDetail(buildResourceDetailPayload(section, title, row, cellValue, t, locale))
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

      <AssignStationSwapperModal
        open={assignStationSwapper !== null}
        station={assignStationSwapper}
        onClose={() => setAssignStationSwapper(null)}
        onSaved={() => {
          reload();
          onAssignSuccess?.();
        }}
        onError={onAssignError}
      />

      <AssignRiderFleetOwnerModal
        open={assignRiderFleetOwner !== null}
        user={assignRiderFleetOwner}
        onClose={() => setAssignRiderFleetOwner(null)}
        onSaved={() => {
          reload();
          onAssignSuccess?.();
        }}
        onError={onAssignError}
      />

      <AssociateOwnerRiderModal
        open={associateOwnerRider !== null}
        owner={associateOwnerRider}
        onClose={() => setAssociateOwnerRider(null)}
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

      <AttachBikeRiderModal
        key={attachBikeRider != null ? `bike-rider-${attachBikeRider.id}` : "bike-rider-closed"}
        open={attachBikeRider !== null}
        bike={attachBikeRider}
        onClose={() => setAttachBikeRider(null)}
        onSaved={() => {
          reload();
          onBikeRiderSuccess?.();
        }}
        onError={onBikeRiderError}
      />

      <AttachBikeBatteryModal
        key={attachBikeBattery != null ? `bike-battery-${attachBikeBattery.id}` : "bike-battery-closed"}
        open={attachBikeBattery !== null}
        bike={attachBikeBattery}
        onClose={() => setAttachBikeBattery(null)}
        onSaved={() => {
          reload();
          onBatteryBikeSuccess?.();
        }}
        onError={onBatteryBikeError}
      />

      <AssignCardRiderModal
        key={assignCardRider != null ? `card-rider-${assignCardRider.id}` : "card-rider-closed"}
        open={assignCardRider !== null}
        card={assignCardRider}
        onClose={() => setAssignCardRider(null)}
        onSaved={() => {
          reload();
          onCardRiderSuccess?.();
        }}
        onError={onCardRiderError}
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

      <AgentWalletTopUpModal
        open={agentWalletTopUp !== null}
        target={agentWalletTopUp}
        onClose={() => setAgentWalletTopUp(null)}
        onSaved={() => {
          reload();
          onWalletTopUpSuccess?.();
        }}
        onError={onWalletTopUpError}
      />

      <WalletLedgerModal
        open={walletLedger !== null}
        account={walletLedger}
        onClose={() => setWalletLedger(null)}
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

      <IssueInventoryModal
        open={inventoryIssue !== null}
        target={inventoryIssue}
        onClose={() => setInventoryIssue(null)}
        onSaved={() => {
          reload();
          onAssignSuccess?.();
        }}
        onError={onAssignError}
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

      <EditRolePermissionsModal
        open={rolePermissionsEdit !== null}
        target={rolePermissionsEdit}
        onClose={() => setRolePermissionsEdit(null)}
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
