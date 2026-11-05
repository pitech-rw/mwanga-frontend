export const API_USER_MESSAGES = {
  create: "Unable to create this record. Please try again.",
  load: "Unable to load records. Please try again.",
  signIn: "Unable to sign in. Please try again.",
  signInInvalid: "Invalid credentials.",
  offline: "Unable to reach the server. Please try again.",
} as const;

export type ApiUserAction = keyof typeof API_USER_MESSAGES;

export function userMessageForStatus(action: Exclude<ApiUserAction, "signInInvalid" | "offline">, status: number): string {
  if (action === "signIn" && status === 401) {
    return API_USER_MESSAGES.signInInvalid;
  }

  return API_USER_MESSAGES[action];
}

export function userMessageForNetwork(action: Exclude<ApiUserAction, "signInInvalid">): string {
  return API_USER_MESSAGES.offline;
}
