import { batteryMayBeAssigned } from "./battery-status";
import { PERMISSIONS } from "./permission-strings";
import type { ResourceSection } from "./resource-create-config";
import type { Section } from "./nav";
import { agentDirectoryTopUpTargetFromRow, agentFloatTopUpTargetFromRow } from "./wallet-row-helpers";
import type { MessageKey, TranslateFn } from "./i18n/translate";

/**
 * Row-level actions for API resource tables. Permission strings match
 * `server/src/auth/permission-catalog.ts` (e.g. batteries:write).
 */
export const TABLE_ROW_ACTION_IDS = {
  attachBatteryStation: "attach-battery-station",
  attachBatteryBike: "attach-battery-bike",
  attachBikeBattery: "attach-bike-battery",
  attachBikeRider: "attach-bike-rider",
  assignCardRider: "assign-card-rider",
  assignSwapperStation: "assign-swapper-station",
  assignStationSwapper: "assign-station-swapper",
  assignRiderFleetOwner: "assign-rider-fleet-owner",
  associateOwnerRider: "associate-owner-rider",
  walletTopUp: "wallet-top-up",
  walletLedger: "wallet-ledger",
  companyAccountLedger: "company-account-ledger",
  stationOpen: "station-open",
  walletDelete: "wallet-delete",
  resourceEdit: "resource-edit",
  resourceDelete: "resource-delete",
  issueInventoryBike: "issue-inventory-bike",
  issueInventoryBatteryStation: "issue-inventory-battery-station",
  issueInventoryBatteryBike: "issue-inventory-battery-bike",
} as const;

export type TableRowActionId = (typeof TABLE_ROW_ACTION_IDS)[keyof typeof TABLE_ROW_ACTION_IDS];

export type TableRowActionDef = {
  id: TableRowActionId;
  label: string;
  /** Required to show the control; `system:admin` implies all actions. */
  permission: string;
  /** When set, the button is only shown for rows where this returns true. */
  visibleForRow?: (row: Record<string, unknown>) => boolean;
};

const genericEdit = (permission: string): TableRowActionDef => ({
  id: TABLE_ROW_ACTION_IDS.resourceEdit,
  label: "Edit",
  permission,
});

const genericDelete = (permission: string): TableRowActionDef => ({
  id: TABLE_ROW_ACTION_IDS.resourceDelete,
  label: "Delete",
  permission,
});

/** All defined row actions per section (source of truth for “possible” actions). */
function batteryHasStation(row: Record<string, unknown>): boolean {
  return (
    row.stationId != null || (row.station != null && typeof row.station === "object")
  );
}

function batteryHasBike(row: Record<string, unknown>): boolean {
  return row.bike != null && typeof row.bike === "object";
}

function batteryRowStatus(row: Record<string, unknown>): string | undefined {
  if (typeof row.status === "string") {
    return row.status;
  }
  const battery = row.battery;
  if (battery != null && typeof battery === "object") {
    const nested = (battery as Record<string, unknown>).status;
    return typeof nested === "string" ? nested : undefined;
  }
  return undefined;
}

function batteryRowAssignable(row: Record<string, unknown>): boolean {
  return batteryMayBeAssigned(batteryRowStatus(row));
}

function bikeHasFleetOwner(row: Record<string, unknown>): boolean {
  return row.ownerId != null || (row.owner != null && typeof row.owner === "object");
}

function bikeHasInstalledPack(row: Record<string, unknown>): boolean {
  return row.currentBatteryId != null || (row.currentBattery != null && typeof row.currentBattery === "object");
}

