"use client";

import type { FieldSpec } from "../lib/resource-create-config";
import { PasswordInput } from "./password-input";

type ResourceFormFieldProps = {
  field: FieldSpec;
  value: string;
  disabled?: boolean;
  onValueChange: (value: string) => void;
  file: File | null;
  onFileChange: (file: File | null) => void;
  existingFileUrl?: string | null;
};

export function ResourceFormField({
  field,
  value,
  disabled,
  onValueChange,
  file,
  onFileChange,
  existingFileUrl,
}: ResourceFormFieldProps) {
  return (
    <label className="field">
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
          value={value}
          disabled={disabled}
          onChange={(event) => onValueChange(event.target.value)}
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
          value={value}
          placeholder={field.placeholder}
          disabled={disabled}
          onChange={(event) => onValueChange(event.target.value)}
        />
      ) : field.type === "checkbox" ? (
        <input
          type="checkbox"
          checked={value === "true"}
          disabled={disabled}
          onChange={(event) => onValueChange(event.target.checked ? "true" : "false")}
          aria-label={field.label}
        />
      ) : field.type === "file" ? (
        <div className="file-field-stack">
          {existingFileUrl && !file ? (
            // eslint-disable-next-line @next/next/no-img-element -- API-hosted uploads are external to the Next app
            <img
              src={existingFileUrl}
              alt=""
              className="resource-form-photo-preview"
              style={{ maxWidth: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 8 }}
            />
          ) : null}
          <input
            type="file"
            accept={field.accept ?? "image/*"}
            disabled={disabled}
            onChange={(event) => {
              const picked = event.target.files?.[0] ?? null;
              onFileChange(picked);
            }}
          />
          {file ? (
            <p className="sub" role="status">
              Selected: {file.name}
            </p>
          ) : null}
        </div>
      ) : field.type === "password" ? (
        <PasswordInput
          required={field.required}
          value={value}
          placeholder={field.placeholder}
          disabled={disabled}
          minLength={8}
          autoComplete="new-password"
          onChange={onValueChange}
        />
      ) : (
        <input
          required={field.required}
          type={field.type === "number" ? "number" : field.type === "datetime-local" ? "datetime-local" : field.type}
          value={value}
          placeholder={field.placeholder}
          disabled={disabled}
          onChange={(event) => onValueChange(event.target.value)}
        />
      )}
    </label>
  );
}