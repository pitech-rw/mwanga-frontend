/** Query path for user pickers; defaults to active accounts only. */
export function usersListPath(type: string, options?: { activeOnly?: boolean }): string {
  const params = new URLSearchParams({ type });
  if (options?.activeOnly !== false) {
    params.set("activeOnly", "true");
  }
  return `/users?${params.toString()}`;
}

export function isAssignableUser(row: { isActive?: boolean | null }): boolean {
  return row.isActive !== false;
}