export function erasedUserLabel(userId: number): string {
  return `Erased user #${userId}`;
}

export function isErasedUser(row: {
  erasedAt?: string | null;
  username?: string | null;
}): boolean {
  if (row.erasedAt) {
    return true;
  }
  return typeof row.username === "string" && row.username.startsWith("erased_user_");
}

export function userDisplayName(row: {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  erasedAt?: string | null;
}): string {
  if (isErasedUser(row)) {
    return erasedUserLabel(row.id);
  }

  const parts = [row.firstName, row.lastName].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(" ");
  }

  return row.username?.trim() || `User #${row.id}`;
}