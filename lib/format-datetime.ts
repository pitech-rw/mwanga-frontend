/** Short date + time for data tables (aligned with swap / ledger lists). */
export function formatTableDateTime(value: unknown): string | null {
  if (value instanceof Date) {
    return value.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
  }
  if (typeof value === "string" && value.trim() !== "") {
    const ms = Date.parse(value);
    if (Number.isFinite(ms)) {
      return new Date(ms).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
    }
  }
  return null;
}

export function isTableDateFieldKey(key: string): boolean {
  return key === "createdAt" || key === "updatedAt" || key === "receivedAt" || /At$/.test(key);
}