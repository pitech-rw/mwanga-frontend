import { MENU_ITEMS, type Section } from "./nav";

const SECTION_IDS = new Set<string>(MENU_ITEMS.map((item) => item.id));

export function isSectionSegment(value: string): value is Section {
  return SECTION_IDS.has(value);
}

/** Path prefix without trailing slash, e.g. `/account`. */
export function sectionFromPathname(pathname: string, pathPrefix: string): Section {
  const base = pathPrefix.endsWith("/") ? pathPrefix.slice(0, -1) : pathPrefix;
  const rest = pathname === base ? "" : pathname.slice(base.length).replace(/^\/+/, "");
  const segment = rest.split("/")[0] ?? "";

  if (segment === "top-up" || segment === "topUp") {
    return "topUp";
  }

  if (segment === "riders") {
    return "riders";
  }

  if (segment === "my-transactions" || segment === "agentTransactions") {
    return "agentTransactions";
  }

  if (segment === "" || segment === "overview") {
    return "overview";
  }

  if (isSectionSegment(segment)) {
    return segment;
  }

  return "overview";
}

export function sectionHref(pathPrefix: string, section: Section): string {
  const base = pathPrefix.endsWith("/") ? pathPrefix.slice(0, -1) : pathPrefix;
  if (section === "overview") {
    return base || "/";
  }
  if (section === "topUp") {
    return `${base}/top-up`;
  }
  if (section === "agentTransactions") {
    return `${base}/my-transactions`;
  }
  return `${base}/${section}`;
}

export type CompanyAccountTransactionsSubRoute = {
  accountId: number;
};

/** `/account/companyAccounts/:id/transactions` — ledger sub-view inside the account shell. */
export function companyAccountTransactionsSubRoute(
  pathname: string,
  pathPrefix: string,
): CompanyAccountTransactionsSubRoute | null {
  const base = pathPrefix.endsWith("/") ? pathPrefix.slice(0, -1) : pathPrefix;
  const rest = pathname === base ? "" : pathname.slice(base.length).replace(/^\/+/, "");
  const parts = rest.split("/").filter(Boolean);

  if (parts.length !== 3 || parts[0] !== "companyAccounts" || parts[2] !== "transactions") {
    return null;
  }

  const accountId = Number(parts[1]);
  if (!Number.isFinite(accountId) || accountId < 1) {
    return null;
  }

  return { accountId };
}

export function companyAccountTransactionsHref(pathPrefix: string, accountId: number): string {
  const base = pathPrefix.endsWith("/") ? pathPrefix.slice(0, -1) : pathPrefix;
  return `${base}/companyAccounts/${accountId}/transactions`;
}

export type StationDetailSubRoute = {
  stationId: number;
};

/** `/account/stations/:id` — inventory, operators, and swap activity for one station. */
export function stationDetailSubRoute(pathname: string, pathPrefix: string): StationDetailSubRoute | null {
  const base = pathPrefix.endsWith("/") ? pathPrefix.slice(0, -1) : pathPrefix;
  const rest = pathname === base ? "" : pathname.slice(base.length).replace(/^\/+/, "");
  const parts = rest.split("/").filter(Boolean);

  if (parts.length !== 2 || parts[0] !== "stations") {
    return null;
  }

  const stationId = Number(parts[1]);
  if (!Number.isFinite(stationId) || stationId < 1) {
    return null;
  }

  return { stationId };
}

export function stationDetailHref(pathPrefix: string, stationId: number): string {
  const base = pathPrefix.endsWith("/") ? pathPrefix.slice(0, -1) : pathPrefix;
  return `${base}/stations/${stationId}`;
}

export const PROFILE_TABS = ["details", "location", "security", "privacy"] as const;
export type ProfileTab = (typeof PROFILE_TABS)[number];

const PROFILE_TAB_SET = new Set<string>(PROFILE_TABS);

export function isProfileTab(value: string): value is ProfileTab {
  return PROFILE_TAB_SET.has(value);
}

/** `/account/profile` or `/account/profile/:tab` — self-service profile settings. */
export function profileSubRoute(pathname: string, pathPrefix: string): { tab: ProfileTab } | null {
  const base = pathPrefix.endsWith("/") ? pathPrefix.slice(0, -1) : pathPrefix;
  const rest = pathname === base ? "" : pathname.slice(base.length).replace(/^\/+/, "");
  const parts = rest.split("/").filter(Boolean);

  if (parts[0] !== "profile") {
    return null;
  }

  const tabRaw = parts[1];
  if (!tabRaw) {
    return { tab: "details" };
  }

  if (isProfileTab(tabRaw)) {
    return { tab: tabRaw };
  }

  return null;
}

/** Unknown tab segment or extra path segments under `/profile`. */
export function profilePathInvalid(pathname: string, pathPrefix: string): boolean {
  const base = pathPrefix.endsWith("/") ? pathPrefix.slice(0, -1) : pathPrefix;
  const rest = pathname === base ? "" : pathname.slice(base.length).replace(/^\/+/, "");
  const parts = rest.split("/").filter(Boolean);

  if (parts[0] !== "profile") {
    return false;
  }

  if (parts.length > 2) {
    return true;
  }

  const tabRaw = parts[1];
  return Boolean(tabRaw && !isProfileTab(tabRaw));
}

export function profileHref(pathPrefix: string, tab: ProfileTab = "details"): string {
  const base = pathPrefix.endsWith("/") ? pathPrefix.slice(0, -1) : pathPrefix;
  if (tab === "details") {
    return `${base}/profile`;
  }
  return `${base}/profile/${tab}`;
}
