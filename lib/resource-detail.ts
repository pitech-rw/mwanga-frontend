import type { Section } from "./nav";
import { translateFieldKey, type MessageKey, type TranslateFn } from "./i18n/translate";
import type { LocaleCode } from "./locale-storage";

/** Payload for the dashboard record detail dialog (structured like a confirmation panel). */
export type ResourceDetailPayload = {
  section: Section;
  /** Main dialog title (e.g. "Battery · BAT-1024"). */
  headingTitle: string;
  /** Short line under the title. */
  description: string;
  /** Optional eyebrow above the summary (e.g. resource name from nav). */
  eyebrow?: string;
  /** 2–4 highlighted rows for the summary card. */
  summary: [string, string][];
  /** Remaining fields (label formatted from keys). */
  rows: [string, string][];
  /** Original API row (same object as the table row). */
  row: Record<string, unknown>;
};

function formatFieldLabel(key: string, locale?: LocaleCode): string {
  if (locale) {
    return translateFieldKey(locale, key);
  }
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function dl(t: TranslateFn | undefined, key: MessageKey, fallback: string): string {
  return t ? t(key) : fallback;
}

function pickString(row: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const v = row[key];
    if (typeof v === "string" && v.trim()) {
      return v;
    }
  }
  return undefined;
}