export const TABLE_ROW_ACTIONS_BY_SECTION: Record<ResourceSection, readonly TableRowActionDef[]> = {
  inventory: [
    {
      id: TABLE_ROW_ACTION_IDS.issueInventoryBike,
      label: "Issue to owner",
      permission: PERMISSIONS.inventory.write,
      visibleForRow: (row) => row.kind === "bike",
    },
    {
      id: TABLE_ROW_ACTION_IDS.issueInventoryBatteryStation,
      label: "Issue to station",
      permission: PERMISSIONS.inventory.write,
      visibleForRow: (row) => row.kind === "battery" && batteryRowAssignable(row),
    },
    {
      id: TABLE_ROW_ACTION_IDS.issueInventoryBatteryBike,
      label: "Issue to bike",
      permission: PERMISSIONS.inventory.write,
      visibleForRow: (row) => row.kind === "battery" && batteryRowAssignable(row),
    },
    genericEdit(PERMISSIONS.inventory.write),
    genericDelete(PERMISSIONS.inventory.delete),
  ],
  batteries: [
    {
      id: TABLE_ROW_ACTION_IDS.attachBatteryStation,
      label: "Attach to station",
      permission: PERMISSIONS.batteries.write,
      visibleForRow: (row) =>
        !batteryHasBike(row) && !batteryHasStation(row) && batteryRowAssignable(row),
    },
    {
      id: TABLE_ROW_ACTION_IDS.attachBatteryBike,
      label: "Attach to bike",
      permission: PERMISSIONS.batteries.write,
      visibleForRow: (row) =>
        !batteryHasBike(row) && !batteryHasStation(row) && batteryRowAssignable(row),
    },
    genericEdit(PERMISSIONS.batteries.write),
    genericDelete(PERMISSIONS.batteries.delete),
  ],
  owners: [
    {
      id: TABLE_ROW_ACTION_IDS.associateOwnerRider,
      label: "Associate rider",
      permission: PERMISSIONS.users.write,
    },
    genericEdit(PERMISSIONS.owners.write),
    genericDelete(PERMISSIONS.owners.delete),
  ],
  riders: [
    {
      id: TABLE_ROW_ACTION_IDS.walletTopUp,
      label: "Top up",
      permission: PERMISSIONS.wallets.agentTopup,
      visibleForRow: (row) => agentDirectoryTopUpTargetFromRow(row) != null,
    },
  ],
  agents: [
    {
      id: TABLE_ROW_ACTION_IDS.walletTopUp,
      label: "Add float",
      permission: PERMISSIONS.wallets.credit,
      visibleForRow: (row) => agentFloatTopUpTargetFromRow(row) != null,
    },
    genericEdit(PERMISSIONS.agents.write),
    genericDelete(PERMISSIONS.agents.delete),
  ],
  bikes: [
    {
      id: TABLE_ROW_ACTION_IDS.attachBikeBattery,
      label: "Attach battery",
      permission: PERMISSIONS.bikes.write,
      visibleForRow: (row) => bikeHasFleetOwner(row) && !bikeHasInstalledPack(row),
    },
    {
      id: TABLE_ROW_ACTION_IDS.attachBikeRider,
      label: "Assign rider",
      permission: PERMISSIONS.bikes.write,
    },
    genericEdit(PERMISSIONS.bikes.write),
    genericDelete(PERMISSIONS.bikes.delete),
  ],
  cards: [
    {
      id: TABLE_ROW_ACTION_IDS.assignCardRider,
      label: "Assign rider",
      permission: PERMISSIONS.cards.write,
    },
    genericEdit(PERMISSIONS.cards.write),
    genericDelete(PERMISSIONS.cards.delete),
  ],
  roles: [genericEdit(PERMISSIONS.roles.write), genericDelete(PERMISSIONS.roles.delete)],
  stations: [
    {
      id: TABLE_ROW_ACTION_IDS.stationOpen,
      label: "Open station",
      permission: PERMISSIONS.stations.read,
    },
    {
      id: TABLE_ROW_ACTION_IDS.assignStationSwapper,
      label: "Assign swapper",
      permission: PERMISSIONS.users.write,
    },
    genericEdit(PERMISSIONS.stations.write),
    genericDelete(PERMISSIONS.stations.delete),
  ],
  swaps: [genericEdit(PERMISSIONS.swaps.write), genericDelete(PERMISSIONS.swaps.delete)],
  users: [
    {
      id: TABLE_ROW_ACTION_IDS.assignSwapperStation,
      label: "Assign station",
      permission: PERMISSIONS.users.write,
      visibleForRow: (row) => row.type === "swapper" && row.isActive !== false,
    },
    {
      id: TABLE_ROW_ACTION_IDS.assignRiderFleetOwner,
      label: "Assign fleet owner",
      permission: PERMISSIONS.users.write,
      visibleForRow: (row) => row.type === "rider" && row.isActive !== false,
    },
    genericEdit(PERMISSIONS.users.write),
    {
      ...genericDelete(PERMISSIONS.users.delete),
      label: "Deactivate",
      visibleForRow: (row) => row.isActive !== false,
    },
  ],
  violations: [genericEdit(PERMISSIONS.violations.write), genericDelete(PERMISSIONS.violations.delete)],
  incidents: [],
  wallets: [
    {
      id: TABLE_ROW_ACTION_IDS.walletTopUp,
      label: "Top up",
      permission: PERMISSIONS.wallets.credit,
    },
    {
      id: TABLE_ROW_ACTION_IDS.walletLedger,
      label: "Ledger",
      permission: PERMISSIONS.wallets.read,
    },
    {
      id: TABLE_ROW_ACTION_IDS.walletDelete,
      label: "Delete wallet",
      permission: PERMISSIONS.wallets.delete,
    },
  ],
  companyAccounts: [
    {
      id: TABLE_ROW_ACTION_IDS.companyAccountLedger,
      label: "Transactions",
      permission: PERMISSIONS.companyAccounts.read,
    },
  ],
};

