import type { Column, DataTableSelectFilter, DataTableSortOption } from "../components/data-table";
import type { Section } from "./nav";
import { BATTERY_STATUS_VALUES } from "./battery-status";
import { walletOwnerCell } from "./wallet-row-helpers";
import { buildUsersTableFilters, USERS_TABLE_SORT_OPTIONS } from "./users-table-filters";

type Row = Record<string, unknown>;

const SWAP_STATUS_VALUES = [
  "initiated",
  "assigned",
  "collected",
  "installed",
  "completed",
  "failed",
  "cancelled",
  "reversed",
] as const;

const PAYMENT_STATUS_VALUES = ["pending", "captured", "failed", "reversed"] as const;

const VIOLATION_STATUS_VALUES = ["open", "under_review", "resolved", "dismissed"] as const;

const VIOLATION_SEVERITY_VALUES = ["low", "medium", "high", "critical"] as const;

const INVENTORY_KIND_VALUES = ["bike", "battery"] as const;

const LEDGER_KIND_VALUES = ["float_topup", "agent_topup", "swap_fee", "adjustment"] as const;

const SECTIONS_WITH_TABLE_FILTERS: Section[] = [
  "riders",
  "stations",
  "swaps",
  "inventory",
  "batteries",
  "bikes",
  "owners",
  "agents",
  "users",
  "roles",
  "cards",
  "wallets",
  "companyAccounts",
  "violations",
  "incidents",
  "agentTransactions",
];

const INCIDENT_STATUS_VALUES = [
  "open",
  "awaiting_swapper",
  "awaiting_review",
  "damaged",
  "dismissed",
] as const;

