import type { BatteryCreateAttachTarget } from "./battery-status";

export type StationListRow = {
  id: number;
  code: string;
  name: string;
  status?: string;
  createdAt?: string | null;
};

export type BikeCreateListRow = {
  id: number;
  plateNumber: string;
  serialNumber: string;
  model: string;
  status?: string;
  ownerId?: number | null;
  currentBatteryId?: number | null;
};

export function stationOptionLine(station: StationListRow): string {
  const base = `${station.code} — ${station.name}`;
  return station.status && station.status !== "active" ? `${base} (${station.status})` : base;
}

export function stationSearchHaystack(station: StationListRow): string {
  return [station.code, station.name, station.status ?? "", String(station.id)].join(" ").toLowerCase();
}

export function bikeEligibleForFleetAttach(bike: BikeCreateListRow): boolean {
  return bike.ownerId != null && bike.currentBatteryId == null;
}

/** Include the bike this pack is already mounted on when editing placement. */
export function bikeEligibleForFleetAttachEdit(
  bike: BikeCreateListRow,
  batteryId: number,
  currentBikeId: number | null,
): boolean {
  if (currentBikeId != null && bike.id === currentBikeId) {
    return true;
  }
  if (bike.currentBatteryId != null && bike.currentBatteryId !== batteryId) {
    return false;
  }
  return bikeEligibleForFleetAttach(bike);
}

export function bikeCreateOptionLine(bike: BikeCreateListRow): string {
  const status = bike.status && bike.status !== "active" ? ` · ${bike.status}` : "";
  return `${bike.id} · ${bike.plateNumber} — ${bike.model} · ${bike.serialNumber}${status}`;
}

export function bikeCreateSearchHaystack(bike: BikeCreateListRow): string {
  return [String(bike.id), bike.plateNumber, bike.serialNumber, bike.model, bike.status ?? ""]
    .join(" ")
    .toLowerCase();
}

export function batteryRowStationId(row: Record<string, unknown>): number | null {
  const raw = row.stationId;
  if (raw == null) {
    return null;
  }
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

export function batteryRowBikeId(row: Record<string, unknown>): number | null {
  const bike = row.bike;
  if (bike && typeof bike === "object" && bike !== null && "id" in bike) {
    const n = Number((bike as { id: unknown }).id);
    if (!Number.isNaN(n)) {
      return n;
    }
  }
  const raw = row.bikeId;
  if (raw == null) {
    return null;
  }
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

export function batteryPlacementTargetFromRow(row: Record<string, unknown>): BatteryCreateAttachTarget {
  if (batteryRowStationId(row) != null) {
    return "station";
  }
  if (batteryRowBikeId(row) != null) {
    return "bike";
  }
  return "inventory";
}

export function batteryRowIsDeployed(row: Record<string, unknown>): boolean {
  return batteryRowStationId(row) != null || batteryRowBikeId(row) != null;
}