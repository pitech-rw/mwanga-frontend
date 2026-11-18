"use client";

import { useT } from "./locale";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { userMessageForNetwork, userMessageFromResponse } from "../lib/api-errors";
import { authFetch } from "../lib/auth";
import { ownerListSearchHaystack, ownerOptionLine, type OwnerListRow } from "../lib/owner-list-format";
import { RECENT_PICKER_LIMIT, recentPickerOptions } from "../lib/recent-picker";
import { Modal } from "./modal";

export type RiderFleetOwnerAssignTarget = {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  type: string;
  ownerId?: number | null;
  fleetOwner?: { id: number; name: string } | null;
};

type AssignRiderFleetOwnerModalProps = {
  open: boolean;
  user: RiderFleetOwnerAssignTarget | null;
  onClose: () => void;
  onSaved?: () => void;
  onError?: (message: string) => void;
};

function riderLabel(user: RiderFleetOwnerAssignTarget): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name ? `${name} (@${user.username})` : `@${user.username}`;
}

export function AssignRiderFleetOwnerModal({
  open,
  user,
  onClose,
  onSaved,
  onError,
}: AssignRiderFleetOwnerModalProps) {
  const t = useT();
  const [owners, setOwners] = useState<OwnerListRow[]>([]);
  const [ownerSearch, setOwnerSearch] = useState("");
  const [loadingOwners, setLoadingOwners] = useState(false);
  const [ownerId, setOwnerId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) {
      return;
    }

    setError(null);
    const initialOwnerId =
      typeof user.ownerId === "number"
        ? user.ownerId
        : user.fleetOwner && typeof user.fleetOwner === "object"
          ? user.fleetOwner.id
          : null;
    setOwnerId(initialOwnerId);
    setOwnerSearch("");
    setLoadingOwners(true);

    let active = true;

    const load = async () => {
      try {
        const response = await authFetch("/owners");
        if (!response.ok) {
          if (active) {
            setOwners([]);
            setError(await userMessageFromResponse("load", response));
          }
          return;
        }
        const data = (await response.json()) as unknown;
        if (!active) {
          return;
        }
        setOwners(Array.isArray(data) ? (data as OwnerListRow[]) : []);
      } catch {
        if (active) {
          setOwners([]);
          setError(userMessageForNetwork("load"));
        }
      } finally {
        if (active) {
          setLoadingOwners(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [open, user]);

  const filteredOwners = useMemo(
    () =>
      recentPickerOptions(owners, ownerSearch, ownerId, (owner, needle) => ownerListSearchHaystack(owner).includes(needle), true),
    [ownerId, ownerSearch, owners],
  );

  const selectedOwner = useMemo(
    () => (ownerId != null ? owners.find((owner) => owner.id === ownerId) : undefined),
    [ownerId, owners],
  );

  if (!user) {
    return null;
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    if (ownerId === null) {
      setError("Select a fleet owner.");
      setSaving(false);
      return;
    }

    try {
      const response = await authFetch(`/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ownerId }),
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

  const formId = "assign-rider-fleet-owner-form";

  return (
    <Modal
      open={open}
      variant="panel"
      title="Assign fleet owner"
      description={`Link ${riderLabel(user)} to a fleet proprietor.`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form={formId} className="btn primary" disabled={saving || loadingOwners || ownerId === null}>
            {saving ? "Saving…" : "Save assignment"}
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
          <span>
            Find owner
            <span className="sub">
              {" "}
              (showing {RECENT_PICKER_LIMIT} most recent, search for more)
            </span>
          </span>
          <input
            type="search"
            value={ownerSearch}
            disabled={loadingOwners || saving}
            onChange={(event) => setOwnerSearch(event.target.value)}
            placeholder="Search by name, email, or phone…"
            autoComplete="off"
            aria-label="Search fleet owners"
          />
        </label>

        {loadingOwners ? (
          <p className="sub">Loading owners…</p>
        ) : (
          <label className="field">
            <span>
              Fleet owner ({filteredOwners.length} shown
              {!ownerSearch.trim() ? ` · ${RECENT_PICKER_LIMIT} most recent` : ""})
              <span className="col-required" aria-hidden="true">
                {" "}
                *
              </span>
            </span>
            <select
              value={ownerId != null ? String(ownerId) : ""}
              disabled={saving || filteredOwners.length === 0}
              required
              onChange={(event) => {
                const value = event.target.value;
                setOwnerId(value === "" ? null : Number(value));
              }}
              size={Math.min(8, Math.max(4, filteredOwners.length || 4))}
              className="station-picker create-wallet-user-select"
              aria-label="Select fleet owner"
            >
              <option value="">{filteredOwners.length === 0 ? "No matches" : "Choose an owner…"}</option>
              {filteredOwners.map((owner) => (
                <option key={owner.id} value={String(owner.id)}>
                  {ownerOptionLine(owner)}
                </option>
              ))}
            </select>
          </label>
        )}

        {selectedOwner ? (
          <p className="create-wallet-selection sub" role="status">
            <strong>Selected:</strong> {ownerOptionLine(selectedOwner)}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}