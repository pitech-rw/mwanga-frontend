"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { authFetch } from "../lib/auth";
import { userMessageForNetwork, userMessageFromResponse } from "../lib/api-errors";
import { getDefaultCreatePassword } from "../lib/default-password";
import { buildCreatePayload, getCreateConfig, type CreateResourceConfig } from "../lib/resource-create-config";
import { emptyFileState, mergeUploadedFiles } from "../lib/resource-form-files";
import type { Section } from "../lib/nav";
import { PlacesLocationPicker } from "./places-location-picker";
import { ResourceFormField } from "./resource-form-field";
import { ownerListSearchHaystack, ownerOptionLine, type OwnerListRow } from "../lib/owner-list-format";
import { RECENT_PICKER_LIMIT, recentPickerOptions } from "../lib/recent-picker";
import { SlideOverDrawer, type SlideOverDrawerTab } from "./slide-over-drawer";

type CreateResourceModalProps = {
  open: boolean;
  section: Section;
  onClose: () => void;
  onCreated?: (created?: Record<string, unknown>) => void;
  onError?: (message: string) => void;
};

type RiderUserRow = {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  createdAt?: string | null;
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

type StationListRow = {
  id: number;
  code: string;
  name: string;
  status?: string;
  createdAt?: string | null;
};

type SwapListUser = {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string | null;
};

type SwapListRow = {
  id: number;
  status: string;
  createdAt?: string | null;
  user?: SwapListUser | null;
};

type OwnerBikeDraft = {
  plateNumber: string;
  serialNumber: string;
  model: string;
  chassisNumber: string;
};

function emptyOwnerBike(): OwnerBikeDraft {
  return { plateNumber: "", serialNumber: "", model: "", chassisNumber: "" };
}

function ownerBikeDraftHasAny(draft: OwnerBikeDraft): boolean {
  return [draft.plateNumber, draft.serialNumber, draft.model, draft.chassisNumber].some((v) => v.trim() !== "");
}

function buildOwnerBikesPayload(drafts: OwnerBikeDraft[]): Record<string, string>[] | null {
  const bikes: Record<string, string>[] = [];

  for (const draft of drafts) {
    if (!ownerBikeDraftHasAny(draft)) {
      continue;
    }
    const plateNumber = draft.plateNumber.trim();
    const serialNumber = draft.serialNumber.trim();
    const model = draft.model.trim();
    if (!plateNumber || !serialNumber || !model) {
      return null;
    }
    const bike: Record<string, string> = { plateNumber, serialNumber, model };
    const chassisNumber = draft.chassisNumber.trim();
    if (chassisNumber) {
      bike.chassisNumber = chassisNumber;
    }
    bikes.push(bike);
  }

  return bikes;
}

function emptyValues(config: CreateResourceConfig): Record<string, string> {
  const defaultPassword = getDefaultCreatePassword();
  return Object.fromEntries(
    config.fields.map((field) => [field.name, field.type === "password" ? defaultPassword : ""]),
  );
}

function agentUserOptionLine(user: AgentUserRow): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  const label = name ? `${name} (@${user.username})` : `@${user.username}`;
  const contact = user.email ?? user.phone ?? "";
  return contact ? `${user.id} · ${label} · ${contact}` : `${user.id} · ${label}`;
}

function riderUserOptionLine(user: RiderUserRow): string {
  return agentUserOptionLine(user);
}

function stationOptionLine(station: StationListRow): string {
  const base = `${station.code} — ${station.name}`;
  return station.status && station.status !== "active" ? `${base} (${station.status})` : base;
}

function stationSearchHaystack(station: StationListRow): string {
  return [station.code, station.name, station.status ?? "", String(station.id)].join(" ").toLowerCase();
}

function swapRiderLabel(user: SwapListUser | null | undefined): string {
  if (!user) {
    return "Unknown rider";
  }
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name ? `${name} (@${user.username})` : `@${user.username}`;
}

function swapOptionLine(swap: SwapListRow): string {
  const rider = swapRiderLabel(swap.user);
  const phone = swap.user?.phone?.trim();
  const contact = phone || swap.user?.email?.trim() || "";
  const status = swap.status.replace(/_/g, " ");
  const riderPart = contact ? `${rider} · ${contact}` : rider;
  return `#${swap.id} · ${riderPart} · ${status}`;
}

