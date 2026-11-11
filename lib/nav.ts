export type Section =
  | "overview"
  | "batteries"
  | "bikes"
  | "cards"
  | "roles"
  | "stations"
  | "swaps"
  | "users"
  | "owners"
  | "agents"
  | "violations"
  | "wallets"
  | "companyAccounts";

export type MenuItem = {
  id: Section;
  label: string;
  apiPath: string | null;
  eyebrow: string;
  title: string;
};

export type NavMenuGroup = {
  label: string;
  items: MenuItem[];
};

const MENU_ITEM_MAP: Record<Section, MenuItem> = {
  overview: {
    id: "overview",
    label: "Overview",
    apiPath: null,
    eyebrow: "Operations",
    title: "Battery swap command",
  },
  stations: {
    id: "stations",
    label: "Stations",
    apiPath: "/stations",
    eyebrow: "Network",
    title: "Stations",
  },
  swaps: {
    id: "swaps",
    label: "Swaps",
    apiPath: "/swaps",
    eyebrow: "Ledger",
    title: "Swap transactions",
  },
  batteries: {
    id: "batteries",
    label: "Batteries",
    apiPath: "/batteries",
    eyebrow: "Inventory",
    title: "Batteries",
  },
  bikes: {
    id: "bikes",
    label: "Bikes",
    apiPath: "/bikes",
    eyebrow: "Fleet",
    title: "Bikes",
  },
  owners: {
    id: "owners",
    label: "Owners",
    apiPath: "/owners",
    eyebrow: "Fleet",
    title: "Fleet owners",
  },
  agents: {
    id: "agents",
    label: "Agents",
    apiPath: "/agents",
    eyebrow: "Fleet",
    title: "Agents",
  },
  users: {
    id: "users",
    label: "Users",
    apiPath: "/users",
    eyebrow: "Administration",
    title: "Users",
  },
  roles: {
    id: "roles",
    label: "Roles",
    apiPath: "/roles",
    eyebrow: "Access",
    title: "Roles",
  },
  cards: {
    id: "cards",
    label: "Cards",
    apiPath: "/cards",
    eyebrow: "Access",
    title: "NFC cards",
  },
  wallets: {
    id: "wallets",
    label: "Wallets",
    apiPath: "/wallets",
    eyebrow: "Finance",
    title: "Wallets",
  },
  companyAccounts: {
    id: "companyAccounts",
    label: "Company accounts",
    apiPath: "/company-accounts",
    eyebrow: "Finance",
    title: "Company accounts",
  },
  violations: {
    id: "violations",
    label: "Violations",
    apiPath: "/violations",
    eyebrow: "Compliance",
    title: "Violations",
  },
};

/** Top-level destinations (ungrouped) — common SaaS pattern for home / dashboard. */
export const NAV_PRIMARY_ITEMS: MenuItem[] = [MENU_ITEM_MAP.overview];

/** Collapsible sections — multi-item groups only (no single-link sections). */
const NAV_GROUP_SECTIONS: { label: string; sections: Section[] }[] = [
  { label: "Network", sections: ["stations", "swaps"] },
  { label: "Fleet & inventory", sections: ["batteries", "bikes", "owners", "agents"] },
  { label: "People & access", sections: ["users", "roles", "cards"] },
  { label: "Finance", sections: ["wallets", "companyAccounts"] },
];

export const NAV_MENU_GROUPS: NavMenuGroup[] = NAV_GROUP_SECTIONS.map(({ label, sections }) => ({
  label,
  items: sections.map((id) => MENU_ITEM_MAP[id]),
}));

/** Pinned below groups — infrequent / compliance items without a noisy header. */
export const NAV_SECONDARY_ITEMS: MenuItem[] = [MENU_ITEM_MAP.violations];

export const MENU_ITEMS: MenuItem[] = [
  ...NAV_PRIMARY_ITEMS,
  ...NAV_MENU_GROUPS.flatMap((group) => group.items),
  ...NAV_SECONDARY_ITEMS,
];

export const API_MENU_ITEMS = MENU_ITEMS.filter((item): item is MenuItem & { apiPath: string } => item.apiPath !== null);

export function getMenuItem(section: Section): MenuItem {
  return MENU_ITEM_MAP[section] ?? MENU_ITEM_MAP.overview;
}
