import {
  AGENT_NAV_ITEMS,
  MENU_ITEMS,
  NAV_MENU_GROUPS,
  NAV_PRIMARY_ITEMS,
  NAV_SECONDARY_ITEMS,
  type MenuItem,
  type NavMenuGroup,
  type Section,
} from "./nav";
import { PERMISSIONS } from "./permission-strings";
import type { ResourceSection } from "./resource-create-config";
import { userMayUsePermission } from "./table-row-actions";

/** Permission required to open a nav destination (GET access). `null` = always allowed in staff shell. */
export const SECTION_READ_PERMISSION: Record<Section, string | null> = {
  overview: null,
  topUp: PERMISSIONS.wallets.agentTopup,
  agentTransactions: PERMISSIONS.agents.read,
  riders: PERMISSIONS.riders.read,
  stations: PERMISSIONS.stations.read,
  swaps: PERMISSIONS.swaps.read,
  inventory: PERMISSIONS.inventory.read,
  batteries: PERMISSIONS.batteries.read,
  bikes: PERMISSIONS.bikes.read,
  owners: PERMISSIONS.owners.read,
  agents: PERMISSIONS.agents.read,
  users: PERMISSIONS.users.read,
  roles: PERMISSIONS.roles.read,
  cards: PERMISSIONS.cards.read,
  wallets: PERMISSIONS.wallets.read,
  companyAccounts: PERMISSIONS.companyAccounts.read,
  violations: PERMISSIONS.violations.read,
  incidents: PERMISSIONS.incidents.read,
  erasureRequests: PERMISSIONS.system.admin,
};

/** Permission required to show the create (+) control for a resource section. */
export const SECTION_WRITE_PERMISSION: Record<ResourceSection, string> = {
  batteries: PERMISSIONS.batteries.write,
  bikes: PERMISSIONS.bikes.write,
  cards: PERMISSIONS.cards.write,
  inventory: PERMISSIONS.inventory.write,
  owners: PERMISSIONS.owners.write,
  agents: PERMISSIONS.agents.write,
  users: PERMISSIONS.users.write,
  roles: PERMISSIONS.roles.write,
  stations: PERMISSIONS.stations.write,
  swaps: PERMISSIONS.swaps.write,
  wallets: PERMISSIONS.wallets.write,
  companyAccounts: PERMISSIONS.companyAccounts.write,
  violations: PERMISSIONS.violations.write,
  incidents: PERMISSIONS.incidents.write,
  riders: PERMISSIONS.riders.write,
};

export function userCanAccessSection(section: Section, permissions: readonly string[]): boolean {
  if (section === "riders") {
    return (
      userMayUsePermission(permissions, PERMISSIONS.riders.read) ||
      userMayUsePermission(permissions, PERMISSIONS.owners.read)
    );
  }
  const required = SECTION_READ_PERMISSION[section];
  if (required === null) {
    return true;
  }
  return userMayUsePermission(permissions, required);
}

export function filterMenuItems<T extends Pick<MenuItem, "id">>(items: readonly T[], permissions: readonly string[]): T[] {
  return items.filter((item) => userCanAccessSection(item.id, permissions));
}

export function filterNavGroups(groups: readonly NavMenuGroup[], permissions: readonly string[]): NavMenuGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: filterMenuItems(group.items, permissions),
    }))
    .filter((group) => group.items.length > 0);
}

const STAFF_NAV_SECTION_ORDER: Section[] = [
  ...NAV_PRIMARY_ITEMS.map((item) => item.id),
  ...NAV_MENU_GROUPS.flatMap((group) => group.items.map((item) => item.id)),
  ...NAV_SECONDARY_ITEMS.map((item) => item.id),
];

const AGENT_NAV_SECTION_ORDER: Section[] = AGENT_NAV_ITEMS.map((item) => item.id);

export function firstAccessibleSection(
  permissions: readonly string[],
  options: { agent: boolean },
): Section {
  const order = options.agent ? AGENT_NAV_SECTION_ORDER : STAFF_NAV_SECTION_ORDER;
  for (const section of order) {
    if (userCanAccessSection(section, permissions)) {
      return section;
    }
  }
  return options.agent ? "topUp" : "overview";
}

export function canManageOtherUsers(permissions: readonly string[]): boolean {
  return (
    userMayUsePermission(permissions, PERMISSIONS.users.write) ||
    userMayUsePermission(permissions, PERMISSIONS.system.admin)
  );
}

/** Whether the user may open a company-account transactions sub-route. */
export function userCanAccessCompanyAccountTransactions(permissions: readonly string[]): boolean {
  return userCanAccessSection("companyAccounts", permissions);
}

/** Whether the user may open a station detail sub-route. */
export function userCanAccessStationDetail(permissions: readonly string[]): boolean {
  return userCanAccessSection("stations", permissions);
}

export function sectionWritePermission(section: Section): string | null {
  if (!(section in SECTION_WRITE_PERMISSION)) {
    return null;
  }
  return SECTION_WRITE_PERMISSION[section as ResourceSection];
}

/** All staff menu sections in sidebar order (for tests / diagnostics). */
export const ALL_MENU_SECTIONS: Section[] = MENU_ITEMS.map((item) => item.id);