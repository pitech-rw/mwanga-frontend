export type WalletTopUpTargetRow = {
  id: number;
  ownerLabel: string;
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

export function walletOwnerCell(row: Record<string, unknown>): { label: string; type: string } {
  const owner = row.owner;
  if (owner && typeof owner === "object") {
    const o = owner as Record<string, unknown>;
    const portalUser = o.portalUser;
    if (portalUser && typeof portalUser === "object") {
      const u = portalUser as Record<string, unknown>;
      return { label: ownerAccountLabel(o), type: typeof u.type === "string" ? u.type.replace(/_/g, " ") : "proprietor" };
    }
    return { label: ownerAccountLabel(o), type: "fleet owner" };
  }
  return { label: row.ownerId != null ? `Owner #${row.ownerId}` : "—", type: "—" };
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

export function walletCurrency(row: Record<string, unknown>): string {
  const c = row.currency;
  return typeof c === "string" && c.trim() ? c : "CDF";
}

export function walletTopUpTargetFromRow(row: Record<string, unknown>): WalletTopUpTargetRow | null {
  const id = row.id;
  if (typeof id !== "number") {
    return null;
  }
  const { label } = walletOwnerCell(row);
  return {
    id,
    ownerLabel: label,
    currency: walletCurrency(row),
    currentBalance: walletBalanceNumber(row),
  };
}

export function walletDeleteLabelFromRow(row: Record<string, unknown>): string {
  const { label } = walletOwnerCell(row);
  return label;
}
