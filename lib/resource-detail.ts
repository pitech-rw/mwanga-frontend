import type { Section } from "./nav";

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

function formatFieldLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
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
      summary.push(["Serial", serial]);
      const status = pickString(row, "status");
      if (status) {
        usedKeys.add("status");
        summary.push(["Status", status]);
      }
      usedKeys.add("soc");
      usedKeys.add("soh");
      summary.push(["SOC / SOH", `${cellText(row.soc)} / ${cellText(row.soh)}`]);
      const station = row.station;
      const bike = row.bike;
      if (station && typeof station === "object") {
        usedKeys.add("stationId");
        const s = station as Record<string, unknown>;
        const code = typeof s.code === "string" ? s.code : "";
        const name = typeof s.name === "string" ? s.name : "";
        summary.push(["Station", code && name ? `${code} — ${name}` : cellText(station)]);
      } else if (row.stationId != null) {
        usedKeys.add("stationId");
        summary.push([formatFieldLabel("stationId"), String(row.stationId)]);
      }
      if (bike && typeof bike === "object") {
        const b = bike as Record<string, unknown>;
        const plate = typeof b.plateNumber === "string" ? b.plateNumber : "";
        summary.push(["Bike", plate || cellText(bike)]);
      }
      break;
    }
    case "bikes": {
      const plate = pickString(row, "plateNumber") ?? idStr;
      headingTitle = `Bike · ${plate}`;
      description = "Vehicle record. Rider and current battery show in the summary when linked.";
      usedKeys.add("plateNumber");
      summary.push(["Plate", plate]);
      const model = pickString(row, "model");
      if (model) {
        usedKeys.add("model");
        summary.push(["Model", model]);
      }
      const status = pickString(row, "status");
      if (status) {
        usedKeys.add("status");
        summary.push(["Status", status]);
      }
      break;
    }
    case "users": {
      const username = pickString(row, "username") ?? idStr;
      const name = [pickString(row, "firstName"), pickString(row, "lastName")].filter(Boolean).join(" ").trim();
      headingTitle = name ? `User · ${name}` : `User · @${username}`;
      description = "Account overview.";
      usedKeys.add("username");
      summary.push(["Username", `@${username}`]);
      if (name) {
        usedKeys.add("firstName");
        usedKeys.add("lastName");
        summary.push(["Name", name]);
      }
      const type = pickString(row, "type");
      if (type) {
        usedKeys.add("type");
        summary.push(["Role type", type]);
      }
      break;
    }
    case "stations": {
      const name = pickString(row, "name") ?? idStr;
      const code = pickString(row, "code");
      headingTitle = code ? `Station · ${code}` : `Station · ${name}`;
      description = "Swap location. Capacity and coordinates appear in the fields below when set.";
      if (code) {
        usedKeys.add("code");
        summary.push(["Code", code]);
      }
      usedKeys.add("name");
      summary.push(["Name", name]);
      const cap = row.capacity;
      if (cap != null) {
        usedKeys.add("capacity");
        summary.push(["Capacity", String(cap)]);
      }
      break;
    }
    case "swaps": {
      headingTitle = `Swap · #${idStr}`;
      description = "Transaction state, payment, and fee fields are listed below.";
      const st = pickString(row, "status");
      if (st) {
        usedKeys.add("status");
        summary.push(["Status", st]);
      }
      const pay = pickString(row, "paymentStatus");
      if (pay) {
        usedKeys.add("paymentStatus");
        summary.push(["Payment", pay]);
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
        summary.push(["Token preview", `${token.length > 20 ? `${token.slice(0, 16)}…` : token}`]);
      }
      if (sn) {
        usedKeys.add("serialNumber");
        summary.push(["Serial", sn]);
      }
      break;
    }
    case "wallets": {
      headingTitle = `Wallet · #${idStr}`;
      description = "Balance and currency for the linked user.";
      const user = row.user;
      if (user && typeof user === "object") {
        const u = user as Record<string, unknown>;
        usedKeys.add("userId");
        usedKeys.add("user");
        const first = typeof u.firstName === "string" ? u.firstName : "";
        const last = typeof u.lastName === "string" ? u.lastName : "";
        const name = [first, last].filter(Boolean).join(" ").trim();
        const uname = typeof u.username === "string" ? u.username : "";
        const type = typeof u.type === "string" ? u.type.replace(/_/g, " ") : "";
        summary.push([
          "Owner",
          name && uname ? `${name} (@${uname})` : name || (uname ? `@${uname}` : cellText(user)),
        ]);
        if (type) {
          summary.push(["Type", type]);
        }
      } else if (row.userId != null) {
        usedKeys.add("userId");
        summary.push(["User ID", String(row.userId)]);
      }
      if (row.balance != null) {
        usedKeys.add("balance");
        summary.push(["Balance", cellText(row.balance)]);
      }
      const cur = pickString(row, "currency");
      if (cur) {
        usedKeys.add("currency");
        summary.push(["Currency", cur]);
      }
      break;
    }
    case "violations": {
      const t = pickString(row, "title");
      headingTitle = t ? `Violation · ${t}` : `Violation · #${idStr}`;
      description = "Compliance case with severity and status.";
      if (t) {
        usedKeys.add("title");
        summary.push(["Title", t]);
      }
      const st = pickString(row, "status");
      if (st) {
        usedKeys.add("status");
        summary.push(["Status", st]);
      }
      break;
    }
    case "roles": {
      const name = pickString(row, "name");
      headingTitle = name ? `Role · ${name}` : `Role · #${idStr}`;
      description = "Named role used for permission grouping.";
      if (name) {
        usedKeys.add("name");
        summary.push(["Name", name]);
      }
      break;
    }
    default:
      headingTitle = `${resourceTitle} · ${idStr}`;
      description = `Details for this ${resourceTitle.toLowerCase()} record.`;
  }

  const rows = rawFiltered
    .filter(([key]) => !usedKeys.has(key))
    .map(([key, value]) => [formatFieldLabel(key), cellText(value)] as [string, string])
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
    "user",
    "role",
    "currentBattery",
    "station",
    "battery",
    "bike",
    "swapTransaction",
    "assignedStation",
  ]).has(key);
}
