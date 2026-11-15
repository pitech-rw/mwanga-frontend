export type RiderListRow = {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  ownerId?: number | null;
  createdAt?: string | null;
};

export function riderListOptionLine(user: RiderListRow): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  const label = name ? `${name} (@${user.username})` : `@${user.username}`;
  const contact = user.email ?? user.phone ?? "";
  const assigned =
    user.ownerId != null ? ` · fleet owner #${user.ownerId}` : "";
  return contact ? `${user.id} · ${label} · ${contact}${assigned}` : `${user.id} · ${label}${assigned}`;
}

export function riderListSearchHaystack(user: RiderListRow): string {
  return [
    user.username,
    user.firstName,
    user.lastName,
    user.email,
    user.phone ?? "",
    user.ownerId != null ? String(user.ownerId) : "",
    String(user.id),
  ]
    .join(" ")
    .toLowerCase();
}