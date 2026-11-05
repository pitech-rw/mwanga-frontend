import { getApiUrl } from "./api";

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

  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAccessToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(`${getApiUrl()}${path}`, {
    ...init,
    headers,
  });
}

export async function login(identifier: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${getApiUrl()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
    let message = "Sign in failed.";

    if (typeof body?.message === "string") {
      message = body.message;
    } else if (Array.isArray(body?.message)) {
      message = body.message.join(" ");
    }

    throw new Error(message);
  }

  return (await response.json()) as LoginResponse;
}

export function displayName(user: AuthUser | null): string {
  if (!user) {
    return "Operator";
  }

  const parts = [user.firstName, user.lastName].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(" ");
  }

  return user.username;
}
