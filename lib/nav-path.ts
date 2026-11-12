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
