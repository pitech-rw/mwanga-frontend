export const API_USER_MESSAGES = {
  create: "Unable to create this record. Please try again.",
  load: "Unable to load records. Please try again.",
  signIn: "Unable to sign in. Please try again.",
  signInInvalid: "Invalid credentials.",
  offline: "Unable to reach the server. Please try again.",
} as const;

export type ApiUserAction = keyof typeof API_USER_MESSAGES;

type ApiErrorBody = {
  statusCode?: number;
  message?: string | string[];
  error?: string;
};

export function messageFromApiErrorBody(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const { message } = data as ApiErrorBody;

  if (typeof message === "string") {
    const trimmed = message.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (Array.isArray(message)) {
    const parts = message
      .filter((part): part is string => typeof part === "string")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);

    return parts.length > 0 ? parts.join(" ") : null;
  }

  return null;
}

export function userMessageForStatus(action: Exclude<ApiUserAction, "signInInvalid" | "offline">, status: number): string {
  if (action === "signIn" && status === 401) {
    return API_USER_MESSAGES.signInInvalid;
  }

  return API_USER_MESSAGES[action];
}

export async function userMessageFromResponse(
  action: Exclude<ApiUserAction, "signInInvalid" | "offline">,
  response: Response,
): Promise<string> {
  try {
    const data: unknown = await response.json();
    const fromBody = messageFromApiErrorBody(data);

    if (fromBody) {
      return fromBody;
    }
  } catch {
    // Response body is missing or not JSON.
  }

  return userMessageForStatus(action, response.status);
}

export function userMessageForNetwork(action: Exclude<ApiUserAction, "signInInvalid">): string {
  return API_USER_MESSAGES.offline;
}
