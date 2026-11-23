/** Keep in sync with `server/src/batteries/battery-status.ts`. */
export const BATTERY_STATUS_VALUES = [
  "warehouse",
  "offline",
  "available",
  "charging",
  "in_use",
  "faulty",
] as const;

export type BatteryStatusValue = (typeof BATTERY_STATUS_VALUES)[number];

/** Register/create forms — omit warehouse; server defaults new packs to warehouse. */
export const BATTERY_STATUS_VALUES_CREATABLE = BATTERY_STATUS_VALUES.filter(
  (status) => status !== "warehouse",
);

export type BatteryCreateAttachTarget = "inventory" | "station" | "bike";

export function batteryMayBeAssigned(status: string | undefined | null): boolean {
  return status !== "offline" && status !== "faulty";
}

/** When set at register time, only this attach target is allowed. */
export function batteryRequiredAttachTarget(
  status: string | undefined | null,
): BatteryCreateAttachTarget | null {
  if (status === "offline" || status === "faulty") {
    return "inventory";
  }
  if (status === "charging") {
    return "station";
  }
  if (status === "in_use") {
    return "bike";
  }
  return null;
}

export function batteryCreateAttachOptionDisabled(
  option: BatteryCreateAttachTarget,
  status: string,
): boolean {
  const required = batteryRequiredAttachTarget(status);
  if (!required) {
    return false;
  }
  return option !== required;
}
