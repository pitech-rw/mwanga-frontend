"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { userMessageForNetwork, userMessageFromResponse } from "../lib/api-errors";
import { authFetch } from "../lib/auth";
import { Modal } from "./modal";

export type CardRiderAssignTarget = {
  id: number;
  serialNumber?: string;
  token?: string;
  currentUserId?: number | null;
};

type UserListRow = {
  id: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  isActive?: boolean;
  nfcCards?: unknown;
};

type AssignCardRiderModalProps = {
  open: boolean;
  card: CardRiderAssignTarget | null;
  onClose: () => void;
  onSaved?: () => void;
  onError?: (message: string) => void;
};

function cardHeading(card: CardRiderAssignTarget): string {
  if (typeof card.serialNumber === "string" && card.serialNumber.trim()) {
    return card.serialNumber;
  }
  if (typeof card.token === "string" && card.token.trim()) {
    const t = card.token;
    return t.length > 24 ? `${t.slice(0, 16)}…` : t;
  }
  return `Card #${card.id}`;
}

function riderOptionLabel(user: UserListRow): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  const uname = typeof user.username === "string" ? user.username : "";
  const email = typeof user.email === "string" ? user.email : "";
  const active =
    user.isActive === false ? "inactive" : user.isActive === true ? "" : "";
  const cards = Array.isArray(user.nfcCards) ? user.nfcCards.length : null;
  const cardHint = cards != null && cards > 0 ? ` · ${cards} card(s)` : "";

  const main = name && uname ? `${name} (@${uname})` : name || (uname ? `@${uname}` : `User #${user.id}`);
  const tail = [email, active].filter(Boolean).join(" · ");

  return tail ? `${main} — ${tail}${cardHint}` : `${main}${cardHint}`;
}

export function AssignCardRiderModal({
  open,
  card,
  onClose,
  onSaved,
  onError,
}: AssignCardRiderModalProps) {
  const [users, setUsers] = useState<UserListRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !card) {
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
  }, [open, card]);

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

  if (!card) {
    return null;
  }

  const submit = async (event: FormEvent, userId: number | null) => {
    event.preventDefault();

    if (userId !== null) {
      const sameAsCurrent = card.currentUserId != null && card.currentUserId === userId;
      if (sameAsCurrent) {
        setError("This rider is already assigned to this card.");
        return;
      }
    } else if (card.currentUserId == null) {
      setError("This card has no rider to clear.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await authFetch(`/cards/${card.id}`, {
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

  const formId = "assign-card-rider-form";

  return (
    <Modal
      open={open}
      variant="panel"
      title="Assign rider"
      description={`Attach a rider to card ${cardHeading(card)}. Lists rider accounts only. Search by user ID, name, username, or email. Only userId is updated.`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            className="btn"
            disabled={saving || loadingUsers || card.currentUserId == null}
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
            aria-label="Search riders"
          />
        </label>

        {loadingUsers ? (
          <p className="sub">Loading riders…</p>
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
