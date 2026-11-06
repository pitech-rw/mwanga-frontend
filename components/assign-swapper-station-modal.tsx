"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { userMessageForNetwork, userMessageFromResponse } from "../lib/api-errors";
import { authFetch } from "../lib/auth";
import { Modal } from "./modal";

export type SwapperAssignTarget = {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  type: string;
  stationId?: number | null;
  assignedStation?: { id: number; name: string; code: string } | null;
};

type StationOption = {
  id: number;
  code: string;
  name: string;
  status?: string;
};

type AssignSwapperStationModalProps = {
  open: boolean;
  user: SwapperAssignTarget | null;
  onClose: () => void;
  onSaved?: () => void;
  onError?: (message: string) => void;
};

function swapperLabel(user: SwapperAssignTarget): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name ? `${name} (@${user.username})` : `@${user.username}`;
}

export function AssignSwapperStationModal({
  open,
  user,
  onClose,
  onSaved,
  onError,
}: AssignSwapperStationModalProps) {
  const [stations, setStations] = useState<StationOption[]>([]);
  const [loadingStations, setLoadingStations] = useState(false);
  const [stationId, setStationId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) {
      return;
    }

    setError(null);
    setStationId(user.stationId != null ? String(user.stationId) : "");
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
  }, [open, user]);

  const stationOptions = useMemo(
    () =>
      [...stations].sort((left, right) =>
        left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
      ),
    [stations],
  );

  if (!user) {
    return null;
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const payload =
      stationId === "" ? { stationId: null } : { stationId: Number(stationId) };

    if (stationId !== "" && Number.isNaN(payload.stationId)) {
      setError("Choose a valid station.");
      setSaving(false);
      return;
    }

    try {
      const response = await authFetch(`/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
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
      title="Assign station"
      description={`Choose which swap station ${swapperLabel(user)} operates.`}
      onClose={onClose}
    >
      <form className="form" onSubmit={submit}>
        {error ? (
          <div className="login-error" role="alert">
            {error}
          </div>
        ) : null}

        <label className="field">
          <span>Station</span>
          <select
            value={stationId}
            disabled={loadingStations || saving}
            onChange={(event) => setStationId(event.target.value)}
          >
            <option value="">Unassigned</option>
            {stationOptions.map((station) => (
              <option key={station.id} value={String(station.id)}>
                {station.code} — {station.name}
                {station.status && station.status !== "active" ? ` (${station.status})` : ""}
              </option>
            ))}
          </select>
        </label>

        {loadingStations ? <p className="sub">Loading stations…</p> : null}

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={saving || loadingStations}>
            {saving ? "Saving…" : "Save assignment"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