function humanizeToken(value: string): string {
  return value.replace(/_/g, " ");
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function distinctValues(rows: Row[], read: (row: Row) => string): string[] {
  const values = new Set<string>();
  for (const row of rows) {
    const normalized = read(row);
    if (normalized) {
      values.add(normalized);
    }
  }
  return [...values].sort((a, b) => a.localeCompare(b));
}

function enumSelectFilter(
  id: string,
  label: string,
  allLabel: string,
  knownValues: readonly string[],
  rows: Row[],
  read: (row: Row) => string,
): DataTableSelectFilter<Row> {
  const fromRows = distinctValues(rows, read);
  const options = [...new Set([...knownValues.map((value) => value.toLowerCase()), ...fromRows])].sort((a, b) =>
    a.localeCompare(b),
  );

  return {
    id,
    label,
    defaultValue: "",
    options: [
      { value: "", label: allLabel },
      ...options.map((value) => ({ value, label: humanizeToken(value) })),
    ],
    match: (row, value) => {
      if (!value) {
        return true;
      }
      return read(row) === value;
    },
  };
}

function fieldSelectFilter(
  id: string,
  label: string,
  allLabel: string,
  rows: Row[],
  read: (row: Row) => string,
): DataTableSelectFilter<Row> | null {
  const options = distinctValues(rows, read);
  if (options.length === 0) {
    return null;
  }

  return {
    id,
    label,
    defaultValue: "",
    options: [
      { value: "", label: allLabel },
      ...options.map((value) => ({ value, label: humanizeToken(value) })),
    ],
    match: (row, value) => {
      if (!value) {
        return true;
      }
      return read(row) === value;
    },
  };
}

function riderStatusLabel(row: Row): string {
  if (row.directoryKind === "owner") {
    return normalizeString(row.status) || "active";
  }
  return row.isActive === false ? "inactive" : "active";
}

function buildRidersTableFilters(): DataTableSelectFilter<Row>[] {
  return [
    {
      id: "kind",
      label: "Kind",
      defaultValue: "",
      options: [
        { value: "", label: "All kinds" },
        { value: "owner", label: "Owner" },
        { value: "rider", label: "Rider" },
      ],
      match: (row, value) => {
        if (!value) {
          return true;
        }
        const kind = row.directoryKind === "owner" ? "owner" : "rider";
        return kind === value;
      },
    },
    {
      id: "status",
      label: "Status",
      defaultValue: "",
      options: [
        { value: "", label: "All statuses" },
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
      ],
      match: (row, value) => {
        if (!value) {
          return true;
        }
        return riderStatusLabel(row) === value;
      },
    },
  ];
}

function buildWalletsTableFilters(rows: Row[]): DataTableSelectFilter<Row>[] {
  const holderTypes = distinctValues(rows, (row) => normalizeString(walletOwnerCell(row).type));

  return [
    {
      id: "holder",
      label: "Holder",
      defaultValue: "",
      options: [
        { value: "", label: "All holders" },
        ...holderTypes.map((value) => ({ value, label: humanizeToken(value) })),
      ],
      match: (row, value) => {
        if (!value) {
          return true;
        }
        return normalizeString(walletOwnerCell(row).type) === value;
      },
    },
  ];
}

function buildBatteryPlacementFilter(): DataTableSelectFilter<Row> {
  return {
    id: "placement",
    label: "Placement",
    defaultValue: "",
    options: [
      { value: "", label: "All placements" },
      { value: "station", label: "At station" },
      { value: "bike", label: "On bike" },
      { value: "unassigned", label: "Unassigned" },
    ],
    match: (row, value) => {
      if (!value) {
        return true;
      }
      const onBike = Boolean(row.bike && typeof row.bike === "object");
      const atStation = row.stationId != null || Boolean(row.station && typeof row.station === "object");
      if (value === "bike") {
        return onBike;
      }
      if (value === "station") {
        return atStation && !onBike;
      }
      if (value === "unassigned") {
        return !onBike && !atStation;
      }
      return true;
    },
  };
}

function buildGenericStatusAndTypeFilters(rows: Row[]): DataTableSelectFilter<Row>[] {
  const filters: DataTableSelectFilter<Row>[] = [];
  const statusFilter = fieldSelectFilter("status", "Status", "All statuses", rows, (row) =>
    normalizeString(row.status),
  );
  if (statusFilter) {
    filters.push(statusFilter);
  }

  const typeFilter = fieldSelectFilter("type", "Type", "All types", rows, (row) => normalizeString(row.type));
  if (typeFilter) {
    filters.push(typeFilter);
  }

  const kindFilter = fieldSelectFilter("kind", "Kind", "All kinds", rows, (row) => normalizeString(row.kind));
  if (kindFilter) {
    filters.push(kindFilter);
  }

  const currencyFilter = fieldSelectFilter("currency", "Currency", "All currencies", rows, (row) =>
    normalizeString(row.currency),
  );
  if (currencyFilter) {
    filters.push(currencyFilter);
  }

  return filters;
}

function buildStationDetailBatteryFilters(rows: Row[]): DataTableSelectFilter<Row>[] {
  return [
    enumSelectFilter("status", "Status", "All statuses", BATTERY_STATUS_VALUES, rows, (row) =>
      normalizeString(row.status),
    ),
  ];
}

function buildStationDetailOperatorFilters(): DataTableSelectFilter<Row>[] {
  return [
    {
      id: "active",
      label: "Status",
      defaultValue: "",
      options: [
        { value: "", label: "All statuses" },
        { value: "yes", label: "Active" },
        { value: "no", label: "Inactive" },
      ],
      match: (row, value) => {
        if (!value) {
          return true;
        }
        const active = String(row.active ?? "").toLowerCase();
        if (value === "yes") {
          return active === "yes";
        }
        if (value === "no") {
          return active === "no";
        }
        return true;
      },
    },
  ];
}

function buildStationDetailSwapFilters(rows: Row[]): DataTableSelectFilter<Row>[] {
  return [
    enumSelectFilter("status", "Status", "All statuses", SWAP_STATUS_VALUES, rows, (row) =>
      normalizeString(row.status),
    ),
    enumSelectFilter("payment", "Payment", "All payments", PAYMENT_STATUS_VALUES, rows, (row) =>
      normalizeString(row.payment),
    ),
  ];
}

function buildLedgerTransactionFilters(rows: Row[]): DataTableSelectFilter<Row>[] {
  return [
    enumSelectFilter("kind", "Type", "All types", LEDGER_KIND_VALUES, rows, (row) => normalizeString(row.kind)),
  ];
}

export function sectionUsesTableFilters(section: Section): boolean {
  return SECTIONS_WITH_TABLE_FILTERS.includes(section);
}

export function buildResourceTableFilters(section: Section, rows: Row[]): DataTableSelectFilter<Row>[] | undefined {
  if (!sectionUsesTableFilters(section)) {
    return undefined;
  }

  if (rows.length === 0) {
    return [];
  }

  switch (section) {
    case "users":
      return buildUsersTableFilters(rows);
    case "riders":
      return buildRidersTableFilters();
    case "batteries":
      return [
        enumSelectFilter("status", "Status", "All statuses", BATTERY_STATUS_VALUES, rows, (row) =>
          normalizeString(row.status),
        ),
        buildBatteryPlacementFilter(),
      ];
    case "inventory":
      return [
        enumSelectFilter("kind", "Kind", "All kinds", INVENTORY_KIND_VALUES, rows, (row) => normalizeString(row.kind)),
      ];
    case "swaps":
      return [
        enumSelectFilter("status", "Status", "All statuses", SWAP_STATUS_VALUES, rows, (row) =>
          normalizeString(row.status),
        ),
        enumSelectFilter("paymentStatus", "Payment", "All payments", PAYMENT_STATUS_VALUES, rows, (row) =>
          normalizeString(row.paymentStatus),
        ),
      ];
    case "violations":
      return [
        enumSelectFilter("status", "Status", "All statuses", VIOLATION_STATUS_VALUES, rows, (row) =>
          normalizeString(row.status),
        ),
        enumSelectFilter("severity", "Severity", "All severities", VIOLATION_SEVERITY_VALUES, rows, (row) =>
          normalizeString(row.severity),
        ),
      ];
    case "incidents":
      return [
        enumSelectFilter("status", "Status", "All statuses", INCIDENT_STATUS_VALUES, rows, (row) =>
          normalizeString(row.status),
        ),
      ];
    case "wallets":
      return buildWalletsTableFilters(rows);
    case "agentTransactions":
      return buildLedgerTransactionFilters(rows);
    default: {
      const filters = buildGenericStatusAndTypeFilters(rows);
      return filters.length > 0 ? filters : undefined;
    }
  }
}

export function sortOptionsFromColumns<T>(columns: Column<T>[]): DataTableSortOption[] {
  return columns
    .filter((column) => column.sortable !== false && column.key !== "actions")
    .map((column) => ({ key: column.key, label: column.header }));
}

export function buildResourceTableSortOptions(section: Section, columns: Column<Row>[]): DataTableSortOption[] | undefined {
  if (!sectionUsesTableFilters(section)) {
    return undefined;
  }

  if (section === "users") {
    return [...USERS_TABLE_SORT_OPTIONS];
  }

  const fromColumns = sortOptionsFromColumns(columns);
  return fromColumns.length > 0 ? fromColumns : undefined;
}

export function resourceTableDefaultSortKey(section: Section, columns: Column<Row>[]): string | null {
  if (!sectionUsesTableFilters(section)) {
    return null;
  }

  if (section === "users") {
    return "name";
  }

  if (section === "swaps") {
    return columns.some((column) => column.key === "createdAt") ? "createdAt" : null;
  }

  const sortOptions = buildResourceTableSortOptions(section, columns);
  return sortOptions?.[0]?.key ?? null;
}

export {
  buildLedgerTransactionFilters,
  buildStationDetailBatteryFilters,
  buildStationDetailOperatorFilters,
  buildStationDetailSwapFilters,
};