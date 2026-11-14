import { userMessageForNetwork, userMessageFromResponse } from "./api-errors";
import { authFetch } from "./auth";
import { getApiUrl } from "./api";

export async function uploadStationPhoto(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);

  const response = await authFetch("/uploads/station-photo", {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    throw new Error(await userMessageFromResponse("create", response));
  }

  let path: unknown;
  try {
    const data = (await response.json()) as { path?: string };
    path = data.path;
  } catch {
    throw new Error(userMessageForNetwork("create"));
  }

  if (typeof path !== "string" || !path.startsWith("/")) {
    throw new Error("Upload did not return a valid photo path.");
  }

  return `${getApiUrl()}${path}`;
}