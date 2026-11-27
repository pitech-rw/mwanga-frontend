import { BATTERY_STATUS_VALUES_CREATABLE } from "./battery-status";
import { DEFAULT_CURRENCY } from "./default-currency";
import type { Section } from "./nav";

/** Every dashboard section that lists API resources (excludes overview). */
export type ResourceSection = Exclude<
  Section,
  "overview" | "topUp" | "agentTransactions" | "erasureRequests"
>;

export function isResourceSection(section: Section): section is ResourceSection {
  return (
    section !== "overview" &&
    section !== "topUp" &&
    section !== "agentTransactions" &&
    section !== "erasureRequests"
  );
}

export type FieldType =
  | "text"
  | "email"
  | "password"
  | "number"
  | "select"
  | "pills"
  | "datetime-local"
  | "textarea"
  | "checkbox"
  | "file";

export type FieldSpec = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  placeholderKey?: string;
  defaultValue?: string;
  accept?: string;
  options?: { value: string; label: string }[];
  /** Fixed-value fields (e.g. platform currency). */
  readOnly?: boolean;
};

export type CreateResourceConfig = {
  section: Section;
  apiPath: string;
  title: string;
  /** When omitted, the create drawer shows no subtitle (e.g. batteries). */
  description?: string;
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
    submitLabel: "Create battery",
    fields: [
      { name: "serialNumber", label: "Serial number", type: "text", required: true },
      { name: "model", label: "Model", type: "text" },
      { name: "capacity", label: "Capacity (kWh)", type: "number" },
      { name: "manufacturer", label: "Manufacturer", type: "text" },
      { name: "batteryType", label: "Battery type", type: "text" },
      {
        name: "status",
        label: "Status",
        type: "select",
        options: selectOptions(BATTERY_STATUS_VALUES_CREATABLE),
      },
      { name: "soc", label: "State of charge (%)", type: "number" },
    ],
  },
  inventory: {
    section: "inventory",
    apiPath: "/inventory/receive/bike",
    title: "Receive into warehouse",
    description: "New assets are registered here first, then issued to fleet owners, stations, or bikes.",
    submitLabel: "Receive",
    fields: [
      {
        name: "kind",
        label: "Asset type",
        type: "select",
        required: true,
        options: [
          { value: "bike", label: "Bike" },
          { value: "battery", label: "Battery" },
        ],
      },
      { name: "plateNumber", label: "Plate number (bike)", type: "text" },
      { name: "chassisNumber", label: "Chassis number (bike)", type: "text" },
      { name: "serialNumber", label: "Serial number", type: "text", required: true },
      { name: "model", label: "Model", type: "text" },
      { name: "manufacturer", label: "Manufacturer (battery)", type: "text" },
      { name: "capacity", label: "Capacity kWh (battery)", type: "number" },
      { name: "soc", label: "SOC % (battery)", type: "number" },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },
  bikes: {
    section: "bikes",
    apiPath: "/bikes",
    title: "Register bike",
    description: "Links a plate and serial. Leave fleet owner empty to register in warehouse inventory instead.",
    submitLabel: "Create bike",
    fields: [
      { name: "plateNumber", label: "Plate number", type: "text", required: true },
      { name: "serialNumber", label: "Serial number", type: "text", required: true },
      { name: "model", label: "Model", type: "text", required: true },
      { name: "chassisNumber", label: "Chassis number", type: "text" },
    ],
  },
  owners: {
    section: "owners",
    apiPath: "/owners",
    title: "Register owner",
    description:
      "Links an existing owner portal account and opens the fleet wallet. Optional fleet bikes on the next tab.",
    submitLabel: "Create owner",
    fields: [],
  },
  agents: {
    section: "agents",
    apiPath: "/agents",
    title: "Register agent",
    description: "Links an existing user account (type agent) and opens a float wallet.",
    submitLabel: "Create agent",
    fields: [
      {
        name: "currency",
        label: "Float currency",
        type: "text",
        placeholder: DEFAULT_CURRENCY,
        defaultValue: DEFAULT_CURRENCY,
        readOnly: true,
      },
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
      { name: "chargingCapacity", label: "Charging capacity", type: "number" },
      { name: "model", label: "Model", type: "text" },
      { name: "photo", label: "Station photo", type: "file", accept: "image/*" },
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
    submitLabel: "Create user",
    fields: [
      {
        name: "type",
        label: "Account type",
        type: "select",
        required: true,
        options: selectOptions(USER_TYPES),
      },
      { name: "username", label: "Username", type: "text", required: true },
      { name: "firstName", label: "First name", type: "text", required: true },
      { name: "lastName", label: "Last name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "password", label: "Password", type: "password", required: true, placeholder: "Min. 8 characters" },
      { name: "phone", label: "Phone", type: "text" },
    ],
  },
  incidents: {
    section: "incidents",
    apiPath: "/incidents",
    title: "Report battery incident",
    description: "Report a faulty or damaged pack at your assigned station.",
    submitLabel: "Submit report",
    fields: [
      { name: "batteryId", label: "Battery ID", type: "number", required: true },
      { name: "description", label: "What is wrong with the pack?", type: "textarea", required: true },
      { name: "image", label: "Photo (optional)", type: "file", accept: "image/*" },
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
    fields: [
      {
        name: "currency",
        label: "Currency",
        type: "text",
        placeholder: DEFAULT_CURRENCY,
        defaultValue: DEFAULT_CURRENCY,
        readOnly: true,
      },
    ],
  },
  riders: {
    section: "riders",
    apiPath: "/owners",
    title: "Add to directory",
    description: "Register a fleet owner or link a rider to a fleet for agent top-up.",
    submitLabel: "Save",
    fields: [],
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
      {
        name: "currency",
        label: "Currency",
        type: "text",
        placeholder: DEFAULT_CURRENCY,
        defaultValue: DEFAULT_CURRENCY,
        readOnly: true,
      },
    ],
  },
};

export function getCreateConfig(section: Section): CreateResourceConfig | null {
  if (
    section === "overview" ||
    section === "topUp" ||
    section === "agentTransactions" ||
    section === "erasureRequests"
  ) {
    return null;
  }
  return CONFIGS[section];
}

export function getLocalizedCreateConfig(
  section: Section,
  localize: (config: CreateResourceConfig) => CreateResourceConfig,
): CreateResourceConfig | null {
  const config = getCreateConfig(section);
  if (!config) {
    return null;
  }
  return localize(config);
}

export function buildCreatePayload(config: CreateResourceConfig, values: Record<string, string>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  for (const field of config.fields) {
    if (field.type === "file") {
      continue;
    }

    if (field.name === "currency") {
      payload.currency = DEFAULT_CURRENCY;
      continue;
    }

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
