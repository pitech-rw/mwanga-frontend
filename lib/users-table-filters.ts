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

export function buildUsersTableFilters(_rows: UserRow[]): DataTableSelectFilter<UserRow>[] {
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
  ];
}

export const USERS_TABLE_SORT_OPTIONS = [
  { key: "name", label: "Name" },
  { key: "username", label: "Username" },
  { key: "email", label: "Email" },
  { key: "type", label: "Type" },
  { key: "active", label: "Status" },
  { key: "station", label: "Station" },
] as const;
