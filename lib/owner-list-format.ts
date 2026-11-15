export type OwnerListRow = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  createdAt?: string | null;
};

export function ownerOptionLine(owner: OwnerListRow): string {
  const contact = owner.email ?? owner.phone ?? "";
  return contact ? `${owner.id} · ${owner.name} · ${contact}` : `${owner.id} · ${owner.name}`;
}

export function ownerListSearchHaystack(owner: OwnerListRow): string {
  return [owner.name, owner.email ?? "", owner.phone ?? "", String(owner.id)].join(" ").toLowerCase();
}