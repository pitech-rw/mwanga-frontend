import { DEFAULT_CURRENCY } from "./default-currency";

export type WalletTopUpTargetRow = {
  id: number;
  ownerLabel: string;
  currency: string;
  currentBalance: number;
};

export type AccountLedgerTarget = {
  id: number;
  label: string;
  transactionsPath: string;
};

export type AgentWalletTopUpTarget = {
  walletId: number;
  name: string;
  kind: "rider" | "owner";
  currency: string;
  currentBalance: number;
};

export function walletUserLabel(user: Record<string, unknown>): string {
  const first = typeof user.firstName === "string" ? user.firstName : "";
  const last = typeof user.lastName === "string" ? user.lastName : "";
  const name = [first, last].filter(Boolean).join(" ").trim();
  const uname = typeof user.username === "string" ? user.username : "";
  if (name && uname) {
    return `${name} (@${uname})`;
  }
  if (name) {
    return name;
  }
  if (uname) {
    return `@${uname}`;
  }
  const email = typeof user.email === "string" ? user.email : "";
  return email || "—";
}

function ownerAccountLabel(owner: Record<string, unknown>): string {
  const name = typeof owner.name === "string" ? owner.name.trim() : "";
  if (name) {
    return name;
  }
  const email = typeof owner.email === "string" ? owner.email : "";
  return email || (owner.id != null ? `Owner #${owner.id}` : "—");
}

function agentProfileLabel(agent: Record<string, unknown>, agentId: unknown): string {
  const name = typeof agent.name === "string" ? agent.name.trim() : "";
  if (name) {
    return name;
  }
  const email = typeof agent.email === "string" ? agent.email : "";
  if (email) {
    return email;
  }
  if (agent.id != null) {
    return `Agent #${agent.id}`;
  }
  if (agentId != null) {
    return `Agent #${agentId}`;
  }
  return "—";
}

/** Wallet liability holder: fleet owner, rider user, or agent float profile. */
export function walletHolderCell(row: Record<string, unknown>): { label: string; type: string } {
  const agent = row.agent;
  if (agent && typeof agent === "object") {
    return {
      label: agentProfileLabel(agent as Record<string, unknown>, row.agentId),
      type: "agent",
    };
  }
  if (row.agentId != null) {
    return { label: `Agent #${row.agentId}`, type: "agent" };
  }

  const rider = row.riderUser;
  if (rider && typeof rider === "object") {
    return { label: walletUserLabel(rider as Record<string, unknown>), type: "rider" };
  }
  if (row.userId != null) {
    return { label: `Rider #${row.userId}`, type: "rider" };
  }

  const owner = row.owner;
  if (owner && typeof owner === "object") {
    const o = owner as Record<string, unknown>;
    const portalUser = o.portalUser;
    if (portalUser && typeof portalUser === "object") {
      const u = portalUser as Record<string, unknown>;
      return {
        label: ownerAccountLabel(o),
        type: typeof u.type === "string" ? u.type.replace(/_/g, " ") : "fleet owner",
      };
    }
    return { label: ownerAccountLabel(o), type: "fleet owner" };
  }
  if (row.ownerId != null) {
    return { label: `Owner #${row.ownerId}`, type: "fleet owner" };
  }

  return { label: "—", type: "—" };
}

/** @deprecated Use `walletHolderCell` — kept for existing imports. */
export function walletOwnerCell(row: Record<string, unknown>): { label: string; type: string } {
  return walletHolderCell(row);
}

export function walletHolderSearchHaystack(row: Record<string, unknown>): string {
  const { label, type } = walletHolderCell(row);
  const parts = [label, type];

  const agent = row.agent;
  if (agent && typeof agent === "object") {
    const a = agent as Record<string, unknown>;
    if (typeof a.email === "string") {
      parts.push(a.email);
    }
    if (typeof a.phone === "string") {
      parts.push(a.phone);
    }
  }

  const rider = row.riderUser;
  if (rider && typeof rider === "object") {
    const u = rider as Record<string, unknown>;
    if (typeof u.email === "string") {
      parts.push(u.email);
    }
    if (typeof u.phone === "string") {
      parts.push(u.phone);
    }
    if (typeof u.username === "string") {
      parts.push(u.username);
    }
  }

  const owner = row.owner;
  if (owner && typeof owner === "object") {
    const o = owner as Record<string, unknown>;
    if (typeof o.email === "string") {
      parts.push(o.email);
    }
    if (typeof o.phone === "string") {
      parts.push(o.phone);
    }
    if (typeof o.name === "string") {
      parts.push(o.name);
    }
  }

  if (row.ownerId != null) {
    parts.push(String(row.ownerId));
  }
  if (row.userId != null) {
    parts.push(String(row.userId));
  }
  if (row.agentId != null) {
    parts.push(String(row.agentId));
  }

  return parts.filter(Boolean).join(" ");
}

