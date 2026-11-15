export const RECENT_PICKER_LIMIT = 5;

function createdAtSortKey(value: unknown): number {
  if (typeof value !== "string" || !value.trim()) {
    return 0;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function sortByRecentCreated<T extends { id: number; createdAt?: string | null }>(rows: T[]): T[] {
  return [...rows].sort((left, right) => {
    const byDate = createdAtSortKey(right.createdAt) - createdAtSortKey(left.createdAt);
    if (byDate !== 0) {
      return byDate;
    }
    return right.id - left.id;
  });
}

export function recentPickerOptions<T extends { id: number }>(
  rows: T[],
  searchNeedle: string,
  selectedId: number | null,
  match: (row: T, needle: string) => boolean,
  limitRecent: boolean,
): T[] {
  const needle = searchNeedle.trim().toLowerCase();
  let options = needle ? rows.filter((row) => match(row, needle)) : limitRecent ? sortByRecentCreated(rows).slice(0, RECENT_PICKER_LIMIT) : rows;

  if (selectedId != null && !options.some((row) => row.id === selectedId)) {
    const selected = rows.find((row) => row.id === selectedId);
    if (selected) {
      options = [selected, ...options];
    }
  }

  return options;
}