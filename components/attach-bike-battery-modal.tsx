"use client";

import { useT } from "./locale";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { userMessageForNetwork, userMessageFromResponse } from "../lib/api-errors";
import { authFetch } from "../lib/auth";
import { batteryMayBeAssigned } from "../lib/battery-status";
import { Modal } from "./modal";

export type BikeBatteryAttachTarget = {
  id: number;
  plateNumber?: string;
  serialNumber?: string;
};

type BatteryOption = {
  id: number;
  serialNumber: string;
  model?: string;
  status?: string;
  stationId?: number | null;
  station?: unknown;
  bike?: unknown;
};

type AttachBikeBatteryModalProps = {
  open: boolean;
  bike: BikeBatteryAttachTarget | null;
  onClose: () => void;
  onSaved?: () => void;
  onError?: (message: string) => void;
};

function bikeHeading(bike: BikeBatteryAttachTarget): string {
  if (typeof bike.plateNumber === "string" && bike.plateNumber.trim()) {
    return bike.plateNumber;
  }
  if (typeof bike.serialNumber === "string" && bike.serialNumber.trim()) {
    return bike.serialNumber;
  }
  return `Bike #${bike.id}`;
}

function batteryEligibleForBike(battery: BatteryOption): boolean {
  const atStation =
    battery.stationId != null || (battery.station != null && typeof battery.station === "object");
  return !atStation && batteryMayBeAssigned(battery.status);
}

function batteryOptionText(battery: BatteryOption): string {
  const onBike =
    battery.bike != null && typeof battery.bike === "object" ? " (on another bike)" : "";
  const status = battery.status ? ` · ${battery.status.replace(/_/g, " ")}` : "";
  const model = battery.model?.trim() ? ` — ${battery.model}` : "";
  return `${battery.id} · ${battery.serialNumber}${model}${status}${onBike}`;
}

export function AttachBikeBatteryModal({
  open,
  bike,
  onClose,
  onSaved,
  onError,
}: AttachBikeBatteryModalProps) {
  const t = useT();
  const [batteries, setBatteries] = useState<BatteryOption[]>([]);
  const [loadingBatteries, setLoadingBatteries] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !bike) {
      return;
    }

    setError(null);
    setQuery("");
    setSelectedId(null);
    setLoadingBatteries(true);

    let active = true;

    const load = async () => {
      try {
        const response = await authFetch("/batteries");

        if (!response.ok) {
          if (active) {
            setBatteries([]);
            setError(await userMessageFromResponse("load", response));
          }
          return;
        }

        const data = (await response.json()) as unknown;

        if (!active) {
          return;
        }

        const rows = Array.isArray(data) ? (data as BatteryOption[]) : [];
        setBatteries(rows.filter(batteryEligibleForBike));
      } catch {
        if (active) {
          setBatteries([]);
          setError(userMessageForNetwork("load"));
        }
      } finally {
        if (active) {
          setLoadingBatteries(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [open, bike]);

  const batteryOptions = useMemo(
    () =>
      [...batteries].sort((left, right) =>
        left.serialNumber.localeCompare(right.serialNumber, undefined, { sensitivity: "base" }),
      ),
    [batteries],
  );

  const needle = query.trim().toLowerCase();

  const filteredBatteries = useMemo(() => {
    if (!needle) {
      return batteryOptions;
    }

    return batteryOptions.filter((battery) => {
      const haystack = [
        String(battery.id),
        battery.serialNumber,
        battery.model ?? "",
        battery.status ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [needle, batteryOptions]);

  const selectedBattery = useMemo(
    () => (selectedId != null ? batteryOptions.find((b) => b.id === selectedId) : undefined),
    [batteryOptions, selectedId],
  );

  if (!bike) {
    return null;
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    if (selectedId == null) {
      setError("Choose a battery.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await authFetch(`/batteries/${selectedId}`, {
        method: "PATCH",
        body: JSON.stringify({ bikeId: bike.id }),
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

  const formId = "attach-bike-battery-form";

  return (
    <Modal
      open={open}
      variant="panel"
      title="Attach a battery"
      description={`Optional: assign a pack to ${bikeHeading(bike)}. Only batteries not at a station are listed. You can skip and attach later from Batteries.`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={saving}>
            Skip for now
          </button>
          <button
            type="submit"
            form={formId}
            className="btn primary"
            disabled={saving || loadingBatteries || selectedId == null}
          >
            {saving ? "Saving…" : "Attach battery"}
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

        <label className="field">
          <span>Find battery</span>
          <input
            type="search"
            value={query}
            disabled={loadingBatteries || saving}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ID, serial, or model…"
            autoComplete="off"
            aria-label="Search batteries"
          />
        </label>

        {loadingBatteries ? (
          <p className="sub">Loading batteries…</p>
        ) : (
          <label className="field">
            <span>Battery ({filteredBatteries.length} shown)</span>
            <select
              value={selectedId != null ? String(selectedId) : ""}
              disabled={saving || filteredBatteries.length === 0}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedId(value === "" ? null : Number(value));
              }}
              size={Math.min(8, Math.max(4, filteredBatteries.length || 4))}
              className="station-picker"
              aria-label="Select battery"
            >
              <option value="">{filteredBatteries.length === 0 ? "No eligible packs" : "Choose…"}</option>
              {filteredBatteries.map((battery) => (
                <option key={battery.id} value={String(battery.id)}>
                  {batteryOptionText(battery)}
                </option>
              ))}
            </select>
          </label>
        )}

        {selectedBattery ? (
          <p className="sub">
            Selected: <strong>{batteryOptionText(selectedBattery)}</strong>
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
