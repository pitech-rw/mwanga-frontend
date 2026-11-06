import type { Section } from "./nav";

/**
 * Row-level actions for API resource tables. Permission strings match
 * `server/src/auth/permission-catalog.ts` (e.g. batteries:write).
 */
export const TABLE_ROW_ACTION_IDS = {
  attachBatteryStation: "attach-battery-station",
  attachBatteryBike: "attach-battery-bike",
  assignSwapperStation: "assign-swapper-station",
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

/** All defined row actions per section (source of truth for “possible” actions). */
function batteryHasStation(row: Record<string, unknown>): boolean {
  return (
    row.stationId != null || (row.station != null && typeof row.station === "object")
  );
}

function batteryHasBike(row: Record<string, unknown>): boolean {
  return row.bike != null && typeof row.bike === "object";
}

export const TABLE_ROW_ACTIONS_BY_SECTION: Partial<Record<Section, readonly TableRowActionDef[]>> = {
  batteries: [
    {
      id: TABLE_ROW_ACTION_IDS.attachBatteryStation,
      label: "Attach to station",
      permission: "batteries:write",
      visibleForRow: (row) => !batteryHasBike(row),
    },
    {
      id: TABLE_ROW_ACTION_IDS.attachBatteryBike,
      label: "Attach to bike",
      permission: "batteries:write",
      visibleForRow: (row) => !batteryHasStation(row),
    },
  ],
  users: [
    {
      id: TABLE_ROW_ACTION_IDS.assignSwapperStation,
      label: "Assign station",
      permission: "users:write",
      visibleForRow: (row) => row.type === "swapper",
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
  const defs = TABLE_ROW_ACTIONS_BY_SECTION[section];
  if (!defs?.length) {
    return [];
  }

  return defs.filter((def) => userMayUsePermission(permissions, def.permission));
}
