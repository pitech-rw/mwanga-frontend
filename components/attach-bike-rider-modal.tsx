"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { userMessageForNetwork, userMessageFromResponse } from "../lib/api-errors";
import { authFetch } from "../lib/auth";
import { Modal } from "./modal";

export type BikeRiderAttachTarget = {
  id: number;
  plateNumber?: string;
  serialNumber?: string;
  currentUserId?: number | null;
};

type UserListRow = {
  id: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  type?: string;
  isActive?: boolean;
  assignedBikes?: unknown;
};

type AttachBikeRiderModalProps = {
  open: boolean;
  bike: BikeRiderAttachTarget | null;
  onClose: () => void;
  onSaved?: () => void;
  onError?: (message: string) => void;
};

function bikeHeading(bike: BikeRiderAttachTarget): string {
  if (typeof bike.plateNumber === "string" && bike.plateNumber.trim()) {
    return bike.plateNumber;
  }
  if (typeof bike.serialNumber === "string" && bike.serialNumber.trim()) {
    return bike.serialNumber;
  }
  return `Bike #${bike.id}`;
}

function riderOptionLabel(user: UserListRow): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  const uname = typeof user.username === "string" ? user.username : "";
  const email = typeof user.email === "string" ? user.email : "";
  const active =
    user.isActive === false ? "inactive" : user.isActive === true ? "" : "";
  const bikes = Array.isArray(user.assignedBikes) ? user.assignedBikes.length : null;
  const bikeHint = bikes != null && bikes > 0 ? ` · ${bikes} bike(s)` : "";

  const main = name && uname ? `${name} (@${uname})` : name || (uname ? `@${uname}` : `User #${user.id}`);
  const tail = [email, active].filter(Boolean).join(" · ");

  return tail ? `${main} — ${tail}${bikeHint}` : `${main}${bikeHint}`;
}

export function AttachBikeRiderModal({
  open,
  bike,
  onClose,
  onSaved,
  onError,
}: AttachBikeRiderModalProps) {
  const [users, setUsers] = useState<UserListRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !bike) {
      return;
    }

    let active = true;

    const load = async () => {
      if (active) {
        setLoadingUsers(true);
      }
      try {
        const response = await authFetch("/users?type=rider");

        if (!response.ok) {
          if (active) {
            setUsers([]);
            setError(await userMessageFromResponse("load", response));
          }
          return;
        }

        const data = (await response.json()) as unknown;

        if (!active) {
          return;
        }

        setUsers(Array.isArray(data) ? (data as UserListRow[]) : []);
      } catch {
        if (active) {
          setUsers([]);
          setError(userMessageForNetwork("load"));
        }
      } finally {
        if (active) {
          setLoadingUsers(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [open, bike]);

  const eligibleUsers = useMemo(
    () =>
      [...users].sort((a, b) => {
        const an = riderOptionLabel(a);
        const bn = riderOptionLabel(b);
        return an.localeCompare(bn, undefined, { sensitivity: "base" });
      }),
    [users],
  );

  const needle = query.trim().toLowerCase();

  const filteredUsers = useMemo(() => {
    if (!needle) {
      return eligibleUsers;
    }

    return eligibleUsers.filter((user) => {
      const haystack = [
        String(user.id),
        user.username ?? "",
        user.firstName ?? "",
        user.lastName ?? "",
        user.email ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [needle, eligibleUsers]);

  const selectedUser = useMemo(
    () => (selectedId != null ? eligibleUsers.find((u) => u.id === selectedId) : undefined),
    [eligibleUsers, selectedId],
  );

  if (!bike) {
    return null;
  }

  const submit = async (event: FormEvent, userId: number | null) => {
    event.preventDefault();

    if (userId !== null) {
      const sameAsCurrent = bike.currentUserId != null && bike.currentUserId === userId;
      if (sameAsCurrent) {
        setError("This rider is already assigned to this bike.");
        return;
      }
    } else if (bike.currentUserId == null) {
      setError("This bike has no rider to clear.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await authFetch(`/bikes/${bike.id}`, {
        method: "PATCH",
        body: JSON.stringify({ userId }),
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

  const formId = "attach-bike-rider-form";

  return (
    <Modal
      open={open}
      variant="panel"
      title="Assign rider"
      description={`Attach a rider to ${bikeHeading(bike)}. Lists rider accounts only. Search by user ID, name, username, or email. Only userId is updated.`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            className="btn"
            disabled={saving || loadingUsers || bike.currentUserId == null}
            onClick={(e) => submit(e, null)}
          >
            Clear rider
          </button>
          <button
            type="submit"
            form={formId}
            className="btn primary"
            disabled={saving || loadingUsers || selectedId == null}
          >
            {saving ? "Saving…" : "Assign rider"}
          </button>
        </>
      }
    >
      <form id={formId} className="form form-modal-panel" onSubmit={(e) => submit(e, selectedId)}>
        {error ? (
          <div className="login-error" role="alert">
            {error}
          </div>
        ) : null}

        <label className="field">
          <span>Find rider</span>
          <input
            type="search"
            value={query}
            disabled={loadingUsers || saving}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ID, name, username, or email…"
            autoComplete="off"
            aria-label="Search users"
          />
        </label>

        {loadingUsers ? (
          <p className="sub">Loading users…</p>
        ) : (
          <label className="field">
            <span>Rider ({filteredUsers.length} shown)</span>
            <select
              value={selectedId != null ? String(selectedId) : ""}
              disabled={saving || filteredUsers.length === 0}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedId(value === "" ? null : Number(value));
              }}
              size={Math.min(8, Math.max(4, filteredUsers.length || 4))}
              className="station-picker"
              aria-label="Select rider"
            >
              <option value="">{filteredUsers.length === 0 ? "No matches" : "Choose…"}</option>
              {filteredUsers.map((user) => (
                <option key={user.id} value={String(user.id)}>
                  {user.id} · {riderOptionLabel(user)}
                </option>
              ))}
            </select>
          </label>
        )}

        {selectedUser ? (
          <p className="sub">
            Selected: <strong>{riderOptionLabel(selectedUser)}</strong>
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
