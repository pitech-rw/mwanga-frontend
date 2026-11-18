"use client";

import { useT } from "./locale";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { userMessageForNetwork, userMessageFromResponse } from "../lib/api-errors";
import { authFetch } from "../lib/auth";
import { RECENT_PICKER_LIMIT, recentPickerOptions } from "../lib/recent-picker";
import { Modal } from "./modal";

export type StationSwapperAssignTarget = {
  id: number;
  code: string;
  name: string;
};

type SwapperOption = {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  stationId?: number | null;
};

type AssignStationSwapperModalProps = {
  open: boolean;
  station: StationSwapperAssignTarget | null;
  onClose: () => void;
  onSaved?: () => void;
  onError?: (message: string) => void;
};

function stationLabel(station: StationSwapperAssignTarget): string {
  return `${station.code} — ${station.name}`;
}

function swapperOptionLine(user: SwapperOption): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  const label = name ? `${name} (@${user.username})` : `@${user.username}`;
  const contact = user.email ?? user.phone ?? "";
  return contact ? `${user.id} · ${label} · ${contact}` : `${user.id} · ${label}`;
}

export function AssignStationSwapperModal({
  open,
  station,
  onClose,
  onSaved,
  onError,
}: AssignStationSwapperModalProps) {
  const t = useT();
  const [swappers, setSwappers] = useState<SwapperOption[]>([]);
  const [loadingSwappers, setLoadingSwappers] = useState(false);
  const [swapperSearch, setSwapperSearch] = useState("");
  const [swapperId, setSwapperId] = useState<number | null>(null);
  const priorAssignedIdRef = useRef<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !station) {
      return;
    }

    setError(null);
    setSwapperSearch("");
    setSwapperId(null);
    priorAssignedIdRef.current = null;
    setLoadingSwappers(true);

    let active = true;

    const load = async () => {
      try {
        const response = await authFetch("/users?type=swapper");
        if (!response.ok) {
          if (active) {
            setSwappers([]);
            setError(await userMessageFromResponse("load", response));
          }
          return;
        }

        const data = (await response.json()) as unknown;
        if (!active) {
          return;
        }

        const rows = Array.isArray(data) ? (data as SwapperOption[]) : [];
        setSwappers(rows);

        const assigned = rows.find((user) => user.stationId === station.id);
        const initialId = assigned?.id ?? null;
        priorAssignedIdRef.current = initialId;
        setSwapperId(initialId);
      } catch {
        if (active) {
          setSwappers([]);
          setError(userMessageForNetwork("load"));
        }
      } finally {
        if (active) {
          setLoadingSwappers(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [open, station]);

  const filteredSwappers = useMemo(
    () =>
      recentPickerOptions(
        swappers,
        swapperSearch,
        swapperId,
        (user, needle) => {
          const haystack = [
            user.username,
            user.firstName,
            user.lastName,
            user.email,
            user.phone ?? "",
            String(user.id),
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(needle);
        },
        true,
      ),
    [swapperId, swapperSearch, swappers],
  );

  const selectedSwapper = useMemo(
    () => (swapperId != null ? swappers.find((user) => user.id === swapperId) : undefined),
    [swapperId, swappers],
  );

  if (!station) {
    return null;
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const priorId = priorAssignedIdRef.current;

    try {
      if (swapperId === null) {
        if (priorId != null) {
          const response = await authFetch(`/users/${priorId}`, {
            method: "PATCH",
            body: JSON.stringify({ stationId: null }),
          });
          if (!response.ok) {
            const message = await userMessageFromResponse("create", response);
            setError(message);
            onError?.(message);
            return;
          }
        }
      } else {
        if (priorId != null && priorId !== swapperId) {
          const clearResponse = await authFetch(`/users/${priorId}`, {
            method: "PATCH",
            body: JSON.stringify({ stationId: null }),
          });
          if (!clearResponse.ok) {
            const message = await userMessageFromResponse("create", clearResponse);
            setError(message);
            onError?.(message);
            return;
          }
        }
        const response = await authFetch(`/users/${swapperId}`, {
          method: "PATCH",
          body: JSON.stringify({ stationId: station.id }),
        });
        if (!response.ok) {
          const message = await userMessageFromResponse("create", response);
          setError(message);
          onError?.(message);
          return;
        }
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

  const formId = "assign-station-swapper-form";

  return (
    <Modal
      open={open}
      variant="panel"
      title={t("modals.assignSwapper.title")}
      description={t("modals.assignSwapper.description", { station: stationLabel(station) })}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={saving}>
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            form={formId}
            className="btn primary"
            disabled={saving || loadingSwappers}
          >
            {saving ? t("common.saving") : t("modals.assignSwapper.save")}
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
            {t("modals.picker.findSwapper")}
            <span className="sub"> {t("modals.picker.recentSearchHint", { limit: RECENT_PICKER_LIMIT })}</span>
          </span>
          <input
            type="search"
            value={swapperSearch}
            disabled={loadingSwappers || saving}
            onChange={(event) => setSwapperSearch(event.target.value)}
            placeholder={t("modals.picker.searchSwapperFull")}
            autoComplete="off"
            aria-label={t("modals.picker.searchSwapperFull")}
          />
        </label>

        {loadingSwappers ? (
          <p className="sub">{t("modals.picker.loadingSwappers")}</p>
        ) : (
          <label className="field">
            <span>
              {t("modals.assignSwapper.swapperField")} ({t("modals.picker.shownCount", { count: filteredSwappers.length })}
              {!swapperSearch.trim() ? t("modals.picker.shownRecentSuffix", { limit: RECENT_PICKER_LIMIT }) : ""})
            </span>
            <select
              value={swapperId != null ? String(swapperId) : ""}
              disabled={saving || filteredSwappers.length === 0}
              onChange={(event) => {
                const value = event.target.value;
                setSwapperId(value === "" ? null : Number(value));
              }}
              size={Math.min(8, Math.max(4, filteredSwappers.length || 4))}
              className="station-picker create-wallet-user-select"
              aria-label={t("modals.assignSwapper.swapperField")}
            >
              <option value="">
                {filteredSwappers.length === 0 ? t("common.noMatches") : t("modals.picker.noSwapperAssigned")}
              </option>
              {filteredSwappers.map((user) => (
                <option key={user.id} value={String(user.id)}>
                  {swapperOptionLine(user)}
                </option>
              ))}
            </select>
          </label>
        )}

        {selectedSwapper ? (
          <p className="create-wallet-selection sub" role="status">
            {t("modals.picker.selectedPrefix")} <strong>{swapperOptionLine(selectedSwapper)}</strong>
          </p>
        ) : null}
      </form>
    </Modal>
  );
}