"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { userMessageForNetwork, userMessageFromResponse } from "../lib/api-errors";
import { authFetch } from "../lib/auth";
import { Modal } from "./modal";

export type BatteryBikeAttachTarget = {
  id: number;
  serialNumber?: string;
};

type BikeOption = {
  id: number;
  plateNumber: string;
  serialNumber: string;
  model: string;
  status?: string;
  currentBatteryId?: number | null;
};

type AttachBatteryBikeModalProps = {
  open: boolean;
  battery: BatteryBikeAttachTarget | null;
  onClose: () => void;
  onSaved?: () => void;
  onError?: (message: string) => void;
};

function batteryHeading(battery: BatteryBikeAttachTarget): string {
  return battery.serialNumber ? `Serial ${battery.serialNumber}` : `Battery #${battery.id}`;
}

function bikeOptionText(bike: BikeOption, forBatteryId: number): string {
  const busy =
    bike.currentBatteryId != null && bike.currentBatteryId !== forBatteryId
      ? " (has battery)"
      : "";
  const status = bike.status && bike.status !== "active" ? ` · ${bike.status}` : "";
  return `${bike.id} · ${bike.plateNumber} — ${bike.model} · ${bike.serialNumber}${status}${busy}`;
}

export function AttachBatteryBikeModal({
  open,
  battery,
  onClose,
  onSaved,
  onError,
}: AttachBatteryBikeModalProps) {
  const [bikes, setBikes] = useState<BikeOption[]>([]);
  const [loadingBikes, setLoadingBikes] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !battery) {
      return;
    }

    setError(null);
    setQuery("");
    setSelectedId(null);
    setLoadingBikes(true);

    let active = true;

    const load = async () => {
      try {
        const response = await authFetch("/bikes");

        if (!response.ok) {
          if (active) {
            setBikes([]);
            setError(await userMessageFromResponse("load", response));
          }
          return;
        }

        const data = (await response.json()) as unknown;

        if (!active) {
          return;
        }

        setBikes(Array.isArray(data) ? (data as BikeOption[]) : []);
      } catch {
        if (active) {
          setBikes([]);
          setError(userMessageForNetwork("load"));
        }
      } finally {
        if (active) {
          setLoadingBikes(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [open, battery]);

  const bikeOptions = useMemo(
    () =>
      [...bikes].sort((left, right) =>
        left.plateNumber.localeCompare(right.plateNumber, undefined, { sensitivity: "base" }),
      ),
    [bikes],
  );

  const needle = query.trim().toLowerCase();

  const filteredBikes = useMemo(() => {
    if (!needle) {
      return bikeOptions;
    }

    return bikeOptions.filter((bike) => {
      const haystack = [
        String(bike.id),
        bike.plateNumber,
        bike.serialNumber,
        bike.model,
        bike.status ?? "",
        bike.currentBatteryId != null ? String(bike.currentBatteryId) : "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [needle, bikeOptions]);

  const selectedBike = useMemo(
    () => (selectedId != null ? bikeOptions.find((b) => b.id === selectedId) : undefined),
    [bikeOptions, selectedId],
  );

  if (!battery) {
    return null;
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    if (selectedId == null) {
      setError("Choose a bike.");
      return;
    }

    const bike = bikeOptions.find((b) => b.id === selectedId);
    if (
      bike &&
      bike.currentBatteryId != null &&
      bike.currentBatteryId !== battery.id
    ) {
      setError("That bike already has another battery. Remove it first or pick another bike.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await authFetch(`/batteries/${battery.id}`, {
        method: "PATCH",
        body: JSON.stringify({ bikeId: selectedId }),
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

  return (
    <Modal
      open={open}
      title="Attach to bike"
      description={`Choose a bike for ${batteryHeading(battery)}. Search by bike ID, plate, serial, or model. Attaching to a bike clears any station assignment.`}
      onClose={onClose}
    >
      <form className="form" onSubmit={submit}>
        {error ? (
          <div className="login-error" role="alert">
            {error}
          </div>
        ) : null}

        <label className="field">
          <span>Find bike</span>
          <input
            type="search"
            value={query}
            disabled={loadingBikes || saving}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ID, plate, serial, or model…"
            autoComplete="off"
            aria-label="Search bikes by id, plate, serial, or model"
          />
        </label>

        {loadingBikes ? (
          <p className="sub">Loading bikes…</p>
        ) : (
          <label className="field">
            <span>Bike ({filteredBikes.length} shown)</span>
            <select
              value={selectedId != null ? String(selectedId) : ""}
              disabled={saving || filteredBikes.length === 0}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedId(value === "" ? null : Number(value));
              }}
              size={Math.min(8, Math.max(4, filteredBikes.length || 4))}
              className="station-picker"
              aria-label="Select bike"
            >
              <option value="">{filteredBikes.length === 0 ? "No matches" : "Choose…"}</option>
              {filteredBikes.map((bike) => (
                <option key={bike.id} value={String(bike.id)}>
                  {bikeOptionText(bike, battery.id)}
                </option>
              ))}
            </select>
          </label>
        )}

        {selectedBike ? (
          <p className="sub">
            Selected: <strong>{bikeOptionText(selectedBike, battery.id)}</strong>
          </p>
        ) : null}

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={saving || loadingBikes || selectedId == null}>
            {saving ? "Saving…" : "Attach battery"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
