import type { FieldSpec } from "./resource-create-config";

const USER_TYPES = [
  "admin",
  "office",
  "office_manager",
  "swapper",
  "agent",
  "owner",
  "rider",
  "viewer",
] as const;

function selectOptions(values: readonly string[]) {
  return values.map((value) => ({ value, label: value.replace(/_/g, " ") }));
}

/** Edit form fields for a user row — excludes address (Places picker), station/owner pickers, and isActive (reactivation panel). */
export function getUserUpdateFieldsForRow(row: Record<string, unknown>): FieldSpec[] {
  const inactive = row.isActive === false;

  return [
    {
      name: "type",
      label: "Account type",
      type: "select",
      options: selectOptions(USER_TYPES),
    },
    { name: "username", label: "Username", type: "text" },
    { name: "firstName", label: "First name", type: "text" },
    { name: "lastName", label: "Last name", type: "text" },
    { name: "email", label: "Email", type: "email" },
    { name: "phone", label: "Phone", type: "text" },
    { name: "nationalId", label: "National ID", type: "text" },
    { name: "image", label: "Image URL", type: "text" },
    {
      name: "password",
      label: inactive ? "New password" : "New password",
      type: "password",
      placeholder: inactive ? "Required to reactivate" : "Leave blank to keep current",
    },
  ];
}

export function userAccountType(row: Record<string, unknown>): string {
  return typeof row.type === "string" ? row.type : "";
}

/** Merges address, fleet/station assignment, and reactivation into the generic user PATCH. */
export function mergeUserEditExtras(
  row: Record<string, unknown>,
  values: Record<string, string>,
  base: Record<string, unknown> | null,
): Record<string, unknown> | null {
  const patch: Record<string, unknown> = base ? { ...base } : {};
  let anyChange = base !== null;

  const origStr = (name: string): string => {
    const v = row[name];
    if (v === null || v === undefined) {
      return "";
    }
    return String(v);
  };

  const mayEdit = row.isActive !== false || values.reactivate === "true";
  if (!mayEdit) {
    return base;
  }

  const address = values.address?.trim() ?? "";
  if (address !== "" && address !== origStr("address")) {
    patch.address = address;
    anyChange = true;
  }

  const accountType = values.type?.trim() || userAccountType(row);

  if (accountType === "swapper") {
    const raw = values.stationId?.trim() ?? "";
    if (raw === "" && row.stationId != null) {
      patch.stationId = null;
      anyChange = true;
    } else if (raw !== "" && raw !== origStr("stationId")) {
      patch.stationId = Number(raw);
      anyChange = true;
    }
  }

  if (accountType === "rider") {
    const raw = values.ownerId?.trim() ?? "";
    if (raw !== "" && raw !== origStr("ownerId")) {
      patch.ownerId = Number(raw);
      anyChange = true;
    }
  }

  if (row.isActive === false && values.reactivate === "true") {
    patch.isActive = true;
    anyChange = true;
  }

  if (!anyChange) {
    return null;
  }
  return patch;
}