import type { FieldSpec } from "./resource-create-config";
import type { ResourceSection } from "./resource-create-config";

function parseNumber(raw: string): number | null {
  const t = raw.trim();
  if (t === "") {
    return null;
  }
  const n = Number(t);
  if (Number.isNaN(n)) {
    return null;
  }
  return n;
}

function toDatetimeLocalValue(iso: unknown): string {
  if (typeof iso !== "string" || !iso) {
    return "";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Initial string values for the generic edit form (checkbox → "true" | "false"). */
export function initialValuesForUpdate(
  section: ResourceSection,
  row: Record<string, unknown>,
  fields: FieldSpec[],
): Record<string, string> {
  const values: Record<string, string> = {};

  for (const field of fields) {
    if (field.type === "checkbox") {
      const v = row[field.name];
      values[field.name] = v === true || v === 1 || v === "true" ? "true" : "false";
      continue;
    }

    const v = row[field.name];
    if (field.type === "datetime-local") {
      values[field.name] = toDatetimeLocalValue(v);
      continue;
    }

    if (v === null || v === undefined) {
      values[field.name] = "";
      continue;
    }

    if (typeof v === "object") {
      values[field.name] = "";
      continue;
    }

    values[field.name] = String(v);
  }

  return values;
}

/**
 * Builds a PATCH body: only keys the user changed; empty optional fields are omitted.
 * Nullable IDs: clearing `stationId` / `bikeId` (batteries) or `stationId` (users) sends `null`.
 */
export function buildUpdatePatchPayload(
  section: ResourceSection,
  row: Record<string, unknown>,
  fields: FieldSpec[],
  values: Record<string, string>,
): Record<string, unknown> | null {
  const patch: Record<string, unknown> = {};
  let anyChange = false;

  const origStr = (name: string): string => {
    const v = row[name];
    if (v === null || v === undefined) {
      return "";
    }
    if (typeof v === "object") {
      return "";
    }
    return String(v);
  };

  for (const field of fields) {
    const raw = values[field.name] ?? "";
    const trimmed = raw.trim();

    if (field.type === "checkbox") {
      const next = raw === "true";
      const prev =
        row[field.name] === true || row[field.name] === 1 || row[field.name] === "true";
      if (next !== prev) {
        patch[field.name] = next;
        anyChange = true;
      }
      continue;
    }

    if (field.type === "password") {
      if (trimmed === "") {
        continue;
      }
      patch[field.name] = trimmed;
      anyChange = true;
      continue;
    }

    if (field.type === "number") {
      if (trimmed === "") {
        if (section === "batteries" && (field.name === "stationId" || field.name === "bikeId")) {
          if (row[field.name] != null) {
            patch[field.name] = null;
            anyChange = true;
          }
          continue;
        }
        if (section === "users" && field.name === "stationId") {
          if (row[field.name] != null) {
            patch[field.name] = null;
            anyChange = true;
          }
          continue;
        }
        continue;
      }

      const n = parseNumber(trimmed);
      if (n === null) {
        return null;
      }

      if (origStr(field.name) !== trimmed) {
        patch[field.name] = n;
        anyChange = true;
      }
      continue;
    }

    if (field.type === "datetime-local") {
      if (trimmed === "") {
        continue;
      }
      const iso = new Date(trimmed).toISOString();
      const before = (() => {
        const v = row[field.name];
        return typeof v === "string" ? new Date(v).toISOString() : "";
      })();
      if (iso !== before) {
        patch[field.name] = iso;
        anyChange = true;
      }
      continue;
    }

    if (trimmed === "") {
      continue;
    }

    if (origStr(field.name) !== trimmed) {
      patch[field.name] = trimmed;
      anyChange = true;
    }
  }

  if (!anyChange) {
    return null;
  }

  return patch;
}
