"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { userMessageForNetwork, userMessageFromResponse } from "../lib/api-errors";
import { authFetch } from "../lib/auth";
import { useLocale, useT } from "./locale";
import { roleOrUserTypeLabel } from "../lib/role-labels";
import { Modal } from "./modal";

type CatalogEntry = { name: string; group: string };

export type RolePermissionsTarget = {
  id: number;
  name: string;
  permissions: string[];
};

type EditRolePermissionsModalProps = {
  open: boolean;
  target: RolePermissionsTarget | null;
  onClose: () => void;
  onSaved?: () => void;
  onError?: (message: string) => void;
};

export function EditRolePermissionsModal({
  open,
  target,
  onClose,
  onSaved,
  onError,
}: EditRolePermissionsModalProps) {
  const t = useT();
  const { locale } = useLocale();
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    authFetch("/roles/permission-catalog")
      .then(async (response) => {
        if (!response.ok) {
          const message = await userMessageFromResponse("profileUpdate", response);
          throw new Error(message);
        }
        const data = (await response.json()) as { permissions?: CatalogEntry[] };
        if (active) {
          setCatalog(Array.isArray(data.permissions) ? data.permissions : []);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : userMessageForNetwork("create"));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    if (open && target) {
      setSelected(new Set(target.permissions));
      setError(null);
    }
  }, [open, target]);

  const groups = useMemo(() => {
    const map = new Map<string, CatalogEntry[]>();
    for (const entry of catalog) {
      const list = map.get(entry.group) ?? [];
      list.push(entry);
      map.set(entry.group, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [catalog]);

  const toggle = useCallback((name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!target) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await authFetch(`/roles/${target.id}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: [...selected].sort() }),
      });

      if (!response.ok) {
        const message = await userMessageFromResponse("profileUpdate", response);
        throw new Error(message);
      }

      onSaved?.();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : userMessageForNetwork("create");
      setError(message);
      onError?.(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("modals.rolePermissions.title")}
      description={
        target
          ? t("modals.rolePermissions.description", { name: roleOrUserTypeLabel(locale, target.name) })
          : undefined
      }
    >
      <form className="resource-form" onSubmit={onSubmit}>
        <div className="modal-actions" style={{ marginBottom: "1rem" }}>
          <button type="button" className="btn" onClick={onClose} disabled={saving}>
            {t("common.cancel")}
          </button>
          <button type="submit" className="btn primary" disabled={saving || loading || !target}>
            {saving ? t("common.saving") : t("modals.rolePermissions.save")}
          </button>
        </div>

        {error ? (
          <div className="login-error" role="alert">
            {error}
          </div>
        ) : null}

        {loading ? <p className="sub">{t("table.loading")}</p> : null}

        {!loading && groups.length > 0 ? (
          <div className="role-permissions-matrix">
            {groups.map(([group, entries]) => (
              <fieldset key={group} className="role-permissions-group">
                <legend>{group.replace(/-/g, " ")}</legend>
                <ul className="role-permissions-list">
                  {entries.map((entry) => (
                    <li key={entry.name}>
                      <label className="role-permission-label">
                        <input
                          type="checkbox"
                          checked={selected.has(entry.name)}
                          onChange={() => toggle(entry.name)}
                          disabled={saving}
                        />
                        <span>{entry.name}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
            ))}
          </div>
        ) : null}
      </form>
    </Modal>
  );
}