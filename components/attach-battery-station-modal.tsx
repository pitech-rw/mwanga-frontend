"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { userMessageForNetwork, userMessageFromResponse } from "../lib/api-errors";
import { authFetch } from "../lib/auth";
import { Modal } from "./modal";

export type BatteryAttachTarget = {
  id: number;
  serialNumber?: string;
};

type StationOption = {
  id: number;
  code: string;
  name: string;
  status?: string;
};

type AttachBatteryStationModalProps = {
  open: boolean;
  battery: BatteryAttachTarget | null;
  onClose: () => void;
  onSaved?: () => void;
  onError?: (message: string) => void;
};

function batteryHeading(battery: BatteryAttachTarget): string {
  return battery.serialNumber ? `Serial ${battery.serialNumber}` : `Battery #${battery.id}`;
}

function stationOptionText(station: StationOption): string {
  const status =
    station.status && station.status !== "active" ? ` (${station.status})` : "";
  return `${station.id} · ${station.code} — ${station.name}${status}`;
}

export function AttachBatteryStationModal({
  open,
  battery,
  onClose,
  onSaved,
  onError,
}: AttachBatteryStationModalProps) {
  const [stations, setStations] = useState<StationOption[]>([]);
  const [loadingStations, setLoadingStations] = useState(false);
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
    setLoadingStations(true);

    let active = true;

    const load = async () => {
      try {
        const response = await authFetch("/stations");

        if (!response.ok) {
          if (active) {
            setStations([]);
            setError(await userMessageFromResponse("load", response));
          }
          return;
        }

        const data = (await response.json()) as unknown;

        if (!active) {
          return;
        }

        setStations(Array.isArray(data) ? (data as StationOption[]) : []);
      } catch {
        if (active) {
          setStations([]);
          setError(userMessageForNetwork("load"));
        }
      } finally {
        if (active) {
          setLoadingStations(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [open, battery]);

  const stationOptions = useMemo(
    () =>
      [...stations].sort((left, right) =>
        left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
      ),
    [stations],
  );

  const needle = query.trim().toLowerCase();

  const filteredStations = useMemo(() => {
    if (!needle) {
      return stationOptions;
    }

    return stationOptions.filter((station) => {
      const haystack = [
        String(station.id),
        station.code,
        station.name,
        station.status ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [needle, stationOptions]);

  const selectedStation = useMemo(
    () => (selectedId != null ? stationOptions.find((s) => s.id === selectedId) : undefined),
    [selectedId, stationOptions],
  );

  if (!battery) {
    return null;
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    if (selectedId == null) {
      setError("Choose a station.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await authFetch(`/batteries/${battery.id}`, {
        method: "PATCH",
        body: JSON.stringify({ stationId: selectedId }),
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
      title="Attach to station"
      description={`Choose a station for ${batteryHeading(battery)}. Search by station ID, code, or name.`}
      onClose={onClose}
    >
      <form className="form" onSubmit={submit}>
        {error ? (
          <div className="login-error" role="alert">
            {error}
          </div>
        ) : null}

        <label className="field">
          <span>Find station</span>
          <input
            type="search"
            value={query}
            disabled={loadingStations || saving}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ID, code, or name…"
            autoComplete="off"
            aria-label="Search stations by id, code, or name"
          />
        </label>

        {loadingStations ? (
          <p className="sub">Loading stations…</p>
        ) : (
          <label className="field">
            <span>Station ({filteredStations.length} shown)</span>
            <select
              value={selectedId != null ? String(selectedId) : ""}
              disabled={saving || filteredStations.length === 0}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedId(value === "" ? null : Number(value));
              }}
              size={Math.min(8, Math.max(4, filteredStations.length || 4))}
              className="station-picker"
              aria-label="Select station"
            >
              <option value="">{filteredStations.length === 0 ? "No matches" : "Choose…"}</option>
              {filteredStations.map((station) => (
                <option key={station.id} value={String(station.id)}>
                  {stationOptionText(station)}
                </option>
              ))}
            </select>
          </label>
        )}

        {selectedStation ? (
          <p className="sub">
            Selected: <strong>{stationOptionText(selectedStation)}</strong>
          </p>
        ) : null}

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={saving || loadingStations || selectedId == null}>
            {saving ? "Saving…" : "Attach battery"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