export function buildResourceDetailPayload(
  section: Section,
  resourceTitle: string,
  row: Record<string, unknown>,
  cellText: (value: unknown) => string,
  translate?: TranslateFn,
  locale?: LocaleCode,
): ResourceDetailPayload {
  const id = row.id;
  const idStr = id != null ? String(id) : "—";

  const rawFiltered = Object.entries(row).filter(([key]) => !isRelationOrMetaKey(key));
  const usedKeys = new Set<string>();

  const summary: [string, string][] = [];
  let headingTitle = `${resourceTitle} · ${idStr}`;
  let description = `Record #${idStr}. Use the actions menu (⋯) on the table row to attach, edit, or delete.`;

  switch (section) {
    case "batteries": {
      const serial = pickString(row, "serialNumber") ?? idStr;
      headingTitle = `Battery · ${serial}`;
      description =
        "Pack details. A battery is either at a station or on a bike—not both.";
      usedKeys.add("serialNumber");
      summary.push([dl(translate, "detail.labels.serial" as MessageKey, "Serial"), serial]);
      const status = pickString(row, "status");
      if (status) {
        usedKeys.add("status");
        summary.push([dl(translate, "detail.labels.status" as MessageKey, "Status"), status]);
      }
      const model = pickString(row, "model");
      if (model) {
        usedKeys.add("model");
        summary.push([dl(translate, "detail.labels.model" as MessageKey, "Model"), model]);
      }
      const capacityKwh = row.capacity;
      if (capacityKwh != null && capacityKwh !== "") {
        usedKeys.add("capacity");
        summary.push([dl(translate, "detail.labels.capacity" as MessageKey, "Capacity"), `${capacityKwh} kWh`]);
      }
      usedKeys.add("soc");
      usedKeys.add("soh");
      summary.push([dl(translate, "detail.labels.socSoh" as MessageKey, "SOC / SOH"), `${cellText(row.soc)} / ${cellText(row.soh)}`]);
      const station = row.station;
      const bike = row.bike;
      if (station && typeof station === "object") {
        usedKeys.add("stationId");
        const s = station as Record<string, unknown>;
        const code = typeof s.code === "string" ? s.code : "";
        const name = typeof s.name === "string" ? s.name : "";
        summary.push([dl(translate, "detail.labels.station" as MessageKey, "Station"), code && name ? `${code} — ${name}` : cellText(station)]);
      } else if (row.stationId != null) {
        usedKeys.add("stationId");
        summary.push([formatFieldLabel("stationId"), String(row.stationId)]);
      }
      if (bike && typeof bike === "object") {
        const b = bike as Record<string, unknown>;
        const plate = typeof b.plateNumber === "string" ? b.plateNumber : "";
        summary.push([dl(translate, "detail.labels.bike" as MessageKey, "Bike"), plate || cellText(bike)]);
      }
      break;
    }
    case "bikes": {
      const plate = pickString(row, "plateNumber") ?? idStr;
      headingTitle = `Bike · ${plate}`;
      description = "Vehicle record. Rider and current battery show in the summary when linked.";
      usedKeys.add("plateNumber");
      summary.push([dl(translate, "detail.labels.plate" as MessageKey, "Plate"), plate]);
      const model = pickString(row, "model");
      if (model) {
        usedKeys.add("model");
        summary.push([dl(translate, "detail.labels.model" as MessageKey, "Model"), model]);
      }
      const status = pickString(row, "status");
      if (status) {
        usedKeys.add("status");
        summary.push([dl(translate, "detail.labels.status" as MessageKey, "Status"), status]);
      }
      const owner = row.owner;
      if (owner && typeof owner === "object") {
        const o = owner as Record<string, unknown>;
        usedKeys.add("ownerId");
        usedKeys.add("owner");
        const ownerName = typeof o.name === "string" ? o.name.trim() : "";
        summary.push([dl(translate, "detail.labels.owner" as MessageKey, "Owner"), ownerName || cellText(owner)]);
      } else if (row.ownerId != null) {
        usedKeys.add("ownerId");
        summary.push([dl(translate, "detail.labels.owner" as MessageKey, "Owner"), `Owner #${row.ownerId}`]);
      }
      break;
    }
    case "owners": {
      const name = pickString(row, "name") ?? idStr;
      headingTitle = `Owner · ${name}`;
      description = "Fleet buyer account with a shared wallet.";
      usedKeys.add("name");
      summary.push([dl(translate, "detail.labels.name" as MessageKey, "Name"), name]);
      const email = pickString(row, "email");
      if (email) {
        usedKeys.add("email");
        summary.push([dl(translate, "detail.labels.email" as MessageKey, "Email"), email]);
      }
      break;
    }
    case "agents": {
      const name = pickString(row, "name") ?? idStr;
      headingTitle = `Agent · ${name}`;
      description = "Float profile linked to an agent user account.";
      usedKeys.add("name");
      summary.push([dl(translate, "detail.labels.name" as MessageKey, "Name"), name]);
      const email = pickString(row, "email");
      if (email) {
        usedKeys.add("email");
        summary.push([dl(translate, "detail.labels.email" as MessageKey, "Email"), email]);
      }
      const phone = pickString(row, "phone");
      if (phone) {
        usedKeys.add("phone");
        summary.push([dl(translate, "detail.labels.phone" as MessageKey, "Phone"), phone]);
      }
      break;
    }
    case "riders": {
      if (pickString(row, "directoryKind") === "owner") {
        const ownerName = pickString(row, "name") ?? idStr;
        headingTitle = `Owner · ${ownerName}`;
        description = "Fleet owner wallet top-up target.";
        usedKeys.add("name");
        summary.push([dl(translate, "detail.labels.name" as MessageKey, "Name"), ownerName]);
        const email = pickString(row, "email");
        if (email) {
          usedKeys.add("email");
          summary.push([dl(translate, "detail.labels.email" as MessageKey, "Email"), email]);
        }
        const phone = pickString(row, "phone");
        if (phone) {
          usedKeys.add("phone");
          summary.push([dl(translate, "detail.labels.phone" as MessageKey, "Phone"), phone]);
        }
        const status = pickString(row, "status");
        if (status) {
          usedKeys.add("status");
          summary.push([dl(translate, "detail.labels.status" as MessageKey, "Status"), status]);
        }
        break;
      }
      const username = pickString(row, "username") ?? idStr;
      const name = [pickString(row, "firstName"), pickString(row, "lastName")].filter(Boolean).join(" ").trim();
      headingTitle = name ? `Rider · ${name}` : `Rider · @${username}`;
      description = "Rider account.";
      usedKeys.add("username");
      summary.push([dl(translate, "detail.labels.username" as MessageKey, "Username"), `@${username}`]);
      if (name) {
        usedKeys.add("firstName");
        usedKeys.add("lastName");
        summary.push([dl(translate, "detail.labels.name" as MessageKey, "Name"), name]);
      }
      const phone = pickString(row, "phone");
      if (phone) {
        usedKeys.add("phone");
        summary.push([dl(translate, "detail.labels.phone" as MessageKey, "Phone"), phone]);
      }
      break;
    }
    case "users": {
      const username = pickString(row, "username") ?? idStr;
      const name = [pickString(row, "firstName"), pickString(row, "lastName")].filter(Boolean).join(" ").trim();
      headingTitle = name ? `User · ${name}` : `User · @${username}`;
      description = "Account overview.";
      usedKeys.add("username");
      summary.push([dl(translate, "detail.labels.username" as MessageKey, "Username"), `@${username}`]);
      if (name) {
        usedKeys.add("firstName");
        usedKeys.add("lastName");
        summary.push([dl(translate, "detail.labels.name" as MessageKey, "Name"), name]);
      }
      const type = pickString(row, "type");
      if (type) {
        usedKeys.add("type");
        summary.push([dl(translate, "detail.labels.roleType" as MessageKey, "Role type"), type]);
      }
      break;
    }
    case "stations": {
      const name = pickString(row, "name") ?? idStr;
      const code = pickString(row, "code");
      headingTitle = code ? `Station · ${code}` : `Station · ${name}`;
      description =
        "Swap location. Open the station from the row actions menu to see batteries, assigned operators, and transactions.";
      if (code) {
        usedKeys.add("code");
        summary.push([dl(translate, "detail.labels.code" as MessageKey, "Code"), code]);
      }
      usedKeys.add("name");
      summary.push([dl(translate, "detail.labels.name" as MessageKey, "Name"), name]);
      const street = pickString(row, "address");
      if (street) {
        usedKeys.add("address");
        summary.push([dl(translate, "detail.labels.address" as MessageKey, "Address"), street]);
      }
      const chargingCap = row.chargingCapacity;
      if (chargingCap != null) {
        usedKeys.add("chargingCapacity");
        summary.push([dl(translate, "detail.labels.chargingCapacity" as MessageKey, "Charging capacity"), String(chargingCap)]);
      }
      const stationModel = pickString(row, "model");
      if (stationModel) {
        usedKeys.add("model");
        summary.push([dl(translate, "detail.labels.model" as MessageKey, "Model"), stationModel]);
      }
      const photo = pickString(row, "photo");
      if (photo) {
        usedKeys.add("photo");
        summary.push([dl(translate, "detail.labels.photo" as MessageKey, "Photo"), "Uploaded image"]);
      }
      const st = pickString(row, "status");
      if (st) {
        usedKeys.add("status");
        summary.push([dl(translate, "detail.labels.status" as MessageKey, "Status"), st]);
      }
      const operators = row.operators;
      const batteries = row.batteries;
      const transactions = row.transactions;
      if (Array.isArray(operators)) {
        usedKeys.add("operators");
        summary.push([dl(translate, "detail.labels.operators" as MessageKey, "Operators"), String(operators.length)]);
      }
      if (Array.isArray(batteries)) {
        usedKeys.add("batteries");
        summary.push([dl(translate, "detail.labels.batteriesOnSite" as MessageKey, "Batteries on site"), String(batteries.length)]);
      }
      if (Array.isArray(transactions)) {
        usedKeys.add("transactions");
        summary.push([dl(translate, "detail.labels.swaps" as MessageKey, "Swaps"), String(transactions.length)]);
      }
      break;
    }
    case "swaps": {
      headingTitle = `Swap · #${idStr}`;
      description = "Transaction state, payment, and fee fields are listed below.";
      const st = pickString(row, "status");
      if (st) {
        usedKeys.add("status");
        summary.push([dl(translate, "detail.labels.status" as MessageKey, "Status"), st]);
      }
      const pay = pickString(row, "paymentStatus");
      if (pay) {
        usedKeys.add("paymentStatus");
        summary.push([dl(translate, "detail.labels.payment" as MessageKey, "Payment"), pay]);
      }
      break;
    }
    case "cards": {
      const token = pickString(row, "token");
      const sn = pickString(row, "serialNumber");
      headingTitle = sn ? `Card · ${sn}` : token ? `Card · ${token.slice(0, 10)}…` : `Card · ${idStr}`;
      description = "NFC card. Token is truncated in the title; full values are in the field list.";
      if (token) {
        usedKeys.add("token");
        summary.push([dl(translate, "detail.labels.tokenPreview" as MessageKey, "Token preview"), `${token.length > 20 ? `${token.slice(0, 16)}…` : token}`]);
      }
      if (sn) {
        usedKeys.add("serialNumber");
        summary.push([dl(translate, "detail.labels.serial" as MessageKey, "Serial"), sn]);
      }
      break;
    }
    case "companyAccounts": {
      const name = pickString(row, "name");
      headingTitle = name ? `Account · ${name}` : `Account · #${idStr}`;
      description = "Company bank account (asset) for verified float inflows.";
      if (name) {
        usedKeys.add("name");
        summary.push([dl(translate, "detail.labels.name" as MessageKey, "Name"), name]);
      }
      const bank = pickString(row, "bankName");
      if (bank) {
        usedKeys.add("bankName");
        summary.push([dl(translate, "detail.labels.bank" as MessageKey, "Bank"), bank]);
      }
      const acct = pickString(row, "accountNumber");
      if (acct) {
        usedKeys.add("accountNumber");
        summary.push([dl(translate, "detail.labels.accountNumber" as MessageKey, "Account number"), acct]);
      }
      if (row.balance != null) {
        usedKeys.add("balance");
        summary.push([dl(translate, "detail.labels.balance" as MessageKey, "Balance"), cellText(row.balance)]);
      }
      const cur = pickString(row, "currency");
      if (cur) {
        usedKeys.add("currency");
        summary.push([dl(translate, "detail.labels.currency" as MessageKey, "Currency"), cur]);
      }
      break;
    }
    case "wallets": {
      headingTitle = `Wallet · #${idStr}`;
      description = "Liability account for an owner, a rider, or an agent float. Balance changes only via the ledger.";
      const owner = row.owner;
      if (owner && typeof owner === "object") {
        const o = owner as Record<string, unknown>;
        usedKeys.add("ownerId");
        usedKeys.add("owner");
        const name = typeof o.name === "string" ? o.name : "";
        summary.push([dl(translate, "detail.labels.owner" as MessageKey, "Owner"), name || cellText(owner)]);
        const email = typeof o.email === "string" ? o.email : "";
        if (email) {
          summary.push([dl(translate, "detail.labels.email" as MessageKey, "Email"), email]);
        }
      } else if (row.ownerId != null) {
        usedKeys.add("ownerId");
        summary.push([dl(translate, "detail.labels.ownerId" as MessageKey, "Owner ID"), String(row.ownerId)]);
      }
      if (row.balance != null) {
        usedKeys.add("balance");
        summary.push([dl(translate, "detail.labels.balance" as MessageKey, "Balance"), cellText(row.balance)]);
      }
      const cur = pickString(row, "currency");
      if (cur) {
        usedKeys.add("currency");
        summary.push([dl(translate, "detail.labels.currency" as MessageKey, "Currency"), cur]);
      }
      break;
    }
    case "incidents": {
      const track = pickString(row, "trackId") ?? idStr;
      headingTitle = `Incident · ${track}`;
      description = "Damaged or faulty battery pack reported at a station.";
      usedKeys.add("trackId");
      summary.push([dl(translate, "detail.labels.trackId" as MessageKey, "Track ID"), track]);
      const st = pickString(row, "status");
      if (st) {
        usedKeys.add("status");
        summary.push([dl(translate, "detail.labels.status" as MessageKey, "Status"), st.replace(/_/g, " ")]);
      }
      const battery = row.battery;
      if (battery && typeof battery === "object") {
        const serial = pickString(battery as Record<string, unknown>, "serialNumber");
        if (serial) {
          summary.push(["Battery", serial]);
        }
      }
      const station = row.station;
      if (station && typeof station === "object") {
        const name = pickString(station as Record<string, unknown>, "name");
        if (name) {
          summary.push([dl(translate, "detail.labels.station" as MessageKey, "Station"), name]);
        }
      }
      break;
    }
    case "violations": {
      const violationTitle = pickString(row, "title");
      headingTitle = violationTitle ? `Violation · ${violationTitle}` : `Violation · #${idStr}`;
      description = "Compliance case with severity and status.";
      if (violationTitle) {
        usedKeys.add("title");
        summary.push([dl(translate, "detail.labels.title" as MessageKey, "Title"), violationTitle]);
      }
      const st = pickString(row, "status");
      if (st) {
        usedKeys.add("status");
        summary.push([dl(translate, "detail.labels.status" as MessageKey, "Status"), st]);
      }
      break;
    }
    case "roles": {
      const name = pickString(row, "name");
      headingTitle = name ? `Role · ${name}` : `Role · #${idStr}`;
      description = "Named role used for permission grouping.";
      if (name) {
        usedKeys.add("name");
        summary.push([dl(translate, "detail.labels.name" as MessageKey, "Name"), name]);
      }
      break;
    }
    case "inventory": {
      const kind = pickString(row, "kind") ?? "item";
      usedKeys.add("kind");
      summary.push([dl(translate, "detail.labels.kind" as MessageKey, "Kind"), kind]);
      const bike = row.bike;
      const battery = row.battery;
      if (bike && typeof bike === "object") {
        const plate = pickString(bike as Record<string, unknown>, "plateNumber");
        if (plate) {
          summary.push([dl(translate, "detail.labels.bike" as MessageKey, "Bike"), plate]);
        }
      }
      if (battery && typeof battery === "object") {
        const serial = pickString(battery as Record<string, unknown>, "serialNumber");
        if (serial) {
          summary.push(["Battery", serial]);
        }
      }
      usedKeys.add("receivedAt");
      summary.push([dl(translate, "detail.labels.received" as MessageKey, "Received"), cellText(row.receivedAt)]);
      headingTitle = `Inventory · ${kind} #${idStr}`;
      description = "Warehouse stock waiting to be issued.";
      break;
    }
    default:
      headingTitle = `${resourceTitle} · ${idStr}`;
      description = `Details for this ${resourceTitle.toLowerCase()} record.`;
  }

  const rows = rawFiltered
    .filter(([key]) => !usedKeys.has(key))
    .map(([key, value]) => [formatFieldLabel(key, locale), cellText(value)] as [string, string])
    .slice(0, 24);

  return {
    section,
    headingTitle,
    description,
    eyebrow: resourceTitle,
    summary,
    rows,
    row: { ...row },
  };
}

function isRelationOrMetaKey(key: string): boolean {
  return new Set([
    "passwordHash",
    "createdAt",
    "updatedAt",
    "transactions",
    "bikes",
    "cards",
    "permissions",
    "ledgerEntries",
    "readings",
    "wallet",
    "owner",
    "portalUser",
    "agent",
    "riderUser",
    "user",
    "role",
    "currentBattery",
    "station",
    "battery",
    "bike",
    "swapTransaction",
    "assignedStation",
    "operators",
    "batteries",
    "movements",
    "messages",
    "reporter",
    "damagedBy",
    "dismissedBy",
    "damagedAt",
    "dismissedAt",
    "damagedById",
    "dismissedById",
    "reporterId",
    "swapTransactionId",
  ]).has(key);
}
