import type { Section } from "./nav";

export type FieldType = "text" | "email" | "password" | "number" | "select" | "datetime-local" | "textarea";

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

const USER_TYPES = ["admin", "office", "office_manager", "swapper", "agent", "rider", "viewer"] as const;

const VIOLATION_STATUSES = ["open", "under_review", "resolved", "dismissed"] as const;
const VIOLATION_SEVERITIES = ["low", "medium", "high", "critical"] as const;

function selectOptions(values: readonly string[]) {
  return values.map((value) => ({ value, label: value.replace(/_/g, " ") }));
}

const CONFIGS: Partial<Record<Section, CreateResourceConfig>> = {
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
      { name: "chassisNumber", label: "Chassis number", type: "text" },
      { name: "userId", label: "Rider user ID", type: "number" },
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
    description: "Pick a user by username (search). Each row shows their account type.",
    submitLabel: "Create wallet",
    fields: [
      { name: "balance", label: "Opening balance", type: "number" },
      { name: "currency", label: "Currency", type: "text", placeholder: "CDF" },
    ],
  },
};

export function getCreateConfig(section: Section): CreateResourceConfig | null {
  return CONFIGS[section] ?? null;
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
