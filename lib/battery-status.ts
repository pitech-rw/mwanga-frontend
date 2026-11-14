/** Keep in sync with `server/src/batteries/battery-status.ts`. */
export const BATTERY_STATUS_VALUES = [
  "offline",
  "available",
  "charging",
  "in_use",
  "faulty",
] as const;

export type BatteryStatusValue = (typeof BATTERY_STATUS_VALUES)[number];
