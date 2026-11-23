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
