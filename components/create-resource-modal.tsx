"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { authFetch } from "../lib/auth";
import { userMessageForNetwork, userMessageFromResponse } from "../lib/api-errors";
import { buildCreatePayload, getCreateConfig, type CreateResourceConfig } from "../lib/resource-create-config";
import type { Section } from "../lib/nav";
import { PlacesLocationPicker } from "./places-location-picker";
import { Modal } from "./modal";

type CreateResourceModalProps = {
  open: boolean;
  section: Section;
  onClose: () => void;
  onCreated?: () => void;
  onError?: (message: string) => void;
};

type OwnerListRow = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
};

type AgentUserRow = {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
};

type AgentListRow = {
  userId?: number | null;
};

function emptyValues(config: CreateResourceConfig): Record<string, string> {
  return Object.fromEntries(config.fields.map((field) => [field.name, ""]));
}

function ownerOptionLine(o: OwnerListRow): string {
  const contact = o.email ?? o.phone ?? "";
  return contact ? `${o.id} · ${o.name} · ${contact}` : `${o.id} · ${o.name}`;
}

function agentUserOptionLine(user: AgentUserRow): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  const label = name ? `${name} (@${user.username})` : `@${user.username}`;
  const contact = user.email ?? user.phone ?? "";
  return contact ? `${user.id} · ${label} · ${contact}` : `${user.id} · ${label}`;
}

