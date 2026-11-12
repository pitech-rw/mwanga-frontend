import type { DataTableSelectFilter } from "../components/data-table";

export const USER_ACCOUNT_TYPES = [
  "admin",
  "office",
  "office_manager",
  "swapper",
  "agent",
  "owner",
  "rider",
  "viewer",
] as const;

type UserRow = Record<string, unknown>;

function userActiveLabel(row: UserRow): string {
  return row.isActive === false ? "inactive" : "active";
}

function distinctKycStatuses(rows: UserRow[]): string[] {
  const values = new Set<string>(["pending"]);
  for (const row of rows) {
    const raw = row.kycStatus;
    if (typeof raw === "string" && raw.trim()) {
      values.add(raw.trim().toLowerCase());
    }
  }
  return [...values].sort((a, b) => a.localeCompare(b));
}

export function buildUsersTableFilters(rows: UserRow[]): DataTableSelectFilter<UserRow>[] {
  const kycOptions = distinctKycStatuses(rows);

  return [
    {
      id: "type",
      label: "Type",
      defaultValue: "",
      options: [
        { value: "", label: "All types" },
        ...USER_ACCOUNT_TYPES.map((type) => ({ value: type, label: type.replace(/_/g, " ") })),
      ],
      match: (row, value) => {
        if (!value) {
          return true;
        }
        return String(row.type ?? "").toLowerCase() === value;
      },
    },
    {
      id: "active",
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
        return userActiveLabel(row) === value;
      },
    },
    {
      id: "kyc",
      label: "KYC",
      defaultValue: "",
      options: [
        { value: "", label: "All KYC" },
        ...kycOptions.map((status) => ({ value: status, label: status })),
      ],
      match: (row, value) => {
        if (!value) {
          return true;
        }
        const raw = row.kycStatus;
        const normalized =
          typeof raw === "string" && raw.trim() ? raw.trim().toLowerCase() : "pending";
        return normalized === value;
      },
    },
  ];
}

export const USERS_TABLE_SORT_OPTIONS = [
  { key: "name", label: "Name" },
  { key: "username", label: "Username" },
  { key: "email", label: "Email" },
  { key: "type", label: "Type" },
  { key: "active", label: "Status" },
  { key: "kyc", label: "KYC" },
  { key: "station", label: "Station" },
] as const;
