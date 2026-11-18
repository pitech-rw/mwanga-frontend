import { common } from "./sections/common";
import { buildNavMessages } from "./sections/nav";
import { createEn } from "./sections/create-en";
import { fieldsEn } from "./sections/fields-en";
import { miscEn } from "./sections/misc-en";
import { modalsEn } from "./sections/modals-en";
import { errorsServerEn } from "./sections/errors-server-en";

const enNavData = {
  overview: { label: "Overview", eyebrow: "Operations", title: "Battery swap command" },
  topUp: { label: "Top up", eyebrow: "Agent", title: "Top up" },
  agentTransactions: { label: "My transactions", eyebrow: "Agent", title: "My transactions" },
  riders: { label: "Riders & owners", eyebrow: "People", title: "Riders & owners" },
  stations: { label: "Stations", eyebrow: "Network", title: "Stations" },
  swaps: { label: "Swaps", eyebrow: "Ledger", title: "Swap transactions" },
  inventory: { label: "Inventory", eyebrow: "Warehouse", title: "Warehouse stock" },
  batteries: { label: "Batteries", eyebrow: "Inventory", title: "Batteries" },
  bikes: { label: "Bikes", eyebrow: "Fleet", title: "Bikes" },
  owners: { label: "Owners", eyebrow: "Fleet", title: "Fleet owners" },
  agents: { label: "Agents", eyebrow: "Fleet", title: "Agents" },
  users: { label: "Users", eyebrow: "Administration", title: "Users" },
  roles: { label: "Roles", eyebrow: "Access", title: "Roles" },
  cards: { label: "Cards", eyebrow: "Access", title: "NFC cards" },
  wallets: { label: "Wallets", eyebrow: "Finance", title: "Wallets" },
  companyAccounts: { label: "Company accounts", eyebrow: "Finance", title: "Company accounts" },
  violations: { label: "Violations", eyebrow: "Compliance", title: "Violations" },
  incidents: { label: "Battery incidents", eyebrow: "Compliance", title: "Battery incidents" },
};

export const en = {
  ...common,
  ...buildNavMessages(enNavData, false),
  ...createEn,
  ...fieldsEn,
  ...miscEn,
  ...modalsEn,
  ...errorsServerEn,
} as const;