function swapSearchHaystack(swap: SwapListRow): string {
  const user = swap.user;
  return [
    String(swap.id),
    swap.status,
    user?.username ?? "",
    user?.firstName ?? "",
    user?.lastName ?? "",
    user?.email ?? "",
    user?.phone ?? "",
  ]
    .join(" ")
    .toLowerCase();
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
  const [registerOwnerFleet, setRegisterOwnerFleet] = useState(false);
  const [ownerBikes, setOwnerBikes] = useState<OwnerBikeDraft[]>([emptyOwnerBike()]);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [bikeRiderId, setBikeRiderId] = useState<number | null>(null);
  const [bikeRiderSearch, setBikeRiderSearch] = useState("");
  const [bikeRiders, setBikeRiders] = useState<RiderUserRow[]>([]);
  const [loadingBikeRiders, setLoadingBikeRiders] = useState(false);
  const [userStationId, setUserStationId] = useState<number | null>(null);
  const [userStationSearch, setUserStationSearch] = useState("");
  const [userStations, setUserStations] = useState<StationListRow[]>([]);
  const [loadingUserStations, setLoadingUserStations] = useState(false);
  const [incidentSwapId, setIncidentSwapId] = useState<number | null>(null);
  const [incidentSwapSearch, setIncidentSwapSearch] = useState("");
  const [incidentSwaps, setIncidentSwaps] = useState<SwapListRow[]>([]);
  const [loadingIncidentSwaps, setLoadingIncidentSwaps] = useState(false);
  const [drawerTab, setDrawerTab] = useState("details");

  const drawerTabs = useMemo((): SlideOverDrawerTab[] => {
    if (section === "bikes") {
      return [
        { id: "details", label: "Bike details" },
        { id: "assignment", label: "Assignment" },
      ];
    }
    if (section === "owners") {
      return [
        { id: "details", label: "Owner details" },
        { id: "fleet", label: "Fleet bikes" },
      ];
    }
    if (section === "stations") {
      return [
        { id: "details", label: "Station details" },
        { id: "location", label: "Location" },
      ];
    }
    if (section === "users") {
      const tabs: SlideOverDrawerTab[] = [{ id: "details", label: "Account" }];
      const accountType = values.type?.trim();
      if (accountType === "rider") {
        tabs.push({ id: "fleet", label: "Fleet owner" });
      }
      if (accountType === "swapper") {
        tabs.push({ id: "station", label: "Station" });
      }
      return tabs;
    }
    if (section === "incidents") {
      return [
        { id: "details", label: "Incident details" },
        { id: "swap", label: "Related swap" },
      ];
    }
    return [];
  }, [section, values.type]);

  const useDrawerTabs =
    section === "users" || section === "incidents" ? drawerTabs.length > 1 : drawerTabs.length > 0;

  useEffect(() => {
    const cfg = getCreateConfig(section);
    if (open && cfg) {
      setValues(emptyValues(cfg));
      setFiles(emptyFileState(cfg.fields));
      setError(null);
      setWalletOwnerId(null);
      setWalletOwnerSearch("");
      setAgentUserId(null);
      setAgentUserSearch("");
      setRegisterOwnerFleet(false);
      setOwnerBikes([emptyOwnerBike()]);
      setBikeRiderId(null);
      setBikeRiderSearch("");
      setUserStationId(null);
      setUserStationSearch("");
      setIncidentSwapId(null);
      setIncidentSwapSearch("");
      setDrawerTab("details");
    }
  }, [open, section]);

  useEffect(() => {
    if (!open || section !== "users") {
      return;
    }
    const accountType = values.type?.trim();
    if (drawerTab === "fleet" && accountType !== "rider") {
      setDrawerTab("details");
    }
    if (drawerTab === "station" && accountType !== "swapper") {
      setDrawerTab("details");
    }
  }, [drawerTab, open, section, values.type]);

  useEffect(() => {
    if (!open || (section !== "wallets" && section !== "bikes" && section !== "users")) {
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
    if (!open || section !== "users") {
      return;
    }

    let active = true;
    setLoadingUserStations(true);

    const load = async () => {
      try {
        const response = await authFetch("/stations");
        if (!response.ok) {
          if (active) {
            setUserStations([]);
            setError(await userMessageFromResponse("load", response));
          }
          return;
        }
        const data = (await response.json()) as unknown;
        if (!active) {
          return;
        }
        setUserStations(Array.isArray(data) ? (data as StationListRow[]) : []);
        setError(null);
      } catch {
        if (active) {
          setUserStations([]);
          setError(userMessageForNetwork("load"));
        }
      } finally {
        if (active) {
          setLoadingUserStations(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [open, section]);

  useEffect(() => {
    if (!open || section !== "incidents") {
      return;
    }

    let active = true;
    setLoadingIncidentSwaps(true);

    const load = async () => {
      try {
        const response = await authFetch("/swaps");
        if (!response.ok) {
          if (active) {
            setIncidentSwaps([]);
            setError(await userMessageFromResponse("load", response));
          }
          return;
        }
        const data = (await response.json()) as unknown;
        if (!active) {
          return;
        }
        const rows = Array.isArray(data) ? (data as SwapListRow[]) : [];
        setIncidentSwaps(rows.filter((row) => row.status !== "cancelled" && row.status !== "reversed"));
        setError(null);
      } catch {
        if (active) {
          setIncidentSwaps([]);
          setError(userMessageForNetwork("load"));
        }
      } finally {
        if (active) {
          setLoadingIncidentSwaps(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [open, section]);

  useEffect(() => {
    if (!open || section !== "bikes") {
      return;
    }

    let active = true;
    setLoadingBikeRiders(true);

    const load = async () => {
      try {
        const response = await authFetch("/users?type=rider");
        if (!response.ok) {
          if (active) {
            setBikeRiders([]);
            setError(await userMessageFromResponse("load", response));
          }
          return;
        }
        const data = (await response.json()) as unknown;
        if (!active) {
          return;
        }
        setBikeRiders(Array.isArray(data) ? (data as RiderUserRow[]) : []);
        setError(null);
      } catch {
        if (active) {
          setBikeRiders([]);
          setError(userMessageForNetwork("load"));
        }
      } finally {
        if (active) {
          setLoadingBikeRiders(false);
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
    return recentPickerOptions(
      walletOwners,
      walletOwnerSearch,
      walletOwnerId,
      (owner, needle) => ownerListSearchHaystack(owner).includes(needle),
      section === "bikes" || section === "users",
    );
  }, [section, walletOwnerId, walletOwnerSearch, walletOwners]);

  const filteredBikeRiders = useMemo(() => {
    return recentPickerOptions(
      bikeRiders,
      bikeRiderSearch,
      bikeRiderId,
      (user, needle) => {
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
      },
      true,
    );
  }, [bikeRiderId, bikeRiderSearch, bikeRiders]);

  const selectedWalletOwner = useMemo(
    () => (walletOwnerId != null ? walletOwners.find((o) => o.id === walletOwnerId) : undefined),
    [walletOwnerId, walletOwners],
  );

  const selectedBikeRider = useMemo(
    () => (bikeRiderId != null ? bikeRiders.find((user) => user.id === bikeRiderId) : undefined),
    [bikeRiderId, bikeRiders],
  );

  const filteredUserStations = useMemo(
    () =>
      recentPickerOptions(
        userStations,
        userStationSearch,
        userStationId,
        (station, needle) => stationSearchHaystack(station).includes(needle),
        true,
      ),
    [userStationId, userStationSearch, userStations],
  );

  const selectedUserStation = useMemo(
    () => (userStationId != null ? userStations.find((station) => station.id === userStationId) : undefined),
    [userStationId, userStations],
  );

  const filteredIncidentSwaps = useMemo(
    () =>
      recentPickerOptions(
        incidentSwaps,
        incidentSwapSearch,
        incidentSwapId,
        (swap, needle) => swapSearchHaystack(swap).includes(needle),
        true,
      ),
    [incidentSwapId, incidentSwapSearch, incidentSwaps],
  );

  const selectedIncidentSwap = useMemo(
    () => (incidentSwapId != null ? incidentSwaps.find((swap) => swap.id === incidentSwapId) : undefined),
    [incidentSwapId, incidentSwaps],
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

  const needsOwnerPicker = config.section === "wallets";
  const bikeOwnerPicker = config.section === "bikes";
  const userCreateIsRider = config.section === "users" && values.type?.trim() === "rider";
  const userCreateIsSwapper = config.section === "users" && values.type?.trim() === "swapper";

  const submitDisabled =
    saving ||
    (needsOwnerPicker && (walletOwnerId === null || loadingWalletUsers)) ||
    (bikeOwnerPicker && (loadingWalletUsers || loadingBikeRiders)) ||
    (config.section === "agents" && (agentUserId === null || loadingAgentUsers));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    if (needsOwnerPicker && walletOwnerId === null) {
      setError("Select a fleet owner.");
      setSaving(false);
      return;
    }

    if (config.section === "agents") {
      if (agentUserId === null) {
        setError("Select an agent user account.");
        setSaving(false);
        return;
      }
    }

    if (userCreateIsRider && walletOwnerId === null) {
      setError("Select a fleet owner on the Fleet owner tab.");
      setDrawerTab("fleet");
      setSaving(false);
      return;
    }

    let ownerBikesPayload: Record<string, string>[] | undefined;
    if (config.section === "owners" && registerOwnerFleet) {
      const bikes = buildOwnerBikesPayload(ownerBikes);
      if (bikes === null) {
        setError("Each fleet bike needs a plate number, serial number, and model.");
        setSaving(false);
        return;
      }
      if (bikes.length === 0) {
        setError("Add at least one fleet bike, or turn off fleet registration.");
        setSaving(false);
        return;
      }
      ownerBikesPayload = bikes;
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
      } else if (config.section === "bikes") {
        body = buildCreatePayload(config, values);
        if (walletOwnerId !== null) {
          body.ownerId = walletOwnerId;
        }
        if (bikeRiderId !== null) {
          body.userId = bikeRiderId;
        }
      } else if (config.section === "inventory") {
        const kind = values.kind?.trim() === "battery" ? "battery" : "bike";
        body = buildCreatePayload(config, values);
        if (kind === "bike") {
          if (!String(body.plateNumber ?? "").trim() || !String(body.model ?? "").trim()) {
            setError("Bikes need a plate number and model.");
            setSaving(false);
            return;
          }
        }
        delete body.kind;
      } else if (config.section === "agents") {
        body = { userId: agentUserId };
        const currencyRaw = values.currency?.trim() ?? "";
        if (currencyRaw) {
          body.currency = currencyRaw;
        }
      } else if (config.section === "owners") {
        body = buildCreatePayload(config, values);
        if (ownerBikesPayload?.length) {
          body.bikes = ownerBikesPayload;
        }
      } else if (config.section === "users") {
        body = buildCreatePayload(config, values);
        if (userCreateIsRider && walletOwnerId !== null) {
          body.ownerId = walletOwnerId;
        }
        if (userCreateIsSwapper && userStationId !== null) {
          body.stationId = userStationId;
        }
      } else if (config.section === "incidents") {
        body = buildCreatePayload(config, values);
        if (incidentSwapId !== null) {
          body.swapTransactionId = incidentSwapId;
        }
      } else {
        body = buildCreatePayload(config, values);
      }

      await mergeUploadedFiles(config.fields, files, body);

      let postPath = config.apiPath;
      if (config.section === "inventory") {
        const kind = values.kind?.trim() === "battery" ? "battery" : "bike";
        postPath = kind === "battery" ? "/inventory/receive/battery" : "/inventory/receive/bike";
      }

      const response = await authFetch(postPath, {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const message = await userMessageFromResponse("create", response);
        setError(message);
        onError?.(message);
        return;
      }

      let created: Record<string, unknown> | undefined;
      try {
        const data: unknown = await response.json();
        if (data !== null && typeof data === "object" && !Array.isArray(data)) {
          created = data as Record<string, unknown>;
        }
      } catch {
        created = undefined;
      }

      onCreated?.(created);
      onClose();
    } catch {
      setError(userMessageForNetwork("create"));
      onError?.(userMessageForNetwork("create"));
    } finally {
      setSaving(false);
    }
  };

  const formId = `create-resource-${section}`;

  const showDrawerPanel = (panelId: string) => !useDrawerTabs || drawerTab === panelId;

  const formFields = config.fields;

  return (
    <SlideOverDrawer
      open={open}
      title={config.title}
      description={config.description}
      onClose={onClose}
      tabs={useDrawerTabs ? drawerTabs : undefined}
      activeTab={drawerTab}
      onTabChange={setDrawerTab}
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

        {config.section === "agents" && showDrawerPanel("details") ? (
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

        {config.section === "users" && showDrawerPanel("fleet") && !userCreateIsRider ? (
          <p className="sub">
            Fleet owner association applies to <strong>rider</strong> accounts. Choose role type <strong>rider</strong> on
            the Account tab first.
          </p>
        ) : null}

        {config.section === "users" && showDrawerPanel("station") && !userCreateIsSwapper ? (
          <p className="sub">
            Station assignment applies to <strong>swapper</strong> accounts. Choose role type <strong>swapper</strong> on the
            Account tab first.
          </p>
        ) : null}

        {config.section === "users" && showDrawerPanel("station") && userCreateIsSwapper ? (
          <>
            <p className="sub">Optional — assign the swap station this operator works from.</p>
            <label className="field">
              <span>
                Find station
                <span className="sub">
                  {" "}
                  (showing {RECENT_PICKER_LIMIT} most recent, search for more)
                </span>
              </span>
              <input
                type="search"
                value={userStationSearch}
                disabled={saving || loadingUserStations}
                onChange={(event) => setUserStationSearch(event.target.value)}
                placeholder="Search by code, name, or ID…"
                autoComplete="off"
                aria-label="Search stations"
              />
            </label>
            {loadingUserStations ? (
              <p className="sub">Loading stations…</p>
            ) : (
              <label className="field">
                <span>
                  Station ({filteredUserStations.length} shown
                  {!userStationSearch.trim() ? ` · ${RECENT_PICKER_LIMIT} most recent` : ""})
                </span>
                <select
                  value={userStationId != null ? String(userStationId) : ""}
                  disabled={saving || filteredUserStations.length === 0}
                  onChange={(event) => {
                    const v = event.target.value;
                    setUserStationId(v === "" ? null : Number(v));
                  }}
                  size={Math.min(8, Math.max(4, filteredUserStations.length || 4))}
                  className="station-picker create-wallet-user-select"
                  aria-label="Select station"
                >
                  <option value="">{filteredUserStations.length === 0 ? "No matches" : "Unassigned"}</option>
                  {filteredUserStations.map((station) => (
                    <option key={station.id} value={String(station.id)}>
                      {stationOptionLine(station)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {selectedUserStation ? (
              <p className="create-wallet-selection sub" role="status">
                <strong>Selected:</strong> {stationOptionLine(selectedUserStation)}
              </p>
            ) : null}
          </>
        ) : null}

        {needsOwnerPicker ||
        (bikeOwnerPicker && (!useDrawerTabs || showDrawerPanel("assignment"))) ||
        (config.section === "users" && showDrawerPanel("fleet") && userCreateIsRider) ? (
          <>
            <label className="field">
              <span>
                Find owner
                {needsOwnerPicker || (config.section === "users" && userCreateIsRider) ? (
                  <>
                    <span className="col-required" aria-hidden="true">
                      {" "}
                      *
                    </span>
                    <span className="sr-only"> (required)</span>
                  </>
                ) : (
                  <span className="sub">
                    {" "}
                    (optional — leave unset for warehouse
                    {bikeOwnerPicker || config.section === "users" ? `; showing ${RECENT_PICKER_LIMIT} most recent, search for more` : ""})
                  </span>
                )}
              </span>
              <input
                type="search"
                value={walletOwnerSearch}
                disabled={saving || loadingWalletUsers}
                onChange={(event) => setWalletOwnerSearch(event.target.value)}
                placeholder="Search by name, email, or phone…"
                autoComplete="off"
                aria-label="Search fleet owners"
              />
            </label>
            {loadingWalletUsers ? (
              <p className="sub">Loading owners…</p>
            ) : (
              <label className="field">
                <span>
                  Fleet owner ({filteredWalletOwners.length} shown
                  {(bikeOwnerPicker || config.section === "users") && !walletOwnerSearch.trim()
                    ? ` · ${RECENT_PICKER_LIMIT} most recent`
                    : ""}
                  )
                  {needsOwnerPicker || (config.section === "users" && userCreateIsRider) ? (
                    <>
                      <span className="col-required" aria-hidden="true">
                        {" "}
                        *
                      </span>
                      <span className="sr-only"> (required)</span>
                    </>
                  ) : null}
                </span>
                <select
                  value={walletOwnerId != null ? String(walletOwnerId) : ""}
                  disabled={saving || filteredWalletOwners.length === 0}
                  required={needsOwnerPicker || (config.section === "users" && userCreateIsRider)}
                  onChange={(event) => {
                    const v = event.target.value;
                    setWalletOwnerId(v === "" ? null : Number(v));
                  }}
                  size={Math.min(8, Math.max(4, filteredWalletOwners.length || 4))}
                  className="station-picker create-wallet-user-select"
                  aria-label="Select fleet owner"
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

        {config.section === "incidents" && showDrawerPanel("swap") ? (
          <>
            <p className="sub">Optional — link this report to a swap if the damage was noticed during a handover.</p>
            <label className="field">
              <span>Find swap</span>
              <input
                type="search"
                value={incidentSwapSearch}
                disabled={saving || loadingIncidentSwaps}
                onChange={(event) => setIncidentSwapSearch(event.target.value)}
                placeholder="Search by rider name or phone…"
                autoComplete="off"
                aria-label="Search swaps by rider"
              />
            </label>
            {loadingIncidentSwaps ? (
              <p className="sub">Loading swaps…</p>
            ) : (
              <label className="field">
                <span>
                  Swap ({filteredIncidentSwaps.length} shown
                  {!incidentSwapSearch.trim() ? ` · ${RECENT_PICKER_LIMIT} most recent` : ""})
                </span>
                <select
                  value={incidentSwapId != null ? String(incidentSwapId) : ""}
                  disabled={saving || filteredIncidentSwaps.length === 0}
                  onChange={(event) => {
                    const v = event.target.value;
                    setIncidentSwapId(v === "" ? null : Number(v));
                  }}
                  size={Math.min(8, Math.max(4, filteredIncidentSwaps.length || 4))}
                  className="station-picker create-wallet-user-select"
                  aria-label="Select related swap"
                >
                  <option value="">
                    {filteredIncidentSwaps.length === 0 ? "No matches" : "No swap linked"}
                  </option>
                  {filteredIncidentSwaps.map((swap) => (
                    <option key={swap.id} value={String(swap.id)}>
                      {swapOptionLine(swap)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {selectedIncidentSwap ? (
              <p className="create-wallet-selection sub" role="status">
                <strong>Selected:</strong> {swapOptionLine(selectedIncidentSwap)}
              </p>
            ) : null}
          </>
        ) : null}

        {config.section === "bikes" && showDrawerPanel("assignment") ? (
          <>
            <p className="sub">Optional rider assignment. Leave unset if the bike has no rider yet.</p>
            <label className="field">
              <span>Find rider</span>
              <input
                type="search"
                value={bikeRiderSearch}
                disabled={saving || loadingBikeRiders}
                onChange={(event) => setBikeRiderSearch(event.target.value)}
                placeholder="Search by name, username, email, or phone…"
                autoComplete="off"
                aria-label="Search riders"
              />
            </label>
            {loadingBikeRiders ? (
              <p className="sub">Loading riders…</p>
            ) : (
              <label className="field">
                <span>
                  Rider ({filteredBikeRiders.length} shown
                  {!bikeRiderSearch.trim() ? ` · ${RECENT_PICKER_LIMIT} most recent` : ""})
                </span>
                <select
                  value={bikeRiderId != null ? String(bikeRiderId) : ""}
                  disabled={saving || filteredBikeRiders.length === 0}
                  onChange={(event) => {
                    const v = event.target.value;
                    setBikeRiderId(v === "" ? null : Number(v));
                  }}
                  size={Math.min(8, Math.max(4, filteredBikeRiders.length || 4))}
                  className="station-picker create-wallet-user-select"
                  aria-label="Select rider"
                >
                  <option value="">{filteredBikeRiders.length === 0 ? "No matches" : "No rider assigned"}</option>
                  {filteredBikeRiders.map((user) => (
                    <option key={user.id} value={String(user.id)}>
                      {riderUserOptionLine(user)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {selectedBikeRider ? (
              <p className="create-wallet-selection sub" role="status">
                <strong>Selected:</strong> {riderUserOptionLine(selectedBikeRider)}
              </p>
            ) : null}
          </>
        ) : null}

        {config.section === "stations" && (!useDrawerTabs || showDrawerPanel("location")) ? (
          <PlacesLocationPicker disabled={saving} onPlaceSelected={onStationPlaceSelected} />
        ) : null}

        {(!useDrawerTabs || showDrawerPanel("details"))
          ? formFields.map((field) => (
              <ResourceFormField
                key={field.name}
                field={field}
                value={values[field.name] ?? ""}
                disabled={saving}
                onValueChange={(next) => setValues({ ...values, [field.name]: next })}
                file={files[field.name] ?? null}
                onFileChange={(next) => setFiles({ ...files, [field.name]: next })}
              />
            ))
          : null}

        {config.section === "owners" && (!useDrawerTabs || showDrawerPanel("fleet")) ? (
          <div className="owner-fleet-block">
            <label className="field field-checkbox">
              <input
                type="checkbox"
                checked={registerOwnerFleet}
                disabled={saving}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setRegisterOwnerFleet(checked);
                  if (checked && ownerBikes.length === 0) {
                    setOwnerBikes([emptyOwnerBike()]);
                  }
                }}
              />
              <span>Register fleet bikes for this owner</span>
            </label>
            {registerOwnerFleet ? (
              <p className="sub">Each bike is linked to the new owner automatically.</p>
            ) : null}
            {registerOwnerFleet
              ? ownerBikes.map((draft, index) => (
                  <fieldset key={index} className="owner-fleet-bike" disabled={saving}>
                    <legend className="sub">Bike {index + 1}</legend>
                    <label className="field">
                      <span>
                        Plate number
                        <span className="col-required" aria-hidden="true">
                          {" "}
                          *
                        </span>
                      </span>
                      <input
                        type="text"
                        value={draft.plateNumber}
                        onChange={(event) => {
                          const plateNumber = event.target.value;
                          setOwnerBikes((rows) =>
                            rows.map((row, i) => (i === index ? { ...row, plateNumber } : row)),
                          );
                        }}
                        autoComplete="off"
                      />
                    </label>
                    <label className="field">
                      <span>
                        Serial number
                        <span className="col-required" aria-hidden="true">
                          {" "}
                          *
                        </span>
                      </span>
                      <input
                        type="text"
                        value={draft.serialNumber}
                        onChange={(event) => {
                          const serialNumber = event.target.value;
                          setOwnerBikes((rows) =>
                            rows.map((row, i) => (i === index ? { ...row, serialNumber } : row)),
                          );
                        }}
                        autoComplete="off"
                      />
                    </label>
                    <label className="field">
                      <span>
                        Model
                        <span className="col-required" aria-hidden="true">
                          {" "}
                          *
                        </span>
                      </span>
                      <input
                        type="text"
                        value={draft.model}
                        onChange={(event) => {
                          const model = event.target.value;
                          setOwnerBikes((rows) => rows.map((row, i) => (i === index ? { ...row, model } : row)));
                        }}
                        autoComplete="off"
                      />
                    </label>
                    <label className="field">
                      <span>Chassis number</span>
                      <input
                        type="text"
                        value={draft.chassisNumber}
                        onChange={(event) => {
                          const chassisNumber = event.target.value;
                          setOwnerBikes((rows) =>
                            rows.map((row, i) => (i === index ? { ...row, chassisNumber } : row)),
                          );
                        }}
                        autoComplete="off"
                      />
                    </label>
                    {ownerBikes.length > 1 ? (
                      <button
                        type="button"
                        className="btn"
                        onClick={() => setOwnerBikes((rows) => rows.filter((_, i) => i !== index))}
                      >
                        Remove bike
                      </button>
                    ) : null}
                  </fieldset>
                ))
              : null}
            {registerOwnerFleet ? (
              <button
                type="button"
                className="btn"
                disabled={saving}
                onClick={() => setOwnerBikes((rows) => [...rows, emptyOwnerBike()])}
              >
                Add another bike
              </button>
            ) : null}
          </div>
        ) : null}
      </form>
    </SlideOverDrawer>
  );
}