const ADMIN = "system:admin";

export function userMayUsePermission(permissions: readonly string[], required: string): boolean {
  if (permissions.includes(ADMIN)) {
    return true;
  }

  return permissions.includes(required);
}

/** Returns which row actions the current user may see for this section (from registry + permissions). */
export function getAvailableRowActions(section: Section, permissions: readonly string[]): TableRowActionDef[] {
  if (section === "overview" || section === "topUp" || section === "agentTransactions") {
    return [];
  }

  const defs = TABLE_ROW_ACTIONS_BY_SECTION[section];
  return defs.filter((def: TableRowActionDef) => userMayUsePermission(permissions, def.permission));
}

/** Actions applicable to one row (used by table menus and the record detail dialog). */
export function getRowActionsForRecord(
  section: Section,
  permissions: readonly string[],
  row: Record<string, unknown>,
): TableRowActionDef[] {
  return getAvailableRowActions(section, permissions).filter(
    (def) => !def.visibleForRow || def.visibleForRow(row),
  );
}

const ROW_ACTION_MESSAGE_KEYS: Partial<Record<TableRowActionId, MessageKey>> = {
  [TABLE_ROW_ACTION_IDS.resourceEdit]: "actions.row.edit",
  [TABLE_ROW_ACTION_IDS.resourceDelete]: "actions.row.delete",
  [TABLE_ROW_ACTION_IDS.attachBatteryStation]: "actions.row.attachBatteryStation",
  [TABLE_ROW_ACTION_IDS.attachBatteryBike]: "actions.row.attachBatteryBike",
  [TABLE_ROW_ACTION_IDS.attachBikeBattery]: "actions.row.attachBikeBattery",
  [TABLE_ROW_ACTION_IDS.attachBikeRider]: "actions.row.attachBikeRider",
  [TABLE_ROW_ACTION_IDS.assignCardRider]: "actions.row.assignCardRider",
  [TABLE_ROW_ACTION_IDS.associateOwnerRider]: "actions.row.associateOwnerRider",
  [TABLE_ROW_ACTION_IDS.walletTopUp]: "actions.row.walletTopUp",
  [TABLE_ROW_ACTION_IDS.walletLedger]: "actions.row.walletLedger",
  [TABLE_ROW_ACTION_IDS.companyAccountLedger]: "actions.row.companyAccountLedger",
  [TABLE_ROW_ACTION_IDS.stationOpen]: "actions.row.stationOpen",
  [TABLE_ROW_ACTION_IDS.walletDelete]: "actions.row.walletDelete",
  [TABLE_ROW_ACTION_IDS.assignSwapperStation]: "actions.row.assignSwapperStation",
  [TABLE_ROW_ACTION_IDS.assignStationSwapper]: "actions.row.assignStationSwapper",
  [TABLE_ROW_ACTION_IDS.assignRiderFleetOwner]: "actions.row.assignRiderFleetOwner",
  [TABLE_ROW_ACTION_IDS.issueInventoryBike]: "actions.row.issueInventoryBike",
  [TABLE_ROW_ACTION_IDS.issueInventoryBatteryStation]: "actions.row.issueInventoryBatteryStation",
  [TABLE_ROW_ACTION_IDS.issueInventoryBatteryBike]: "actions.row.issueInventoryBatteryBike",
};

export function localizeRowActions(
  defs: readonly TableRowActionDef[],
  t: TranslateFn,
  section?: Section,
): TableRowActionDef[] {
  return defs.map((def) => {
    let key = ROW_ACTION_MESSAGE_KEYS[def.id];
    if (def.id === TABLE_ROW_ACTION_IDS.walletTopUp && def.label === "Add float") {
      key = "actions.row.addFloat";
    }
    if (def.id === TABLE_ROW_ACTION_IDS.resourceDelete && section === "users" && def.label === "Deactivate") {
      key = "actions.row.deactivate";
    }
    if (!key) {
      return def;
    }
    return { ...def, label: t(key) };
  });
}
