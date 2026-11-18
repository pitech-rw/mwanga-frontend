/** Keep in sync with `server/src/swaps/swaps.service.ts` swapStatusMap / paymentStatusMap. */
export const SWAP_STATUS_VALUES = [
  "initiated",
  "assigned",
  "collected",
  "installed",
  "completed",
  "failed",
  "cancelled",
  "reversed",
] as const;

export const SWAP_PAYMENT_STATUS_VALUES = ["pending", "captured", "failed", "reversed"] as const;