import type { FieldSpec } from "./resource-create-config";
import type { ResourceSection } from "./resource-create-config";

const USER_TYPES = ["admin", "office", "office_manager", "swapper", "agent", "rider", "viewer"] as const;
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
    case "batteries":
      return [
        { name: "serialNumber", label: "Serial number", type: "text" },
        { name: "manufacturer", label: "Manufacturer", type: "text" },
        { name: "oem", label: "OEM", type: "text" },
        { name: "model", label: "Model", type: "text" },
        { name: "batteryType", label: "Battery type", type: "text" },
        { name: "status", label: "Status", type: "text" },
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
        { name: "status", label: "Status", type: "text" },
        { name: "userId", label: "Rider user ID", type: "number" },
        { name: "currentBatteryId", label: "Current battery ID", type: "number" },
      ];
    case "cards":
      return [
        { name: "token", label: "Token", type: "text" },
        { name: "serialNumber", label: "Serial number", type: "text" },
        { name: "type", label: "Type", type: "text" },
        { name: "status", label: "Status", type: "text" },
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
        { name: "status", label: "Status", type: "text" },
        { name: "capacity", label: "Capacity", type: "number" },
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
        { name: "status", label: "Status", type: "text" },
        { name: "paymentStatus", label: "Payment status", type: "text" },
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
        { name: "kycStatus", label: "KYC status", type: "text" },
        { name: "stationId", label: "Assigned station ID (swappers)", type: "number", placeholder: "Empty = omit; use swapper assign flow when possible" },
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
