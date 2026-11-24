"use client";

import { useT } from "./locale";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { userMessageForNetwork, userMessageFromResponse } from "../lib/api-errors";
import { authFetch } from "../lib/auth";
import { usersListPath } from "../lib/users-list-query";
import { RECENT_PICKER_LIMIT, recentPickerOptions } from "../lib/recent-picker";
import { riderListOptionLine, riderListSearchHaystack, type RiderListRow } from "../lib/rider-list-format";
import { Modal } from "./modal";
import { PickerSelectionStatus } from "./picker-selection-status";

export type OwnerRiderAssociateTarget = {
  id: number;
  name: string;
};

type AssociateOwnerRiderModalProps = {
  open: boolean;
  owner: OwnerRiderAssociateTarget | null;
  onClose: () => void;
  onSaved?: () => void;
  onError?: (message: string) => void;
};

export function AssociateOwnerRiderModal({
  open,
  owner,
  onClose,
  onSaved,
  onError,
}: AssociateOwnerRiderModalProps) {
  const t = useT();
  const [riders, setRiders] = useState<RiderListRow[]>([]);
  const [riderSearch, setRiderSearch] = useState("");
  const [loadingRiders, setLoadingRiders] = useState(false);
  const [riderId, setRiderId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !owner) {
      return;
    }

    setError(null);
    setRiderId(null);
    setRiderSearch("");
    setLoadingRiders(true);

    let active = true;

    const load = async () => {
      try {
        const response = await authFetch(usersListPath("rider"));
        if (!response.ok) {
          if (active) {
            setRiders([]);
            setError(await userMessageFromResponse("load", response));
          }
          return;
        }
        const data = (await response.json()) as unknown;
        if (!active) {
          return;
        }
        setRiders(Array.isArray(data) ? (data as RiderListRow[]) : []);
      } catch {
        if (active) {
          setRiders([]);
          setError(userMessageForNetwork("load"));
        }
      } finally {
        if (active) {
          setLoadingRiders(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [open, owner]);

  const filteredRiders = useMemo(
    () =>
      recentPickerOptions(
        riders,
        riderSearch,
        riderId,
        (rider, needle) => riderListSearchHaystack(rider).includes(needle),
        true,
      ),
    [riderId, riderSearch, riders],
  );

  const selectedRider = useMemo(
    () => (riderId != null ? riders.find((rider) => rider.id === riderId) : undefined),
    [riderId, riders],
  );

  if (!owner) {
    return null;
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    if (riderId === null) {
      setError("Select a rider account.");
      setSaving(false);
      return;
    }

    try {
      const response = await authFetch(`/users/${riderId}`, {
        method: "PATCH",
        body: JSON.stringify({ ownerId: owner.id }),
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

  const formId = "associate-owner-rider-form";

  return (
    <Modal
      open={open}
      variant="panel"
      title="Associate rider"
      description={`Link a rider account to fleet owner ${owner.name}.`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form={formId} className="btn primary" disabled={saving || loadingRiders || riderId === null}>
            {saving ? "Saving…" : "Save association"}
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

        <p className="sub">
          Riders already linked to another owner can be reassigned here. Listings show current fleet owner when set.
        </p>

        <label className="field">
          <span>
            Find rider
            <span className="sub">
              {" "}
              (showing {RECENT_PICKER_LIMIT} most recent, search for more)
            </span>
          </span>
          <input
            type="search"
            value={riderSearch}
            disabled={loadingRiders || saving}
            onChange={(event) => setRiderSearch(event.target.value)}
            placeholder="Search by name, username, email, or phone…"
            autoComplete="off"
            aria-label="Search riders"
          />
        </label>

        {loadingRiders ? (
          <p className="sub">Loading riders…</p>
        ) : (
          <label className="field">
            <span>
              Rider account ({filteredRiders.length} shown
              {!riderSearch.trim() ? ` · ${RECENT_PICKER_LIMIT} most recent` : ""})
              <span className="col-required" aria-hidden="true">
                {" "}
                *
              </span>
            </span>
            <select
              value={riderId != null ? String(riderId) : ""}
              disabled={saving || filteredRiders.length === 0}
              required
              onChange={(event) => {
                const value = event.target.value;
                setRiderId(value === "" ? null : Number(value));
              }}
              size={Math.min(8, Math.max(4, filteredRiders.length || 4))}
              className="station-picker create-wallet-user-select"
              aria-label="Select rider"
            >
              <option value="">{filteredRiders.length === 0 ? "No matches" : "Choose a rider…"}</option>
              {filteredRiders.map((rider) => (
                <option key={rider.id} value={String(rider.id)}>
                  {riderListOptionLine(rider)}
                </option>
              ))}
            </select>
          </label>
        )}

        {selectedRider ? (
          <PickerSelectionStatus disabled={saving || loadingRiders} onClear={() => setRiderId(null)}>
            {riderListOptionLine(selectedRider)}
          </PickerSelectionStatus>
        ) : null}
      </form>
    </Modal>
  );
}