export function walletBalanceNumber(row: Record<string, unknown>): number {
  const b = row.balance;
  if (typeof b === "number") {
    return b;
  }
  if (typeof b === "string") {
    const n = Number(b);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function walletCurrency(_row: Record<string, unknown>): string {
  return DEFAULT_CURRENCY;
}

export function walletTopUpTargetFromRow(row: Record<string, unknown>): WalletTopUpTargetRow | null {
  const id = row.id;
  if (typeof id !== "number") {
    return null;
  }
  const { label } = walletHolderCell(row);
  return {
    id,
    ownerLabel: label,
    currency: walletCurrency(row),
    currentBalance: walletBalanceNumber(row),
  };
}

export function directoryFleetOwnerLabel(row: Record<string, unknown>): string {
  if (row.directoryKind === "owner") {
    return "";
  }
  const fleetOwner = row.fleetOwner;
  if (fleetOwner && typeof fleetOwner === "object") {
    const o = fleetOwner as Record<string, unknown>;
    const name = typeof o.name === "string" ? o.name : "";
    if (name.trim()) {
      return name.trim();
    }
  }
  if (row.ownerId != null) {
    return `Owner #${row.ownerId}`;
  }
  return "";
}

export function directoryWalletRecord(row: Record<string, unknown>): Record<string, unknown> | null {
  const walletRaw =
    row.directoryKind === "owner" ? row.wallet : (row.riderWallet ?? row.wallet);
  if (!walletRaw || typeof walletRaw !== "object") {
    return null;
  }
  return walletRaw as Record<string, unknown>;
}

/** Agent directory row (`/users/riders`) → wallet ledger target. */
export function agentDirectoryLedgerTargetFromRow(
  row: Record<string, unknown>,
): AccountLedgerTarget | null {
  const wallet = directoryWalletRecord(row);
  if (!wallet) {
    return null;
  }
  const walletId = wallet.id;
  if (typeof walletId !== "number") {
    return null;
  }
  const label =
    row.directoryKind === "owner"
      ? typeof row.name === "string" && row.name.trim()
        ? row.name.trim()
        : row.id != null
          ? `Owner #${row.id}`
          : `Wallet #${walletId}`
      : walletUserLabel(row);
  return {
    id: walletId,
    label,
    transactionsPath: `/wallets/${walletId}/transactions`,
  };
}

/** Agent directory row (`/users/riders`) → float top-up target. */
export function agentDirectoryTopUpTargetFromRow(
  row: Record<string, unknown>,
): AgentWalletTopUpTarget | null {
  const walletRaw =
    row.directoryKind === "owner" ? row.wallet : (row.riderWallet ?? row.wallet);
  if (!walletRaw || typeof walletRaw !== "object") {
    return null;
  }
  const w = walletRaw as Record<string, unknown>;
  const walletId = w.id;
  if (typeof walletId !== "number") {
    return null;
  }

  if (row.directoryKind === "owner") {
    const name =
      typeof row.name === "string" && row.name.trim()
        ? row.name.trim()
        : row.id != null
          ? `Owner #${row.id}`
          : `Wallet #${walletId}`;
    return {
      walletId,
      name,
      kind: "owner",
      currency: walletCurrency(w),
      currentBalance: walletBalanceNumber(w),
    };
  }

  return {
    walletId,
    name: walletUserLabel(row),
    kind: "rider",
    currency: walletCurrency(w),
    currentBalance: walletBalanceNumber(w),
  };
}

export function agentFloatTopUpTargetFromRow(row: Record<string, unknown>): WalletTopUpTargetRow | null {
  const wallet = row.wallet;
  if (!wallet || typeof wallet !== "object") {
    return null;
  }
  const w = wallet as Record<string, unknown>;
  const id = w.id;
  if (typeof id !== "number") {
    return null;
  }
  const name = typeof row.name === "string" && row.name.trim() ? row.name.trim() : `Agent #${row.id ?? id}`;
  return {
    id,
    ownerLabel: name,
    currency: walletCurrency(w),
    currentBalance: walletBalanceNumber(w),
  };
}

export function walletLedgerTargetFromRow(row: Record<string, unknown>): AccountLedgerTarget | null {
  const target = walletTopUpTargetFromRow(row);
  if (!target) {
    return null;
  }
  return {
    id: target.id,
    label: target.ownerLabel,
    transactionsPath: `/wallets/${target.id}/transactions`,
  };
}

export function companyAccountTransactionsHref(
  row: Record<string, unknown>,
  pathPrefix = "/account",
): string | null {
  const id = row.id;
  if (typeof id !== "number") {
    return null;
  }
  const base = pathPrefix.endsWith("/") ? pathPrefix.slice(0, -1) : pathPrefix;
  return `${base}/companyAccounts/${id}/transactions`;
}

export function walletDeleteLabelFromRow(row: Record<string, unknown>): string {
  const { label } = walletHolderCell(row);
  return label;
}
