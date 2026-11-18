import { BATTERY_STATUS_VALUES } from "./battery-status";
import { ENTITY_STATUS_VALUES } from "./entity-status";
import { localizeField } from "./i18n/localize";
import type { TranslateFn } from "./i18n/translate";
import { KYC_STATUS_VALUES } from "./kyc-status";
import type { FieldSpec } from "./resource-create-config";
import type { ResourceSection } from "./resource-create-config";
import { SWAP_PAYMENT_STATUS_VALUES, SWAP_STATUS_VALUES } from "./swap-status";

const USER_TYPES = ["admin", "office", "office_manager", "swapper", "agent", "owner", "rider", "viewer"] as const;
const VIOLATION_STATUSES = ["open", "under_review", "resolved", "dismissed"] as const;
const VIOLATION_SEVERITIES = ["low", "medium", "high", "critical"] as const;

function selectOptions(values: readonly string[]) {
  return values.map((value) => ({ value, label: value.replace(/_/g, " ") }));
}

/**
 * Editable fields per resource (aligned with server `Update*Dto` optional properties).
 * Wallets use the dedicated wallet modals instead.
 */
export function getResourceUpdateFields(section: ResourceSection): FieldSpec[] | null {
  switch (section) {
    case "inventory":
      return [{ name: "notes", label: "Notes", type: "textarea" }];
    case "batteries":
      return [
        { name: "serialNumber", label: "Serial number", type: "text" },
        { name: "manufacturer", label: "Manufacturer", type: "text" },
        { name: "oem", label: "OEM", type: "text" },
        { name: "model", label: "Model", type: "text" },
        { name: "capacity", label: "Capacity (kWh)", type: "number" },
        { name: "batteryType", label: "Battery type", type: "text" },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: selectOptions(BATTERY_STATUS_VALUES),
        },
        { name: "soc", label: "State of charge (%)", type: "number", placeholder: "0–100" },
        { name: "soh", label: "State of health (%)", type: "number", placeholder: "0–100" },
        { name: "cycleCount", label: "Cycle count", type: "number" },
        { name: "voltage", label: "Voltage", type: "number" },
        { name: "stationId", label: "Station ID", type: "number", placeholder: "Omit to leave unchanged" },
        { name: "bikeId", label: "Bike ID", type: "number", placeholder: "Omit to leave unchanged" },
      ];
    case "bikes":
      return [
        { name: "plateNumber", label: "Plate number", type: "text" },
        { name: "chassisNumber", label: "Chassis number", type: "text" },
        { name: "serialNumber", label: "Serial number", type: "text" },
        { name: "model", label: "Model", type: "text" },
        { name: "image", label: "Image URL", type: "text" },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: selectOptions(ENTITY_STATUS_VALUES),
        },
        { name: "ownerId", label: "Owner ID", type: "number" },
        { name: "userId", label: "Rider user ID", type: "number" },
        { name: "currentBatteryId", label: "Current battery ID", type: "number" },
      ];
    case "owners":
      return [
        { name: "name", label: "Display name", type: "text" },
        { name: "email", label: "Email", type: "email" },
        { name: "phone", label: "Phone", type: "text" },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: selectOptions(ENTITY_STATUS_VALUES),
        },
        { name: "userId", label: "Portal user ID", type: "number" },
      ];
    case "agents":
      return [
        { name: "name", label: "Display name", type: "text" },
        { name: "email", label: "Email", type: "email" },
        { name: "phone", label: "Phone", type: "text" },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: selectOptions(ENTITY_STATUS_VALUES),
        },
        { name: "userId", label: "Portal user ID", type: "number" },
      ];
    case "cards":
      return [
        { name: "token", label: "Token", type: "text" },
        { name: "serialNumber", label: "Serial number", type: "text" },
        { name: "type", label: "Type", type: "text", placeholder: "nfc" },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: selectOptions(ENTITY_STATUS_VALUES),
        },
        { name: "userId", label: "User ID", type: "number" },
      ];
    case "roles":
      return [{ name: "name", label: "Role name", type: "text" }];
    case "stations":
      return [
        { name: "name", label: "Name", type: "text" },
        { name: "address", label: "Address", type: "text" },
        { name: "latitude", label: "Latitude", type: "number" },
        { name: "longitude", label: "Longitude", type: "number" },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: selectOptions(ENTITY_STATUS_VALUES),
        },
        { name: "chargingCapacity", label: "Charging capacity", type: "number" },
        { name: "model", label: "Model", type: "text" },
        { name: "photo", label: "Station photo", type: "file", accept: "image/*" },
      ];
    case "swaps":
      return [
        { name: "userId", label: "User ID", type: "number" },
        { name: "bikeId", label: "Bike ID", type: "number" },
        { name: "stationId", label: "Station ID", type: "number" },
        { name: "cardId", label: "Card ID", type: "number" },
        { name: "swapperId", label: "Swapper ID", type: "number" },
        { name: "oldBatteryId", label: "Old battery ID", type: "number" },
        { name: "newBatteryId", label: "New battery ID", type: "number" },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: selectOptions(SWAP_STATUS_VALUES),
        },
        {
          name: "paymentStatus",
          label: "Payment status",
          type: "select",
          options: selectOptions(SWAP_PAYMENT_STATUS_VALUES),
        },
        { name: "fee", label: "Fee", type: "number" },
        { name: "walletBalanceAfter", label: "Wallet balance after", type: "number" },
        { name: "paymentReference", label: "Payment reference", type: "text" },
        { name: "notes", label: "Notes", type: "textarea" },
      ];
    case "users":
      return [
        { name: "username", label: "Username", type: "text" },
        { name: "firstName", label: "First name", type: "text" },
        { name: "lastName", label: "Last name", type: "text" },
        { name: "email", label: "Email", type: "email" },
        { name: "phone", label: "Phone", type: "text" },
        { name: "address", label: "Address", type: "textarea" },
        { name: "image", label: "Image URL", type: "text" },
        { name: "nationalId", label: "National ID", type: "text" },
        {
          name: "type",
          label: "Account type",
          type: "select",
          options: selectOptions(USER_TYPES),
        },
        { name: "isActive", label: "Active account", type: "checkbox" },
        { name: "password", label: "New password", type: "password", placeholder: "Leave blank to keep current" },
        {
          name: "kycStatus",
          label: "KYC status",
          type: "select",
          options: selectOptions(KYC_STATUS_VALUES),
        },
        { name: "stationId", label: "Assigned station ID (swappers)", type: "number", placeholder: "Empty = omit; use swapper assign flow when possible" },
        { name: "ownerId", label: "Fleet owner ID (riders)", type: "number" },
      ];
    case "violations":
      return [
        { name: "trackId", label: "Track ID", type: "text" },
        { name: "title", label: "Title", type: "text" },
        { name: "reason", label: "Reason", type: "textarea" },
        { name: "image", label: "Image URL", type: "text" },
        { name: "occurredAt", label: "Occurred at", type: "datetime-local" },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: selectOptions(VIOLATION_STATUSES),
        },
        {
          name: "severity",
          label: "Severity",
          type: "select",
          options: selectOptions(VIOLATION_SEVERITIES),
        },
        { name: "stationId", label: "Station ID", type: "number" },
        { name: "reporterId", label: "Reporter user ID", type: "number" },
        { name: "offenderId", label: "Offender user ID", type: "number" },
      ];
    case "wallets":
      return null;
    default:
      return null;
  }
}

export function getLocalizedResourceUpdateFields(section: ResourceSection, t: TranslateFn) {
  const fields = getResourceUpdateFields(section);
  if (!fields) {
    return null;
  }
  return fields.map((field) => localizeField(field, t));
}
