import type { Section } from "./nav";

/** Every dashboard section that lists API resources (excludes overview). */
export type ResourceSection = Exclude<Section, "overview">;

export type FieldType = "text" | "email" | "password" | "number" | "select" | "datetime-local" | "textarea" | "checkbox";

export type FieldSpec = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
};

export type CreateResourceConfig = {
  section: Section;
  apiPath: string;
  title: string;
  description: string;
  submitLabel: string;
  fields: FieldSpec[];
};

const USER_TYPES = ["admin", "office", "office_manager", "swapper", "agent", "owner", "rider", "viewer"] as const;

const VIOLATION_STATUSES = ["open", "under_review", "resolved", "dismissed"] as const;
const VIOLATION_SEVERITIES = ["low", "medium", "high", "critical"] as const;

function selectOptions(values: readonly string[]) {
  return values.map((value) => ({ value, label: value.replace(/_/g, " ") }));
}

/** One create form per resource section — TypeScript requires a key when `Section` gains a new API model. */
const CONFIGS: Record<ResourceSection, CreateResourceConfig> = {
  batteries: {
    section: "batteries",
    apiPath: "/batteries",
    title: "Register battery",
    description: "Adds a pack to the fleet inventory.",
    submitLabel: "Create battery",
    fields: [
      { name: "serialNumber", label: "Serial number", type: "text", required: true },
      { name: "model", label: "Model", type: "text", required: true },
      { name: "manufacturer", label: "Manufacturer", type: "text" },
      { name: "batteryType", label: "Battery type", type: "text" },
      { name: "status", label: "Status", type: "text", placeholder: "available" },
      { name: "soc", label: "State of charge (%)", type: "number" },
      { name: "stationId", label: "Station ID", type: "number" },
    ],
  },
  bikes: {
    section: "bikes",
    apiPath: "/bikes",
    title: "Register bike",
    description: "Links a plate and serial to the fleet.",
    submitLabel: "Create bike",
    fields: [
      { name: "plateNumber", label: "Plate number", type: "text", required: true },
      { name: "serialNumber", label: "Serial number", type: "text", required: true },
      { name: "model", label: "Model", type: "text", required: true },
      { name: "ownerId", label: "Owner ID", type: "number", required: true },
      { name: "chassisNumber", label: "Chassis number", type: "text" },
      { name: "userId", label: "Rider user ID", type: "number" },
    ],
  },
  owners: {
    section: "owners",
    apiPath: "/owners",
    title: "Register owner",
    description: "Creates a fleet buyer record with a wallet.",
    submitLabel: "Create owner",
    fields: [
      { name: "name", label: "Display name", type: "text", required: true },
      { name: "email", label: "Email", type: "email" },
      { name: "phone", label: "Phone", type: "text" },
      { name: "currency", label: "Wallet currency", type: "text", placeholder: "CDF" },
    ],
  },
  cards: {
    section: "cards",
    apiPath: "/cards",
    title: "Issue NFC card",
    description: "Registers a card token for rider access.",
    submitLabel: "Create card",
    fields: [
      { name: "token", label: "Token", type: "text", required: true },
      { name: "serialNumber", label: "Serial number", type: "text", required: true },
      { name: "type", label: "Type", type: "text", required: true, placeholder: "nfc" },
      { name: "status", label: "Status", type: "text" },
      { name: "userId", label: "Rider user ID", type: "number" },
    ],
  },
  roles: {
    section: "roles",
    apiPath: "/roles",
    title: "Create role",
    description: "Adds a named role (permissions are seeded separately).",
    submitLabel: "Create role",
    fields: [{ name: "name", label: "Role name", type: "text", required: true }],
  },
  stations: {
    section: "stations",
    apiPath: "/stations",
    title: "Add station",
    description: "Registers a swap station on the network.",
    submitLabel: "Create station",
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "address", label: "Address", type: "text" },
      { name: "capacity", label: "Capacity", type: "number" },
      { name: "latitude", label: "Latitude", type: "number" },
      { name: "longitude", label: "Longitude", type: "number" },
    ],
  },
  swaps: {
    section: "swaps",
    apiPath: "/swaps",
    title: "Open swap",
    description: "Starts a swap transaction at a station.",
    submitLabel: "Create swap",
    fields: [
      { name: "userId", label: "Rider user ID", type: "number", required: true },
      { name: "bikeId", label: "Bike ID", type: "number", required: true },
      { name: "stationId", label: "Station ID", type: "number", required: true },
      { name: "cardId", label: "Card ID", type: "number", required: true },
      { name: "newBatteryId", label: "New battery ID", type: "number" },
      { name: "fee", label: "Fee", type: "number" },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },
  users: {
    section: "users",
    apiPath: "/users",
    title: "Add user",
    description: "Creates a staff account with sign-in credentials.",
    submitLabel: "Create user",
    fields: [
      { name: "username", label: "Username", type: "text", required: true },
      { name: "firstName", label: "First name", type: "text", required: true },
      { name: "lastName", label: "Last name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "password", label: "Password", type: "password", required: true, placeholder: "Min. 8 characters" },
      {
        name: "type",
        label: "Role type",
        type: "select",
        required: true,
        options: selectOptions(USER_TYPES),
      },
      { name: "phone", label: "Phone", type: "text" },
      { name: "ownerId", label: "Fleet owner ID (required for riders)", type: "number" },
      { name: "kycStatus", label: "KYC status", type: "text", placeholder: "pending" },
    ],
  },
  violations: {
    section: "violations",
    apiPath: "/violations",
    title: "Log violation",
    description: "Records a compliance or safety incident.",
    submitLabel: "Create violation",
    fields: [
      { name: "trackId", label: "Track ID", type: "text", required: true },
      { name: "title", label: "Title", type: "text", required: true },
      { name: "reason", label: "Reason", type: "textarea", required: true },
      { name: "occurredAt", label: "Occurred at", type: "datetime-local", required: true },
      { name: "reporterId", label: "Reporter user ID", type: "number", required: true },
      { name: "offenderId", label: "Offender user ID", type: "number", required: true },
      { name: "stationId", label: "Station ID", type: "number" },
      {
        name: "severity",
        label: "Severity",
        type: "select",
        options: selectOptions(VIOLATION_SEVERITIES),
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        options: selectOptions(VIOLATION_STATUSES),
      },
    ],
  },
  wallets: {
    section: "wallets",
    apiPath: "/wallets",
    title: "Create wallet",
    description: "Pick a fleet owner (search). Each owner has one shared wallet.",
    submitLabel: "Create wallet",
    fields: [{ name: "currency", label: "Currency", type: "text", placeholder: "CDF" }],
  },
  companyAccounts: {
    section: "companyAccounts",
    apiPath: "/company-accounts",
    title: "Add company account",
    description: "Register a bank account used for float collection.",
    submitLabel: "Create account",
    fields: [
      { name: "name", label: "Display name", type: "text", required: true },
      { name: "bankName", label: "Bank name", type: "text" },
      { name: "accountNumber", label: "Account number", type: "text" },
      { name: "currency", label: "Currency", type: "text", placeholder: "CDF" },
    ],
  },
};

export function getCreateConfig(section: Section): CreateResourceConfig | null {
  if (section === "overview") {
    return null;
  }
  return CONFIGS[section];
}

export function buildCreatePayload(config: CreateResourceConfig, values: Record<string, string>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  for (const field of config.fields) {
    const raw = values[field.name]?.trim() ?? "";

    if (!raw) {
      if (field.required) {
        payload[field.name] = raw;
      }
      continue;
    }

    if (field.type === "number") {
      payload[field.name] = Number(raw);
      continue;
    }

    if (field.name === "occurredAt" && field.type === "datetime-local") {
      payload[field.name] = new Date(raw).toISOString();
      continue;
    }

    payload[field.name] = raw;
  }

  return payload;
}
