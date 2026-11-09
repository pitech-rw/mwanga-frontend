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

/** Sidebar order mirrors server `src` modules (plus overview). */
export const MENU_ITEMS: MenuItem[] = [
  {
    id: "overview",
    label: "Overview",
    apiPath: null,
    eyebrow: "Operations",
    title: "Battery swap command",
  },
  {
    id: "batteries",
    label: "Batteries",
    apiPath: "/batteries",
    eyebrow: "Inventory",
    title: "Batteries",
  },
  {
    id: "bikes",
    label: "Bikes",
    apiPath: "/bikes",
    eyebrow: "Fleet",
    title: "Bikes",
  },
  {
    id: "cards",
    label: "Cards",
    apiPath: "/cards",
    eyebrow: "Access",
    title: "NFC cards",
  },
  {
    id: "roles",
    label: "Roles",
    apiPath: "/roles",
    eyebrow: "Access",
    title: "Roles",
  },
  {
    id: "stations",
    label: "Stations",
    apiPath: "/stations",
    eyebrow: "Network",
    title: "Stations",
  },
  {
    id: "swaps",
    label: "Swaps",
    apiPath: "/swaps",
    eyebrow: "Ledger",
    title: "Swap transactions",
  },
  {
    id: "users",
    label: "Users",
    apiPath: "/users",
    eyebrow: "Administration",
    title: "Users",
  },
  {
    id: "owners",
    label: "Owners",
    apiPath: "/owners",
    eyebrow: "Fleet",
    title: "Fleet owners",
  },
  {
    id: "violations",
    label: "Violations",
    apiPath: "/violations",
    eyebrow: "Compliance",
    title: "Violations",
  },
  {
    id: "wallets",
    label: "Wallets",
    apiPath: "/wallets",
    eyebrow: "Finance",
    title: "Wallets",
  },
  {
    id: "companyAccounts",
    label: "Company accounts",
    apiPath: "/company-accounts",
    eyebrow: "Finance",
    title: "Company accounts",
  },
];

export const API_MENU_ITEMS = MENU_ITEMS.filter((item): item is MenuItem & { apiPath: string } => item.apiPath !== null);

export function getMenuItem(section: Section): MenuItem {
  return MENU_ITEMS.find((item) => item.id === section) ?? MENU_ITEMS[0];
}
