const sections = [
  "overview", "topUp", "agentTransactions", "riders", "stations", "swaps", "inventory", "batteries",
  "bikes", "owners", "agents", "users", "roles", "cards", "wallets", "companyAccounts", "violations", "incidents",
] as const;

const enNav: Record<string, { label: string; eyebrow: string; title: string }> = {
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

const frNav: Record<string, { label: string; eyebrow: string; title: string }> = {
  overview: { label: "Vue d'ensemble", eyebrow: "Opérations", title: "Pilotage des échanges" },
  topUp: { label: "Rechargement", eyebrow: "Agent", title: "Rechargement" },
  agentTransactions: { label: "Mes transactions", eyebrow: "Agent", title: "Mes transactions" },
  riders: { label: "Conducteurs et propriétaires", eyebrow: "Personnes", title: "Conducteurs et propriétaires" },
  stations: { label: "Stations", eyebrow: "Réseau", title: "Stations" },
  swaps: { label: "Échanges", eyebrow: "Registre", title: "Transactions d'échange" },
  inventory: { label: "Inventaire", eyebrow: "Entrepôt", title: "Stock entrepôt" },
  batteries: { label: "Batteries", eyebrow: "Inventaire", title: "Batteries" },
  bikes: { label: "Motos", eyebrow: "Flotte", title: "Motos" },
  owners: { label: "Propriétaires", eyebrow: "Flotte", title: "Propriétaires de flotte" },
  agents: { label: "Agents", eyebrow: "Flotte", title: "Agents" },
  users: { label: "Utilisateurs", eyebrow: "Administration", title: "Utilisateurs" },
  roles: { label: "Rôles", eyebrow: "Accès", title: "Rôles" },
  cards: { label: "Cartes", eyebrow: "Accès", title: "Cartes NFC" },
  wallets: { label: "Portefeuilles", eyebrow: "Finance", title: "Portefeuilles" },
  companyAccounts: { label: "Comptes société", eyebrow: "Finance", title: "Comptes société" },
  violations: { label: "Infractions", eyebrow: "Conformité", title: "Infractions" },
  incidents: { label: "Incidents batterie", eyebrow: "Conformité", title: "Incidents batterie" },
};

export function buildNavMessages(map: typeof enNav, french: boolean) {
  const out = {
    "nav.groups.network": french ? "Réseau" : "Network",
    "nav.groups.fleetInventory": french ? "Flotte et inventaire" : "Fleet & inventory",
    "nav.groups.peopleAccess": french ? "Personnes et accès" : "People & access",
    "nav.groups.finance": "Finance",
  } as Record<string, string>;

  for (const id of sections) {
    const n = map[id];
    if (!n) continue;
    out[`nav.${id}.label`] = n.label;
    out[`nav.${id}.eyebrow`] = n.eyebrow;
    out[`nav.${id}.title`] = n.title;
  }
  return out;
}

export const nav = buildNavMessages(enNav, false);
export const navFr = buildNavMessages(frNav, true);