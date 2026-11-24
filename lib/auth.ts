import { getApiUrl } from "./api";
import { userMessageFromApiCode, userMessageFromResponse, type ApiSuccessBody } from "./api-errors";
import { userDisplayName } from "./user-display";

const TOKEN_KEY = "mwanga-access-token";
const USER_KEY = "mwanga-user";

export type AuthUser = {
  id: number;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  type: string;
  role: { id: number; name: string };
  permissions: string[];
  isActive: boolean;
};

export type MyProfile = AuthUser & {
  phone?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  image?: string | null;
  nationalId?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type LoginResponse = {
  accessToken: string;
  tokenType: "Bearer";
  user: AuthUser;
};

export function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(USER_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setSession(response: LoginResponse): void {
  localStorage.setItem(TOKEN_KEY, response.accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(response.user));
}

export function setStoredUser(user: AuthUser): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function authUserFromMyProfile(profile: MyProfile): AuthUser {
  return {
    id: profile.id,
    username: profile.username,
    email: profile.email,
    firstName: profile.firstName,
    lastName: profile.lastName,
    type: profile.type,
    role: profile.role,
    permissions: profile.permissions,
    isActive: profile.isActive,
  };
}

export async function fetchMyProfile(view: "persona" | "full" = "full"): Promise<MyProfile> {
  const response = await authFetch(`/auth/me?view=${view}`);

  if (!response.ok) {
    throw new Error(await userMessageFromResponse("profileLoad", response));
  }

  return (await response.json()) as MyProfile;
}

export type UpdateMePayload = {
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  image?: string;
  password?: string;
  currentPassword?: string;
};

export async function updateMyProfile(payload: UpdateMePayload): Promise<MyProfile> {
  const response = await authFetch("/auth/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await userMessageFromResponse("profileUpdate", response));
  }

  const profile = (await response.json()) as MyProfile;
  setStoredUser(authUserFromMyProfile(profile));
  return profile;
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function authHeaders(extra?: HeadersInit): HeadersInit {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    ...(extra as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);

  if (!headers.has("Content-Type") && init?.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAccessToken()

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(`${getApiUrl()}${path}`, {
    ...init,
    headers,
  });
}

export async function requestPasswordReset(email: string): Promise<ApiSuccessBody> {
  const response = await fetch(`${getApiUrl()}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim() }),
  });

  if (!response.ok) {
    throw new Error(await userMessageFromResponse("forgotPassword", response));
  }

  return (await response.json()) as ApiSuccessBody;
}

export async function resetPassword(token: string, password: string): Promise<ApiSuccessBody> {
  const response = await fetch(`${getApiUrl()}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });

  if (!response.ok) {
    throw new Error(await userMessageFromResponse("resetPassword", response));
  }

  return (await response.json()) as ApiSuccessBody;
}

export { userMessageFromApiCode };

export async function login(identifier: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${getApiUrl()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });

  if (!response.ok) {
    throw new Error(await userMessageFromResponse("signIn", response));
  }

  return (await response.json()) as LoginResponse;
}

export type ErasureRequestSummary = {
  id: number;
  userId: number;
  status: string;
  requestedAt: string;
  approvedAt?: string | null;
  completedAt?: string | null;
  reason?: string | null;
};

export async function fetchLatestErasureRequest(): Promise<ErasureRequestSummary | null> {
  const response = await authFetch("/auth/erasure-request");
  if (response.status === 204) {
    return null;
  }
  if (!response.ok) {
    throw new Error(await userMessageFromResponse("profileLoad", response));
  }
  const body = (await response.json()) as ErasureRequestSummary | null;
  return body;
}

export async function createErasureRequest(reason?: string): Promise<ErasureRequestSummary> {
  const response = await authFetch("/auth/erasure-request", {
    method: "POST",
    body: JSON.stringify(reason ? { reason } : {}),
  });
  if (!response.ok) {
    throw new Error(await userMessageFromResponse("profileUpdate", response));
  }
  return (await response.json()) as ErasureRequestSummary;
}

export async function confirmErasureRequest(payload: {
  password: string;
  acknowledgeBalanceForfeiture?: boolean;
}): Promise<void> {
  const response = await authFetch("/auth/erasure-request/confirm", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await userMessageFromResponse("profileUpdate", response));
  }
}

export function displayName(user: AuthUser | null): string {
  if (!user) {
    return "Operator";
  }

  return userDisplayName(user);
}
