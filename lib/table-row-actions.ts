import { PERMISSIONS } from "./permission-strings";
import type { ResourceSection } from "./resource-create-config";
import type { Section } from "./nav";
import { agentDirectoryTopUpTargetFromRow, agentFloatTopUpTargetFromRow } from "./wallet-row-helpers";

/**
 * Row-level actions for API resource tables. Permission strings match
 * `server/src/auth/permission-catalog.ts` (e.g. batteries:write).
 */
export const TABLE_ROW_ACTION_IDS = {
  attachBatteryStation: "attach-battery-station",
  attachBatteryBike: "attach-battery-bike",
  attachBikeRider: "attach-bike-rider",
  assignCardRider: "assign-card-rider",
  assignSwapperStation: "assign-swapper-station",
  walletTopUp: "wallet-top-up",
  walletLedger: "wallet-ledger",
  companyAccountLedger: "company-account-ledger",
  walletDelete: "wallet-delete",
  resourceEdit: "resource-edit",
  resourceDelete: "resource-delete",
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

export const TABLE_ROW_ACTIONS_BY_SECTION: Record<ResourceSection, readonly TableRowActionDef[]> = {
  batteries: [
    {
      id: TABLE_ROW_ACTION_IDS.attachBatteryStation,
      label: "Attach to station",
      permission: PERMISSIONS.batteries.write,
      visibleForRow: (row) => !batteryHasBike(row),
    },
    {
      id: TABLE_ROW_ACTION_IDS.attachBatteryBike,
      label: "Attach to bike",
      permission: PERMISSIONS.batteries.write,
      visibleForRow: (row) => !batteryHasStation(row),
    },
    genericEdit(PERMISSIONS.batteries.write),
    genericDelete(PERMISSIONS.batteries.delete),
  ],
  owners: [genericEdit(PERMISSIONS.owners.write), genericDelete(PERMISSIONS.owners.delete)],
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
  stations: [genericEdit(PERMISSIONS.stations.write), genericDelete(PERMISSIONS.stations.delete)],
  swaps: [genericEdit(PERMISSIONS.swaps.write), genericDelete(PERMISSIONS.swaps.delete)],
  users: [
    {
      id: TABLE_ROW_ACTION_IDS.assignSwapperStation,
      label: "Assign station",
      permission: PERMISSIONS.users.write,
      visibleForRow: (row) => row.type === "swapper",
    },
    genericEdit(PERMISSIONS.users.write),
    genericDelete(PERMISSIONS.users.delete),
  ],
  violations: [genericEdit(PERMISSIONS.violations.write), genericDelete(PERMISSIONS.violations.delete)],
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
  if (section === "overview" || section === "topUp") {
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
