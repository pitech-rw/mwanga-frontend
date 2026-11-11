import type { ResourceSection } from "./resource-create-config";

/** Short label for delete confirm and modal titles (must stay readable when nested objects are stripped). */
export function recordLabelForRow(section: ResourceSection, row: Record<string, unknown>): string {
  const id = row.id;
  const idStr = id != null ? String(id) : "";

  const pick = (...keys: string[]): string | undefined => {
    for (const key of keys) {
      const v = row[key];
      if (typeof v === "string" && v.trim()) {
        return v.trim();
      }
    }
    return undefined;
  };

  switch (section) {
    case "batteries":
      return pick("serialNumber") ?? (idStr || "Battery");
    case "bikes":
      return pick("plateNumber") ?? (idStr || "Bike");
    case "cards":
      return pick("token", "serialNumber") ?? (idStr || "Card");
    case "roles":
      return pick("name") ?? (idStr || "Role");
    case "stations":
      return pick("name", "code") ?? (idStr || "Station");
    case "swaps":
      return idStr ? `Swap #${idStr}` : "Swap";
    case "owners":
      return pick("name", "email") ?? (idStr || "Owner");
    case "agents":
      return pick("name", "email") ?? (idStr || "Agent");
    case "users": {
      const u = pick("username");
      const first = typeof row.firstName === "string" ? row.firstName : "";
      const last = typeof row.lastName === "string" ? row.lastName : "";
      const name = [first, last].filter(Boolean).join(" ").trim();
      if (name) {
        return u ? `${name} (@${u})` : name;
      }
      return u ? `@${u}` : (idStr || "User");
    }
    case "violations":
      return pick("title", "trackId") ?? (idStr || "Violation");
    case "wallets":
      return idStr ? `Wallet #${idStr}` : "Wallet";
    case "companyAccounts":
      return pick("name", "accountNumber") ?? (idStr || "Company account");
    default:
      return idStr || "Record";
  }
}
