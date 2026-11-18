"use client";

import { useT } from "./locale";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { userMessageForNetwork, userMessageFromResponse } from "../lib/api-errors";
import { authFetch } from "../lib/auth";
import { Modal } from "./modal";

export type InventoryIssueTarget = {
  inventoryId: number;
  mode: "bike" | "battery-station" | "battery-bike";
  label: string;
};

type OwnerOption = { id: number; name: string };
type StationOption = { id: number; code: string; name: string };
type BikeOption = { id: number; plateNumber: string; serialNumber?: string };

type IssueInventoryModalProps = {
  open: boolean;
  target: InventoryIssueTarget | null;
  onClose: () => void;
  onSaved?: () => void;
  onError?: (message: string) => void;
};

export function IssueInventoryModal({
  open,
  target,
  onClose,
  onSaved,
  onError,
}: IssueInventoryModalProps) {
  const t = useT();
  const [owners, setOwners] = useState<OwnerOption[]>([]);
  const [stations, setStations] = useState<StationOption[]>([]);
  const [bikes, setBikes] = useState<BikeOption[]>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState<number | null>(null);
  const [riderUserId, setRiderUserId] = useState("");
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [selectedBikeId, setSelectedBikeId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() => {
    if (!target) {
      return "Issue from warehouse";
    }
    if (target.mode === "bike") {
      return `Issue bike · ${target.label}`;
    }
    if (target.mode === "battery-station") {
      return `Issue to station · ${target.label}`;
    }
    return `Issue to bike · ${target.label}`;
  }, [target]);

  useEffect(() => {
    if (!open || !target) {
      return;
    }

    setError(null);
    setSelectedOwnerId(null);
    setRiderUserId("");
    setSelectedStationId(null);
    setSelectedBikeId(null);
    setLoading(true);

    let active = true;

    const load = async () => {
      try {
        if (target.mode === "bike") {
          const response = await authFetch("/owners");
          if (!response.ok) {
            throw new Error(await userMessageFromResponse("load", response));
          }
          const data = (await response.json()) as unknown;
          if (active && Array.isArray(data)) {
            setOwners(
              data
                .map((row) => row as Record<string, unknown>)
                .filter((row) => typeof row.id === "number")
                .map((row) => ({
                  id: row.id as number,
                  name: typeof row.name === "string" ? row.name : `Owner #${row.id}`,
                })),
            );
          }
        } else if (target.mode === "battery-station") {
          const response = await authFetch("/stations");
          if (!response.ok) {
            throw new Error(await userMessageFromResponse("load", response));
          }
          const data = (await response.json()) as unknown;
          if (active && Array.isArray(data)) {
            setStations(
              data
                .map((row) => row as Record<string, unknown>)
                .filter((row) => typeof row.id === "number")
                .map((row) => ({
                  id: row.id as number,
                  code: typeof row.code === "string" ? row.code : "",
                  name: typeof row.name === "string" ? row.name : "",
                })),
            );
          }
        } else {
          const response = await authFetch("/bikes");
          if (!response.ok) {
            throw new Error(await userMessageFromResponse("load", response));
          }
          const data = (await response.json()) as unknown;
          if (active && Array.isArray(data)) {
            setBikes(
              data
                .map((row) => row as Record<string, unknown>)
                .filter((row) => typeof row.id === "number" && row.ownerId != null)
                .map((row) => ({
                  id: row.id as number,
                  plateNumber: typeof row.plateNumber === "string" ? row.plateNumber : `#${row.id}`,
                  serialNumber: typeof row.serialNumber === "string" ? row.serialNumber : undefined,
                })),
            );
          }
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : userMessageForNetwork("load"));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [open, target]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!target) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let path = "";
      let body: Record<string, unknown> = {};

      if (target.mode === "bike") {
        if (selectedOwnerId === null) {
          setError("Select a fleet owner.");
          setSaving(false);
          return;
        }
        path = `/inventory/${target.inventoryId}/issue/bike`;
        body = { ownerId: selectedOwnerId };
        const riderRaw = riderUserId.trim();
        if (riderRaw) {
          body.userId = Number(riderRaw);
        }
      } else if (target.mode === "battery-station") {
        if (selectedStationId === null) {
          setError("Select a station.");
          setSaving(false);
          return;
        }
        path = `/inventory/${target.inventoryId}/issue/battery/station`;
        body = { stationId: selectedStationId };
      } else {
        if (selectedBikeId === null) {
          setError("Select a bike.");
          setSaving(false);
          return;
        }
        path = `/inventory/${target.inventoryId}/issue/battery/bike`;
        body = { bikeId: selectedBikeId };
      }

      const response = await authFetch(path, {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const message = await userMessageFromResponse("create", response);
        setError(message);
        onError?.(message);
        return;
      }

      onSaved?.();
      onClose();
    } catch {
      const message = userMessageForNetwork("create");
      setError(message);
      onError?.(message);
    } finally {
      setSaving(false);
    }
  };

  const formId = "issue-inventory-form";

  return (
    <Modal
      open={open}
      variant="panel"
      title={title}
      description="This removes the asset from warehouse stock and deploys it."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form={formId} className="btn primary" disabled={saving || loading}>
            {saving ? "Issuing…" : "Issue"}
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

        {loading ? <p className="muted">Loading options…</p> : null}

        {!loading && target?.mode === "bike" ? (
          <>
            <label className="field">
              <span className="field-label">Fleet owner</span>
              <select
                className="input"
                value={selectedOwnerId ?? ""}
                onChange={(e) => setSelectedOwnerId(e.target.value ? Number(e.target.value) : null)}
                required
              >
                <option value="">Select owner…</option>
                {owners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.id} · {owner.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Rider user ID (optional)</span>
              <input
                className="input"
                type="number"
                value={riderUserId}
                onChange={(e) => setRiderUserId(e.target.value)}
                placeholder="Leave empty to assign owner only"
              />
            </label>
          </>
        ) : null}

        {!loading && target?.mode === "battery-station" ? (
          <label className="field">
            <span className="field-label">Station</span>
            <select
              className="input"
              value={selectedStationId ?? ""}
              onChange={(e) => setSelectedStationId(e.target.value ? Number(e.target.value) : null)}
              required
            >
              <option value="">Select station…</option>
              {stations.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.id} · {station.code} — {station.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {!loading && target?.mode === "battery-bike" ? (
          <label className="field">
            <span className="field-label">Bike</span>
            <select
              className="input"
              value={selectedBikeId ?? ""}
              onChange={(e) => setSelectedBikeId(e.target.value ? Number(e.target.value) : null)}
              required
            >
              <option value="">Select bike…</option>
              {bikes.map((bike) => (
                <option key={bike.id} value={bike.id}>
                  {bike.id} · {bike.plateNumber}
                  {bike.serialNumber ? ` (${bike.serialNumber})` : ""}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </form>
    </Modal>
  );
}