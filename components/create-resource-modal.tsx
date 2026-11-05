"use client";

import { FormEvent, useEffect, useState } from "react";
import { authFetch } from "../lib/auth";
import { userMessageForNetwork, userMessageForStatus } from "../lib/api-errors";
import { buildCreatePayload, getCreateConfig, type CreateResourceConfig } from "../lib/resource-create-config";
import type { Section } from "../lib/nav";
import { Modal } from "./modal";

type CreateResourceModalProps = {
  open: boolean;
  section: Section;
  onClose: () => void;
  onCreated?: () => void;
  onError?: (message: string) => void;
};

function emptyValues(config: CreateResourceConfig): Record<string, string> {
  return Object.fromEntries(config.fields.map((field) => [field.name, ""]));
}

export function CreateResourceModal({ open, section, onClose, onCreated, onError }: CreateResourceModalProps) {
  const config = getCreateConfig(section);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cfg = getCreateConfig(section);
    if (open && cfg) {
      setValues(emptyValues(cfg));
      setError(null);
    }
  }, [open, section]);

  if (!config) {
    return null;
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await authFetch(config.apiPath, {
        method: "POST",
        body: JSON.stringify(buildCreatePayload(config, values)),
      });

      if (!response.ok) {
        setError(userMessageForStatus("create", response.status));
        onError?.(userMessageForStatus("create", response.status));
        return;
      }

      onCreated?.();
      onClose();
    } catch {
      setError(userMessageForNetwork("create"));
      onError?.(userMessageForNetwork("create"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title={config.title} description={config.description} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        {error ? (
          <div className="login-error" role="alert">
            {error}
          </div>
        ) : null}

        {config.fields.map((field) => (
          <label key={field.name} className="field">
            <span>
              {field.label}
              {field.required ? (
                <>
                  <span className="col-required" aria-hidden="true">
                    {" "}
                    *
                  </span>
                  <span className="sr-only"> (required)</span>
                </>
              ) : null}
            </span>
            {field.type === "select" ? (
              <select
                required={field.required}
                value={values[field.name] ?? ""}
                onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}
              >
                <option value="">Select…</option>
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : field.type === "textarea" ? (
              <textarea
                required={field.required}
                rows={3}
                value={values[field.name] ?? ""}
                placeholder={field.placeholder}
                onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}
              />
            ) : (
              <input
                required={field.required}
                type={field.type}
                value={values[field.name] ?? ""}
                placeholder={field.placeholder}
                minLength={field.type === "password" ? 8 : undefined}
                onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}
              />
            )}
          </label>
        ))}

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? "Saving…" : config.submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
