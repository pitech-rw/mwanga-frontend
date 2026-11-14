import type { FieldSpec } from "./resource-create-config";
import { uploadStationPhoto } from "./upload-station-photo";

export function emptyFileState(fields: FieldSpec[]): Record<string, File | null> {
  const entries = fields.filter((field) => field.type === "file").map((field) => [field.name, null] as const);
  return Object.fromEntries(entries);
}

export async function mergeUploadedFiles(
  fields: FieldSpec[],
  files: Record<string, File | null>,
  target: Record<string, unknown>,
): Promise<void> {
  for (const field of fields) {
    if (field.type !== "file") {
      continue;
    }
    const file = files[field.name];
    if (!file) {
      continue;
    }
    if (field.name === "photo") {
      target[field.name] = await uploadStationPhoto(file);
    }
  }
}