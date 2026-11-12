/**
 * Mirrored from `server/src/auth/permission-catalog.ts` for client-side action gating.
 */
export const PERMISSIONS = {
  users: {
    read: "users:read",
    write: "users:write",
    delete: "users:delete",
  },
  roles: {
    read: "roles:read",
    write: "roles:write",
    delete: "roles:delete",
  },
  owners: {
    read: "owners:read",
    write: "owners:write",
    delete: "owners:delete",
  },
  agents: {
    read: "agents:read",
    write: "agents:write",
    delete: "agents:delete",
  },
  bikes: {
    read: "bikes:read",
    write: "bikes:write",
    delete: "bikes:delete",
  },
  cards: {
    read: "cards:read",
    write: "cards:write",
    delete: "cards:delete",
  },
  batteries: {
    read: "batteries:read",
    write: "batteries:write",
    delete: "batteries:delete",
  },
  stations: {
    read: "stations:read",
    write: "stations:write",
    delete: "stations:delete",
  },
  wallets: {
    read: "wallets:read",
    write: "wallets:write",
    credit: "wallets:credit",
    agentTopup: "wallets:agent-topup",
    delete: "wallets:delete",
  },
  companyAccounts: {
    read: "company-accounts:read",
    write: "company-accounts:write",
  },
  swaps: {
    read: "swaps:read",
    operate: "swaps:operate",
    write: "swaps:write",
    delete: "swaps:delete",
    override: "swaps:override",
  },
  violations: {
    read: "violations:read",
    write: "violations:write",
    delete: "violations:delete",
  },
} as const;
