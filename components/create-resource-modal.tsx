"use client";

import { useT } from "./locale";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { authFetch } from "../lib/auth";
import { userMessageForNetwork, userMessageFromResponse } from "../lib/api-errors";
import { batteryMayBeAssigned } from "../lib/battery-status";
import { getDefaultCreatePassword } from "../lib/default-password";
import { buildCreatePayload, getCreateConfig, type CreateResourceConfig } from "../lib/resource-create-config";
import { localizeCreateConfig } from "../lib/i18n/localize";
import { emptyFileState, mergeUploadedFiles } from "../lib/resource-form-files";
import type { Section } from "../lib/nav";
import { PlacesLocationPicker } from "./places-location-picker";
import { ResourceFormField } from "./resource-form-field";
import { ownerListSearchHaystack, ownerOptionLine, type OwnerListRow } from "../lib/owner-list-format";
import { RECENT_PICKER_LIMIT, recentPickerOptions } from "../lib/recent-picker";
import { STATION_LOCATION_FIELD_NAMES } from "../lib/station-form-fields";
import { usersListPath } from "../lib/users-list-query";
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

type SwapperUserRow = {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  createdAt?: string | null;
  stationId?: number | null;
  assignedStation?: { id: number; name: string; code: string } | null;
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

type BikeCreateListRow = {
  id: number;
  plateNumber: string;
  serialNumber: string;
  model: string;
  status?: string;
  ownerId?: number | null;
  currentBatteryId?: number | null;
};

type BatteryCreateAttachTarget = "inventory" | "station" | "bike";

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
    config.fields.map((field) => [
      field.name,
      field.type === "password" ? defaultPassword : (field.defaultValue ?? ""),
    ]),
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

function swapperUserOptionLine(user: SwapperUserRow): string {
  const base = agentUserOptionLine(user);
  const station = user.assignedStation;
  return station ? `${base} · ${station.code}` : base;
}

function stationOptionLine(station: StationListRow): string {
  const base = `${station.code} — ${station.name}`;
  return station.status && station.status !== "active" ? `${base} (${station.status})` : base;
}

function stationSearchHaystack(station: StationListRow): string {
  return [station.code, station.name, station.status ?? "", String(station.id)].join(" ").toLowerCase();
}

function bikeEligibleForFleetAttach(bike: BikeCreateListRow): boolean {
  return bike.ownerId != null && bike.currentBatteryId == null;
}

function bikeCreateOptionLine(bike: BikeCreateListRow): string {
  const status = bike.status && bike.status !== "active" ? ` · ${bike.status}` : "";
  return `${bike.id} · ${bike.plateNumber} — ${bike.model} · ${bike.serialNumber}${status}`;
}

function bikeCreateSearchHaystack(bike: BikeCreateListRow): string {
  return [
    String(bike.id),
    bike.plateNumber,
    bike.serialNumber,
    bike.model,
    bike.status ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

function swapRiderLabel(user: SwapListUser | null | undefined, unknownRider: string): string {
  if (!user) {
    return unknownRider;
  }
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name ? `${name} (@${user.username})` : `@${user.username}`;
}

function swapOptionLine(swap: SwapListRow, unknownRider: string): string {
  const rider = swapRiderLabel(swap.user, unknownRider);
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
  const t = useT();
  const config = useMemo(() => {
    const raw = getCreateConfig(section);
    return raw ? localizeCreateConfig(raw, t) : null;
  }, [section, t]);
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
  const [stationSwapperId, setStationSwapperId] = useState<number | null>(null);
  const [stationSwapperSearch, setStationSwapperSearch] = useState("");
  const [stationSwappers, setStationSwappers] = useState<SwapperUserRow[]>([]);
  const [loadingStationSwappers, setLoadingStationSwappers] = useState(false);
  const [incidentSwapId, setIncidentSwapId] = useState<number | null>(null);
  const [incidentSwapSearch, setIncidentSwapSearch] = useState("");
  const [incidentSwaps, setIncidentSwaps] = useState<SwapListRow[]>([]);
  const [loadingIncidentSwaps, setLoadingIncidentSwaps] = useState(false);
  const [batteryAttachTarget, setBatteryAttachTarget] = useState<BatteryCreateAttachTarget>("inventory");
  const [batteryCreateStationId, setBatteryCreateStationId] = useState<number | null>(null);
  const [batteryCreateStationSearch, setBatteryCreateStationSearch] = useState("");
  const [batteryCreateStations, setBatteryCreateStations] = useState<StationListRow[]>([]);
  const [loadingBatteryCreateStations, setLoadingBatteryCreateStations] = useState(false);
  const [batteryCreateBikeId, setBatteryCreateBikeId] = useState<number | null>(null);
  const [batteryCreateBikeSearch, setBatteryCreateBikeSearch] = useState("");
  const [batteryCreateBikes, setBatteryCreateBikes] = useState<BikeCreateListRow[]>([]);
  const [loadingBatteryCreateBikes, setLoadingBatteryCreateBikes] = useState(false);
  const [drawerTab, setDrawerTab] = useState("details");

  const drawerTabs = useMemo((): SlideOverDrawerTab[] => {
    if (section === "bikes") {
      return [
        { id: "details", label: t("create.drawer.tab.bikeDetails") },
        { id: "assignment", label: t("create.drawer.tab.assignment") },
      ];
    }
    if (section === "owners") {
      return [
        { id: "details", label: t("create.drawer.tab.ownerDetails") },
        { id: "fleet", label: t("create.drawer.tab.fleetBikes") },
      ];
    }
    if (section === "stations") {
      return [
        { id: "details", label: t("create.drawer.tab.stationDetails") },
        { id: "location", label: t("create.drawer.tab.location") },
        { id: "swapper", label: t("create.drawer.tab.assignSwapper") },
      ];
    }
    if (section === "users") {
      const tabs: SlideOverDrawerTab[] = [{ id: "details", label: t("create.drawer.tab.account") }];
      const accountType = values.type?.trim();
      if (accountType === "rider") {
        tabs.push({ id: "fleet", label: t("create.drawer.tab.fleetOwner") });
      }
      if (accountType === "swapper") {
        tabs.push({ id: "station", label: t("create.drawer.tab.station") });
      }
      return tabs;
    }
    if (section === "incidents") {
      return [
        { id: "details", label: t("create.drawer.tab.incidentDetails") },
        { id: "swap", label: t("create.drawer.tab.relatedSwap") },
      ];
    }
    if (section === "batteries") {
      const tabs: SlideOverDrawerTab[] = [
        { id: "details", label: t("create.drawer.tab.batteryDetails") },
      ];
      if (batteryAttachTarget === "station" || batteryAttachTarget === "bike") {
        tabs.push({ id: "attach", label: t("create.drawer.tab.attachTarget") });
      }
      return tabs;
    }
    return [];
  }, [batteryAttachTarget, section, t, values.type]);

  const useDrawerTabs =
    section === "users" || section === "incidents" || section === "batteries"
      ? drawerTabs.length > 1
      : drawerTabs.length > 0;

  const batteryCreateStatus = section === "batteries" ? values.status?.trim() ?? "" : "";
  const batteryCreateOffline = batteryCreateStatus === "offline";

  useEffect(() => {
    if (!open || section !== "batteries" || !batteryCreateOffline) {
      return;
    }
    if (batteryAttachTarget !== "inventory") {
      setBatteryAttachTarget("inventory");
    }
  }, [batteryAttachTarget, batteryCreateOffline, open, section]);

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
      setStationSwapperId(null);
      setStationSwapperSearch("");
      setIncidentSwapId(null);
      setIncidentSwapSearch("");
      setBatteryAttachTarget("inventory");
      setBatteryCreateStationId(null);
      setBatteryCreateStationSearch("");
      setBatteryCreateBikeId(null);
      setBatteryCreateBikeSearch("");
      setDrawerTab("details");
    }
  }, [open, section]);

  useEffect(() => {
    if (!open || section !== "batteries") {
      return;
    }
    if (batteryAttachTarget === "inventory") {
      setBatteryCreateStationId(null);
      setBatteryCreateBikeId(null);
      return;
    }
    setDrawerTab("attach");
  }, [batteryAttachTarget, open, section]);

  useEffect(() => {
    if (!open || section !== "batteries") {
      return;
    }
    if (batteryAttachTarget === "inventory" && drawerTab === "attach") {
      setDrawerTab("details");
    }
  }, [batteryAttachTarget, drawerTab, open, section]);

  useEffect(() => {
    if (!open || section !== "batteries" || batteryAttachTarget !== "station") {
      return;
    }

    let active = true;
    setLoadingBatteryCreateStations(true);

    const load = async () => {
      try {
        const response = await authFetch("/stations");
        if (!response.ok) {
          if (active) {
            setBatteryCreateStations([]);
            setError(await userMessageFromResponse("load", response));
          }
          return;
        }
        const data = (await response.json()) as unknown;
        if (!active) {
          return;
        }
        setBatteryCreateStations(Array.isArray(data) ? (data as StationListRow[]) : []);
        setError(null);
      } catch {
        if (active) {
          setBatteryCreateStations([]);
          setError(userMessageForNetwork("load"));
        }
      } finally {
        if (active) {
          setLoadingBatteryCreateStations(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [batteryAttachTarget, open, section]);

  useEffect(() => {
    if (!open || section !== "batteries" || batteryAttachTarget !== "bike") {
      return;
    }

    let active = true;
    setLoadingBatteryCreateBikes(true);

    const load = async () => {
      try {
        const response = await authFetch("/bikes");
        if (!response.ok) {
          if (active) {
            setBatteryCreateBikes([]);
            setError(await userMessageFromResponse("load", response));
          }
          return;
        }
        const data = (await response.json()) as unknown;
        if (!active) {
          return;
        }
        const rows = Array.isArray(data) ? (data as BikeCreateListRow[]) : [];
        if (active) {
          setBatteryCreateBikes(rows.filter(bikeEligibleForFleetAttach));
          setError(null);
        }
      } catch {
        if (active) {
          setBatteryCreateBikes([]);
          setError(userMessageForNetwork("load"));
        }
      } finally {
        if (active) {
          setLoadingBatteryCreateBikes(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [batteryAttachTarget, open, section]);

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
    if (!open || section !== "stations") {
      return;
    }

    let active = true;
    setLoadingStationSwappers(true);

    const load = async () => {
      try {
        const response = await authFetch(usersListPath("swapper"));
        if (!response.ok) {
          if (active) {
            setStationSwappers([]);
            setError(await userMessageFromResponse("load", response));
          }
          return;
        }
        const data = (await response.json()) as unknown;
        if (!active) {
          return;
        }
        setStationSwappers(Array.isArray(data) ? (data as SwapperUserRow[]) : []);
        setError(null);
      } catch {
        if (active) {
          setStationSwappers([]);
          setError(userMessageForNetwork("load"));
        }
      } finally {
        if (active) {
          setLoadingStationSwappers(false);
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
        const response = await authFetch(usersListPath("rider"));
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
          authFetch(usersListPath("agent")),
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

  const filteredStationSwappers = useMemo(
    () =>
      recentPickerOptions(
        stationSwappers,
        stationSwapperSearch,
        stationSwapperId,
        (user, needle) => {
          const haystack = [
            user.username,
            user.firstName,
            user.lastName,
            user.email,
            user.phone ?? "",
            user.assignedStation?.code ?? "",
            user.assignedStation?.name ?? "",
            String(user.id),
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(needle);
        },
        true,
      ),
    [stationSwapperId, stationSwapperSearch, stationSwappers],
  );

  const selectedStationSwapper = useMemo(
    () =>
      stationSwapperId != null ? stationSwappers.find((user) => user.id === stationSwapperId) : undefined,
    [stationSwapperId, stationSwappers],
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

  const filteredBatteryCreateStations = useMemo(
    () =>
      recentPickerOptions(
        batteryCreateStations,
        batteryCreateStationSearch,
        batteryCreateStationId,
        (station, needle) => stationSearchHaystack(station).includes(needle),
        true,
      ),
    [batteryCreateStationId, batteryCreateStationSearch, batteryCreateStations],
  );

  const selectedBatteryCreateStation = useMemo(
    () =>
      batteryCreateStationId != null
        ? batteryCreateStations.find((station) => station.id === batteryCreateStationId)
        : undefined,
    [batteryCreateStationId, batteryCreateStations],
  );

  const filteredBatteryCreateBikes = useMemo(
    () =>
      recentPickerOptions(
        batteryCreateBikes,
        batteryCreateBikeSearch,
        batteryCreateBikeId,
        (bike, needle) => bikeCreateSearchHaystack(bike).includes(needle),
        true,
      ),
    [batteryCreateBikeId, batteryCreateBikeSearch, batteryCreateBikes],
  );

  const selectedBatteryCreateBike = useMemo(
    () =>
      batteryCreateBikeId != null
        ? batteryCreateBikes.find((bike) => bike.id === batteryCreateBikeId)
        : undefined,
    [batteryCreateBikeId, batteryCreateBikes],
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
      setError(t("create.error.selectFleetOwner"));
      setSaving(false);
      return;
    }

    if (config.section === "agents") {
      if (agentUserId === null) {
        setError(t("create.error.selectAgentUser"));
        setSaving(false);
        return;
      }
    }

    if (userCreateIsRider && walletOwnerId === null) {
      setError(t("create.error.selectFleetOwnerTab"));
      setDrawerTab("fleet");
      setSaving(false);
      return;
    }

    if (
      config.section === "batteries" &&
      !batteryMayBeAssigned(batteryCreateStatus) &&
      batteryAttachTarget !== "inventory"
    ) {
      setError(t("create.error.batteryOfflineNoAssign"));
      setDrawerTab("details");
      setSaving(false);
      return;
    }

    if (config.section === "batteries" && batteryAttachTarget === "station" && batteryCreateStationId === null) {
      setError(t("create.error.selectAttachStation"));
      setDrawerTab("attach");
      setSaving(false);
      return;
    }

    if (config.section === "batteries" && batteryAttachTarget === "bike" && batteryCreateBikeId === null) {
      setError(t("create.error.selectAttachBike"));
      setDrawerTab("attach");
      setSaving(false);
      return;
    }

    let ownerBikesPayload: Record<string, string>[] | undefined;
    if (config.section === "owners" && registerOwnerFleet) {
      const bikes = buildOwnerBikesPayload(ownerBikes);
      if (bikes === null) {
        setError(t("create.error.fleetBikeFields"));
        setSaving(false);
        return;
      }
      if (bikes.length === 0) {
        setError(t("create.error.fleetBikeMin"));
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
            setError(t("create.error.bikePlateModel"));
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

      if (config.section === "stations" && stationSwapperId !== null && created?.id != null) {
        const newStationId = Number(created.id);
        if (!Number.isNaN(newStationId)) {
          const assignResponse = await authFetch(`/users/${stationSwapperId}`, {
            method: "PATCH",
            body: JSON.stringify({ stationId: newStationId }),
          });
          if (!assignResponse.ok) {
            const message = await userMessageFromResponse("create", assignResponse);
            const detail = t("create.error.stationCreatedSwapperAssign");
            setError(message ? `${detail} ${message}` : detail);
            onCreated?.(created);
            onError?.(detail);
            return;
          }
        }
      }

      if (config.section === "batteries" && created?.id != null && batteryAttachTarget !== "inventory") {
        const newBatteryId = Number(created.id);
        if (!Number.isNaN(newBatteryId)) {
          const attachBody: Record<string, number> =
            batteryAttachTarget === "station" && batteryCreateStationId != null
              ? { stationId: batteryCreateStationId }
              : batteryAttachTarget === "bike" && batteryCreateBikeId != null
                ? { bikeId: batteryCreateBikeId }
                : {};

          if (Object.keys(attachBody).length > 0) {
            const attachResponse = await authFetch(`/batteries/${newBatteryId}`, {
              method: "PATCH",
              body: JSON.stringify(attachBody),
            });
            if (!attachResponse.ok) {
              const message = await userMessageFromResponse("create", attachResponse);
              const detail = t("create.error.batteryCreatedAttachFailed");
              setError(message ? `${detail} ${message}` : detail);
              onCreated?.(created);
              onError?.(detail);
              return;
            }
            try {
              const attached: unknown = await attachResponse.json();
              if (attached !== null && typeof attached === "object" && !Array.isArray(attached)) {
                created = attached as Record<string, unknown>;
              }
            } catch {
              /* keep original created row */
            }
          }
        }
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
  const stationDetailFields =
    config.section === "stations"
      ? formFields.filter((field) => !STATION_LOCATION_FIELD_NAMES.has(field.name))
      : formFields;
  const stationLocationFields =
    config.section === "stations"
      ? formFields.filter((field) => STATION_LOCATION_FIELD_NAMES.has(field.name))
      : [];

  return (
    <SlideOverDrawer
      open={open}
      title={config.title}
      description={config.description ?? undefined}
      onClose={onClose}
      tabs={useDrawerTabs ? drawerTabs : undefined}
      activeTab={drawerTab}
      onTabChange={setDrawerTab}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="submit" form={formId} className="btn primary" disabled={submitDisabled}>
            {saving ? t("common.saving") : config.submitLabel}
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
            <p className="sub">{t("create.agents.intro")}</p>
            <label className="field">
              <span>{t("modals.picker.findAccount")}</span>
              <input
                type="search"
                value={agentUserSearch}
                disabled={saving || loadingAgentUsers}
                onChange={(event) => setAgentUserSearch(event.target.value)}
                placeholder={t("modals.picker.searchAgentAccount")}
                autoComplete="off"
                aria-label={t("modals.picker.searchAgentAccount")}
              />
            </label>
            {loadingAgentUsers ? (
              <p className="sub">{t("modals.picker.loadingAccounts")}</p>
            ) : (
              <label className="field">
                <span>{t("modals.picker.userAccountFloat", { count: filteredAgentUsers.length })}</span>
                <select
                  value={agentUserId != null ? String(agentUserId) : ""}
                  disabled={saving || filteredAgentUsers.length === 0}
                  onChange={(event) => {
                    const v = event.target.value;
                    setAgentUserId(v === "" ? null : Number(v));
                  }}
                  size={Math.min(8, Math.max(4, filteredAgentUsers.length || 4))}
                  className="station-picker create-wallet-user-select"
                  aria-label={t("modals.picker.findAccount")}
                >
                  <option value="">
                    {filteredAgentUsers.length === 0
                      ? t("modals.picker.noEligibleAccounts")
                      : t("modals.picker.chooseAccount")}
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
                {t("modals.picker.selectedPrefix")} <strong>{agentUserOptionLine(selectedAgentUser)}</strong>
              </p>
            ) : null}
          </>
        ) : null}

        {config.section === "users" && showDrawerPanel("fleet") && !userCreateIsRider ? (
          <p className="sub">{t("create.users.fleetTabHint")}</p>
        ) : null}

        {config.section === "users" && showDrawerPanel("station") && !userCreateIsSwapper ? (
          <p className="sub">{t("create.users.stationTabHint")}</p>
        ) : null}

        {config.section === "users" && showDrawerPanel("station") && userCreateIsSwapper ? (
          <>
            <p className="sub">{t("create.users.stationOptional")}</p>
            <label className="field">
              <span>
                {t("modals.picker.findStation")}
                <span className="sub"> {t("modals.picker.recentSearchHint", { limit: RECENT_PICKER_LIMIT })}</span>
              </span>
              <input
                type="search"
                value={userStationSearch}
                disabled={saving || loadingUserStations}
                onChange={(event) => setUserStationSearch(event.target.value)}
                placeholder={t("modals.picker.searchStation")}
                autoComplete="off"
                aria-label={t("modals.picker.searchStation")}
              />
            </label>
            {loadingUserStations ? (
              <p className="sub">{t("modals.picker.loadingStations")}</p>
            ) : (
              <label className="field">
                <span>
                  {t("modals.picker.station")} ({t("modals.picker.shownCount", { count: filteredUserStations.length })}
                  {!userStationSearch.trim()
                    ? t("modals.picker.shownRecentSuffix", { limit: RECENT_PICKER_LIMIT })
                    : ""}
                  )
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
                  aria-label={t("modals.picker.station")}
                >
                  <option value="">
                    {filteredUserStations.length === 0 ? t("common.noMatches") : t("common.unassigned")}
                  </option>
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
                {t("modals.picker.selectedPrefix")} <strong>{stationOptionLine(selectedUserStation)}</strong>
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
                {t("modals.picker.findOwner")}
                {needsOwnerPicker || (config.section === "users" && userCreateIsRider) ? (
                  <>
                    <span className="col-required" aria-hidden="true">
                      {" "}
                      *
                    </span>
                    <span className="sr-only"> {t("common.requiredSr")}</span>
                  </>
                ) : (
                  <span className="sub">
                    {" "}
                    {t("modals.picker.optionalWarehouse")}
                    {bikeOwnerPicker || config.section === "users"
                      ? t("modals.picker.optionalWarehouseRecent", { limit: RECENT_PICKER_LIMIT })
                      : t("modals.picker.optionalWarehouseClose")}
                  </span>
                )}
              </span>
              <input
                type="search"
                value={walletOwnerSearch}
                disabled={saving || loadingWalletUsers}
                onChange={(event) => setWalletOwnerSearch(event.target.value)}
                placeholder={t("modals.picker.searchOwnerContact")}
                autoComplete="off"
                aria-label={t("modals.picker.searchOwnerContact")}
              />
            </label>
            {loadingWalletUsers ? (
              <p className="sub">{t("modals.picker.loadingOwners")}</p>
            ) : (
              <label className="field">
                <span>
                  {t("modals.picker.fleetOwner")} ({t("modals.picker.shownCount", { count: filteredWalletOwners.length })}
                  {(bikeOwnerPicker || config.section === "users") && !walletOwnerSearch.trim()
                    ? t("modals.picker.shownRecentSuffix", { limit: RECENT_PICKER_LIMIT })
                    : ""}
                  )
                  {needsOwnerPicker || (config.section === "users" && userCreateIsRider) ? (
                    <>
                      <span className="col-required" aria-hidden="true">
                        {" "}
                        *
                      </span>
                      <span className="sr-only"> {t("common.requiredSr")}</span>
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
                  aria-label={t("modals.picker.fleetOwner")}
                >
                  <option value="">
                    {filteredWalletOwners.length === 0 ? t("common.noMatches") : t("modals.picker.chooseOwner")}
                  </option>
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
                {t("modals.picker.selectedPrefix")} <strong>{ownerOptionLine(selectedWalletOwner)}</strong>
              </p>
            ) : null}
          </>
        ) : null}

        {config.section === "incidents" && showDrawerPanel("swap") ? (
          <>
            <p className="sub">{t("create.incidents.swapOptional")}</p>
            <label className="field">
              <span>{t("modals.picker.findSwap")}</span>
              <input
                type="search"
                value={incidentSwapSearch}
                disabled={saving || loadingIncidentSwaps}
                onChange={(event) => setIncidentSwapSearch(event.target.value)}
                placeholder={t("modals.picker.searchSwapRider")}
                autoComplete="off"
                aria-label={t("modals.picker.searchSwapRider")}
              />
            </label>
            {loadingIncidentSwaps ? (
              <p className="sub">{t("modals.picker.loadingSwaps")}</p>
            ) : (
              <label className="field">
                <span>
                  {t("modals.picker.swap")} ({t("modals.picker.shownCount", { count: filteredIncidentSwaps.length })}
                  {!incidentSwapSearch.trim()
                    ? t("modals.picker.shownRecentSuffix", { limit: RECENT_PICKER_LIMIT })
                    : ""}
                  )
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
                  aria-label={t("modals.picker.swap")}
                >
                  <option value="">
                    {filteredIncidentSwaps.length === 0 ? t("common.noMatches") : t("modals.picker.noSwapLinked")}
                  </option>
                  {filteredIncidentSwaps.map((swap) => (
                    <option key={swap.id} value={String(swap.id)}>
                      {swapOptionLine(swap, t("create.picker.unknownRider"))}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {selectedIncidentSwap ? (
              <p className="create-wallet-selection sub" role="status">
                {t("modals.picker.selectedPrefix")}{" "}
                <strong>{swapOptionLine(selectedIncidentSwap, t("create.picker.unknownRider"))}</strong>
              </p>
            ) : null}
          </>
        ) : null}

        {config.section === "bikes" && showDrawerPanel("assignment") ? (
          <>
            <p className="sub">{t("create.bikes.riderOptional")}</p>
            <label className="field">
              <span>{t("modals.picker.findRider")}</span>
              <input
                type="search"
                value={bikeRiderSearch}
                disabled={saving || loadingBikeRiders}
                onChange={(event) => setBikeRiderSearch(event.target.value)}
                placeholder={t("modals.picker.searchRiderFull")}
                autoComplete="off"
                aria-label={t("modals.picker.searchRiderFull")}
              />
            </label>
            {loadingBikeRiders ? (
              <p className="sub">{t("modals.picker.loadingRiders")}</p>
            ) : (
              <label className="field">
                <span>
                  {t("modals.picker.rider")} ({t("modals.picker.shownCount", { count: filteredBikeRiders.length })}
                  {!bikeRiderSearch.trim()
                    ? t("modals.picker.shownRecentSuffix", { limit: RECENT_PICKER_LIMIT })
                    : ""}
                  )
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
                  aria-label={t("modals.picker.rider")}
                >
                  <option value="">
                    {filteredBikeRiders.length === 0 ? t("common.noMatches") : t("modals.picker.noRiderAssigned")}
                  </option>
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
                {t("modals.picker.selectedPrefix")} <strong>{riderUserOptionLine(selectedBikeRider)}</strong>
              </p>
            ) : null}
          </>
        ) : null}

        {config.section === "stations" && (!useDrawerTabs || showDrawerPanel("location")) ? (
          <>
            <PlacesLocationPicker disabled={saving} onPlaceSelected={onStationPlaceSelected} />
            {stationLocationFields.map((field) => (
              <ResourceFormField
                key={field.name}
                field={field}
                value={values[field.name] ?? ""}
                disabled={saving}
                onValueChange={(next) => setValues({ ...values, [field.name]: next })}
                file={files[field.name] ?? null}
                onFileChange={(next) => setFiles({ ...files, [field.name]: next })}
              />
            ))}
          </>
        ) : null}

        {config.section === "batteries" && showDrawerPanel("details") ? (
          <div className="create-attach-target">
            <p className="sub">{t("create.batteries.attachIntro")}</p>
            <div className="drawer-tabs" role="radiogroup" aria-label={t("create.batteries.attachIntro")}>
              {(
                [
                  { id: "inventory", label: t("create.batteries.attach.inventory") },
                  { id: "station", label: t("create.batteries.attach.station") },
                  { id: "bike", label: t("create.batteries.attach.bike") },
                ] as const
              ).map((option) => {
                const selected = batteryAttachTarget === option.id;
                const assignOption = option.id !== "inventory";
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={saving || (assignOption && batteryCreateOffline)}
                    className={selected ? "drawer-tab drawer-tab-active" : "drawer-tab"}
                    onClick={() => setBatteryAttachTarget(option.id)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            {batteryCreateOffline ? (
              <p className="sub" role="status">
                {t("create.batteries.attach.offlineNote")}
              </p>
            ) : null}
          </div>
        ) : null}

        {config.section === "batteries" && showDrawerPanel("attach") && batteryAttachTarget === "station" ? (
          <>
            <p className="sub">{t("create.batteries.attach.stationHint")}</p>
            <label className="field">
              <span>{t("modals.attachBatteryStation.findStation")}</span>
              <input
                type="search"
                value={batteryCreateStationSearch}
                disabled={saving || loadingBatteryCreateStations}
                onChange={(event) => setBatteryCreateStationSearch(event.target.value)}
                placeholder={t("modals.attachBatteryStation.findStation")}
                autoComplete="off"
                aria-label={t("modals.attachBatteryStation.findStation")}
              />
            </label>
            {loadingBatteryCreateStations ? (
              <p className="sub">{t("modals.picker.loadingStations")}</p>
            ) : (
              <label className="field">
                <span>
                  {t("modals.attachBatteryStation.stationField")} (
                  {t("modals.picker.shownCount", { count: filteredBatteryCreateStations.length })}
                  {!batteryCreateStationSearch.trim()
                    ? t("modals.picker.shownRecentSuffix", { limit: RECENT_PICKER_LIMIT })
                    : ""}
                  )
                  <span className="col-required" aria-hidden="true">
                    {" "}
                    *
                  </span>
                  <span className="sr-only"> {t("common.requiredSr")}</span>
                </span>
                <select
                  value={batteryCreateStationId != null ? String(batteryCreateStationId) : ""}
                  disabled={saving || filteredBatteryCreateStations.length === 0}
                  required
                  onChange={(event) => {
                    const v = event.target.value;
                    setBatteryCreateStationId(v === "" ? null : Number(v));
                  }}
                  size={Math.min(8, Math.max(4, filteredBatteryCreateStations.length || 4))}
                  className="station-picker create-wallet-user-select"
                  aria-label={t("modals.attachBatteryStation.stationField")}
                >
                  <option value="">
                    {filteredBatteryCreateStations.length === 0
                      ? t("common.noMatches")
                      : t("modals.attachBatteryStation.errorSelect")}
                  </option>
                  {filteredBatteryCreateStations.map((station) => (
                    <option key={station.id} value={String(station.id)}>
                      {station.id} · {stationOptionLine(station)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {selectedBatteryCreateStation ? (
              <p className="create-wallet-selection sub" role="status">
                {t("modals.picker.selectedPrefix")}{" "}
                <strong>
                  {selectedBatteryCreateStation.id} · {stationOptionLine(selectedBatteryCreateStation)}
                </strong>
              </p>
            ) : null}
          </>
        ) : null}

        {config.section === "batteries" && showDrawerPanel("attach") && batteryAttachTarget === "bike" ? (
          <>
            <p className="sub">{t("create.batteries.attach.bikeHint")}</p>
            <label className="field">
              <span>{t("modals.attachBatteryBike.findBike")}</span>
              <input
                type="search"
                value={batteryCreateBikeSearch}
                disabled={saving || loadingBatteryCreateBikes}
                onChange={(event) => setBatteryCreateBikeSearch(event.target.value)}
                placeholder={t("modals.attachBatteryBike.findBike")}
                autoComplete="off"
                aria-label={t("modals.attachBatteryBike.findBike")}
              />
            </label>
            {loadingBatteryCreateBikes ? (
              <p className="sub">{t("modals.picker.loadingBikes")}</p>
            ) : (
              <label className="field">
                <span>
                  {t("modals.attachBatteryBike.bikeField")} (
                  {t("modals.picker.shownCount", { count: filteredBatteryCreateBikes.length })}
                  {!batteryCreateBikeSearch.trim()
                    ? t("modals.picker.shownRecentSuffix", { limit: RECENT_PICKER_LIMIT })
                    : ""}
                  )
                  <span className="col-required" aria-hidden="true">
                    {" "}
                    *
                  </span>
                  <span className="sr-only"> {t("common.requiredSr")}</span>
                </span>
                <select
                  value={batteryCreateBikeId != null ? String(batteryCreateBikeId) : ""}
                  disabled={saving || filteredBatteryCreateBikes.length === 0}
                  required
                  onChange={(event) => {
                    const v = event.target.value;
                    setBatteryCreateBikeId(v === "" ? null : Number(v));
                  }}
                  size={Math.min(8, Math.max(4, filteredBatteryCreateBikes.length || 4))}
                  className="station-picker create-wallet-user-select"
                  aria-label={t("modals.attachBatteryBike.bikeField")}
                >
                  <option value="">
                    {filteredBatteryCreateBikes.length === 0
                      ? t("modals.attachBikeBattery.noEligible")
                      : t("modals.attachBatteryBike.errorSelect")}
                  </option>
                  {filteredBatteryCreateBikes.map((bike) => (
                    <option key={bike.id} value={String(bike.id)}>
                      {bikeCreateOptionLine(bike)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {selectedBatteryCreateBike ? (
              <p className="create-wallet-selection sub" role="status">
                {t("modals.picker.selectedPrefix")} <strong>{bikeCreateOptionLine(selectedBatteryCreateBike)}</strong>
              </p>
            ) : null}
          </>
        ) : null}

        {config.section === "stations" && showDrawerPanel("swapper") ? (
          <>
            <p className="sub">{t("create.stations.swapperOptional")}</p>
            <label className="field">
              <span>
                {t("modals.picker.findSwapper")}
                <span className="sub"> {t("modals.picker.recentSearchHint", { limit: RECENT_PICKER_LIMIT })}</span>
              </span>
              <input
                type="search"
                value={stationSwapperSearch}
                disabled={saving || loadingStationSwappers}
                onChange={(event) => setStationSwapperSearch(event.target.value)}
                placeholder={t("modals.picker.searchSwapperFull")}
                autoComplete="off"
                aria-label={t("modals.picker.searchSwapperFull")}
              />
            </label>
            {loadingStationSwappers ? (
              <p className="sub">{t("modals.picker.loadingSwappers")}</p>
            ) : (
              <label className="field">
                <span>
                  {t("modals.picker.swapper")} ({t("modals.picker.shownCount", { count: filteredStationSwappers.length })}
                  {!stationSwapperSearch.trim()
                    ? t("modals.picker.shownRecentSuffix", { limit: RECENT_PICKER_LIMIT })
                    : ""}
                  )
                </span>
                <select
                  value={stationSwapperId != null ? String(stationSwapperId) : ""}
                  disabled={saving || filteredStationSwappers.length === 0}
                  onChange={(event) => {
                    const v = event.target.value;
                    setStationSwapperId(v === "" ? null : Number(v));
                  }}
                  size={Math.min(8, Math.max(4, filteredStationSwappers.length || 4))}
                  className="station-picker create-wallet-user-select"
                  aria-label={t("modals.picker.swapper")}
                >
                  <option value="">
                    {filteredStationSwappers.length === 0 ? t("common.noMatches") : t("modals.picker.noSwapperAssigned")}
                  </option>
                  {filteredStationSwappers.map((user) => (
                    <option key={user.id} value={String(user.id)}>
                      {swapperUserOptionLine(user)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {selectedStationSwapper ? (
              <p className="create-wallet-selection sub" role="status">
                {t("modals.picker.selectedPrefix")} <strong>{swapperUserOptionLine(selectedStationSwapper)}</strong>
              </p>
            ) : null}
          </>
        ) : null}

        {(!useDrawerTabs || showDrawerPanel("details"))
          ? stationDetailFields.map((field) => (
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
              <span>{t("create.owners.registerFleet")}</span>
            </label>
            {registerOwnerFleet ? <p className="sub">{t("create.owners.fleetAutoLink")}</p> : null}
            {registerOwnerFleet
              ? ownerBikes.map((draft, index) => (
                  <fieldset key={index} className="owner-fleet-bike" disabled={saving}>
                    <legend className="sub">{t("create.owners.bikeLegend", { index: index + 1 })}</legend>
                    <label className="field">
                      <span>
                        {t("fields.keys.plateNumber")}
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
                        {t("fields.keys.serialNumber")}
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
                        {t("fields.keys.model")}
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
                      <span>{t("fields.keys.chassisNumber")}</span>
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
                        {t("common.removeBike")}
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
                {t("common.addAnotherBike")}
              </button>
            ) : null}
          </div>
        ) : null}
      </form>
    </SlideOverDrawer>
  );
}