export function CreateResourceModal({ open, section, onClose, onCreated, onError }: CreateResourceModalProps) {
  const config = getCreateConfig(section);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletOwnerId, setWalletOwnerId] = useState<number | null>(null);
  const [walletOwnerSearch, setWalletOwnerSearch] = useState("");
  const [walletOwners, setWalletOwners] = useState<OwnerListRow[]>([]);
  const [loadingWalletUsers, setLoadingWalletUsers] = useState(false);
  const [agentUserId, setAgentUserId] = useState<number | null>(null);
  const [agentUserSearch, setAgentUserSearch] = useState("");
  const [agentUsers, setAgentUsers] = useState<AgentUserRow[]>([]);
  const [loadingAgentUsers, setLoadingAgentUsers] = useState(false);

  useEffect(() => {
    const cfg = getCreateConfig(section);
    if (open && cfg) {
      setValues(emptyValues(cfg));
      setError(null);
      setWalletOwnerId(null);
      setWalletOwnerSearch("");
      setAgentUserId(null);
      setAgentUserSearch("");
    }
  }, [open, section]);

  useEffect(() => {
    if (!open || section !== "wallets") {
      return;
    }

    let active = true;
    setLoadingWalletUsers(true);

    const load = async () => {
      try {
        const response = await authFetch("/owners");
        if (!response.ok) {
          if (active) {
            setWalletOwners([]);
            setError(await userMessageFromResponse("load", response));
          }
          return;
        }
        const data = (await response.json()) as unknown;
        if (!active) {
          return;
        }
        setWalletOwners(Array.isArray(data) ? (data as OwnerListRow[]) : []);
        setError(null);
      } catch {
        if (active) {
          setWalletOwners([]);
          setError(userMessageForNetwork("load"));
        }
      } finally {
        if (active) {
          setLoadingWalletUsers(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [open, section]);

  useEffect(() => {
    if (!open || section !== "agents") {
      return;
    }

    let active = true;
    setLoadingAgentUsers(true);

    const load = async () => {
      try {
        const [usersRes, agentsRes] = await Promise.all([
          authFetch("/users?type=agent"),
          authFetch("/agents"),
        ]);
        if (!usersRes.ok) {
          if (active) {
            setAgentUsers([]);
            setError(await userMessageFromResponse("load", usersRes));
          }
          return;
        }
        const usersRaw = (await usersRes.json()) as unknown;
        const users = Array.isArray(usersRaw) ? (usersRaw as AgentUserRow[]) : [];
        let linkedIds = new Set<number>();
        if (agentsRes.ok) {
          const agentsRaw = (await agentsRes.json()) as unknown;
          if (Array.isArray(agentsRaw)) {
            linkedIds = new Set(
              (agentsRaw as AgentListRow[])
                .map((row) => row.userId)
                .filter((id): id is number => typeof id === "number"),
            );
          }
        }
        if (!active) {
          return;
        }
        setAgentUsers(users.filter((user) => !linkedIds.has(user.id)));
        setError(null);
      } catch {
        if (active) {
          setAgentUsers([]);
          setError(userMessageForNetwork("load"));
        }
      } finally {
        if (active) {
          setLoadingAgentUsers(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [open, section]);

  const filteredWalletOwners = useMemo(() => {
    const needle = walletOwnerSearch.trim().toLowerCase();
    if (!needle) {
      return walletOwners;
    }
    return walletOwners.filter((o) => {
      const haystack = [o.name, o.email ?? "", o.phone ?? "", String(o.id)].join(" ").toLowerCase();
      return haystack.includes(needle);
    });
  }, [walletOwnerSearch, walletOwners]);

  const selectedWalletOwner = useMemo(
    () => (walletOwnerId != null ? walletOwners.find((o) => o.id === walletOwnerId) : undefined),
    [walletOwnerId, walletOwners],
  );

  const filteredAgentUsers = useMemo(() => {
    const needle = agentUserSearch.trim().toLowerCase();
    if (!needle) {
      return agentUsers;
    }
    return agentUsers.filter((user) => {
      const haystack = [
        user.username,
        user.firstName,
        user.lastName,
        user.email,
        user.phone ?? "",
        String(user.id),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [agentUserSearch, agentUsers]);

  const selectedAgentUser = useMemo(
    () => (agentUserId != null ? agentUsers.find((user) => user.id === agentUserId) : undefined),
    [agentUserId, agentUsers],
  );

  const onStationPlaceSelected = useCallback(
    (place: { address: string; latitude: number; longitude: number }) => {
      setValues((prev) => ({
        ...prev,
        address: place.address,
        latitude: String(place.latitude),
        longitude: String(place.longitude),
      }));
    },
    [],
  );

  if (!config) {
    return null;
  }

  const submitDisabled =
    saving ||
    (config.section === "wallets" && (walletOwnerId === null || loadingWalletUsers)) ||
    (config.section === "agents" && (agentUserId === null || loadingAgentUsers));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    if (config.section === "wallets") {
      if (walletOwnerId === null) {
        setError("Select a fleet owner.");
        setSaving(false);
        return;
      }
    }

    if (config.section === "agents") {
      if (agentUserId === null) {
        setError("Select an agent user account.");
        setSaving(false);
        return;
      }
    }

    try {
      let body: Record<string, unknown>;

      if (config.section === "wallets") {
        body = { ownerId: walletOwnerId };
        const balanceRaw = values.balance?.trim() ?? "";
        if (balanceRaw) {
          body.balance = Number(balanceRaw);
        }
        const currencyRaw = values.currency?.trim() ?? "";
        if (currencyRaw) {
          body.currency = currencyRaw;
        }
      } else if (config.section === "agents") {
        body = { userId: agentUserId };
        const currencyRaw = values.currency?.trim() ?? "";
        if (currencyRaw) {
          body.currency = currencyRaw;
        }
      } else {
        body = buildCreatePayload(config, values);
      }

      const response = await authFetch(config.apiPath, {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const message = await userMessageFromResponse("create", response);
        setError(message);
        onError?.(message);
        return;
      }

      onCreated?.();
      onClose();
    } catch {
      setError(userMessageForNetwork("create"));
      onError?.(userMessageForNetwork("create"));
    } finally {
      setSaving(false);
    }
  };

  const formId = `create-resource-${section}`;

  return (
    <Modal
      open={open}
      variant="panel"
      title={config.title}
      description={config.description}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form={formId} className="btn primary" disabled={submitDisabled}>
            {saving ? "Saving…" : config.submitLabel}
          </button>
        </>
      }
    >
      <form id={formId} className="form form-modal-panel" onSubmit={submit}>
        {error ? (
          <div className="login-error" role="alert">
            {error}
          </div>
        ) : null}

        {config.section === "agents" ? (
          <>
            <p className="sub">
              Create the sign-in account under <strong>Users</strong> first (role type <strong>agent</strong>), then
              link it here to open float.
            </p>
            <label className="field">
              <span>Find account</span>
              <input
                type="search"
                value={agentUserSearch}
                disabled={saving || loadingAgentUsers}
                onChange={(event) => setAgentUserSearch(event.target.value)}
                placeholder="Search by name, username, email, or phone…"
                autoComplete="off"
                aria-label="Search agent user accounts"
              />
            </label>
            {loadingAgentUsers ? (
              <p className="sub">Loading accounts…</p>
            ) : (
              <label className="field">
                <span>User account ({filteredAgentUsers.length} without float)</span>
                <select
                  value={agentUserId != null ? String(agentUserId) : ""}
                  disabled={saving || filteredAgentUsers.length === 0}
                  onChange={(event) => {
                    const v = event.target.value;
                    setAgentUserId(v === "" ? null : Number(v));
                  }}
                  size={Math.min(8, Math.max(4, filteredAgentUsers.length || 4))}
                  className="station-picker create-wallet-user-select"
                  aria-label="Select agent user account"
                >
                  <option value="">
                    {filteredAgentUsers.length === 0 ? "No eligible accounts" : "Choose an account…"}
                  </option>
                  {filteredAgentUsers.map((user) => (
                    <option key={user.id} value={String(user.id)}>
                      {agentUserOptionLine(user)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {selectedAgentUser ? (
              <p className="create-wallet-selection sub" role="status">
                <strong>Selected:</strong> {agentUserOptionLine(selectedAgentUser)}
              </p>
            ) : null}
          </>
        ) : null}

        {config.section === "wallets" ? (
          <>
            <label className="field">
              <span>Find owner</span>
              <input
                type="search"
                value={walletOwnerSearch}
                disabled={saving || loadingWalletUsers}
                onChange={(event) => setWalletOwnerSearch(event.target.value)}
                placeholder="Search by name, email, or phone…"
                autoComplete="off"
                aria-label="Search owners for wallet"
              />
            </label>
            {loadingWalletUsers ? (
              <p className="sub">Loading owners…</p>
            ) : (
              <label className="field">
                <span>Owner ({filteredWalletOwners.length} shown)</span>
                <select
                  value={walletOwnerId != null ? String(walletOwnerId) : ""}
                  disabled={saving || filteredWalletOwners.length === 0}
                  onChange={(event) => {
                    const v = event.target.value;
                    setWalletOwnerId(v === "" ? null : Number(v));
                  }}
                  size={Math.min(8, Math.max(4, filteredWalletOwners.length || 4))}
                  className="station-picker create-wallet-user-select"
                  aria-label="Select fleet owner for wallet"
                >
                  <option value="">{filteredWalletOwners.length === 0 ? "No matches" : "Choose an owner…"}</option>
                  {filteredWalletOwners.map((o) => (
                    <option key={o.id} value={String(o.id)}>
                      {ownerOptionLine(o)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {selectedWalletOwner ? (
              <p className="create-wallet-selection sub" role="status">
                <strong>Selected:</strong> {ownerOptionLine(selectedWalletOwner)}
              </p>
            ) : null}
          </>
        ) : null}

        {config.section === "stations" ? (
          <PlacesLocationPicker disabled={saving} onPlaceSelected={onStationPlaceSelected} />
        ) : null}

        {config.fields.map((field) => (
          <label key={field.name} className="field">
            <span>
              {field.label}
              {field.required ? (
                <>
                  <span className="col-required" aria-hidden="true">
                    {" "}
                    *
                  </span>
                  <span className="sr-only"> (required)</span>
                </>
              ) : null}
            </span>
            {field.type === "select" ? (
              <select
                required={field.required}
                value={values[field.name] ?? ""}
                onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}
              >
                <option value="">Select…</option>
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : field.type === "textarea" ? (
              <textarea
                required={field.required}
                rows={3}
                value={values[field.name] ?? ""}
                placeholder={field.placeholder}
                onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}
              />
            ) : (
              <input
                required={field.required}
                type={field.type}
                value={values[field.name] ?? ""}
                placeholder={field.placeholder}
                minLength={field.type === "password" ? 8 : undefined}
                onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}
              />
            )}
          </label>
        ))}
      </form>
    </Modal>
  );
}
