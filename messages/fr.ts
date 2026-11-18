import { commonFr } from "./sections/common";
import { buildNavMessages } from "./sections/nav";
import { createFr } from "./sections/create-fr";
import { fieldsFr } from "./sections/fields-fr";
import { miscFr } from "./sections/misc-fr";
import { modalsFr } from "./sections/modals-fr";
import { errorsServerFr } from "./sections/errors-server-fr";

const frNavData = {
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

export const fr = {
  ...commonFr,
  ...buildNavMessages(frNavData, true),
  ...createFr,
  ...fieldsFr,
  ...miscFr,
  ...modalsFr,
  ...errorsServerFr,
} as const;