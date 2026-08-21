const AUTH_TOKEN_KEY = "sv:auth_token";
const CSRF_STORAGE_KEY = "sv:csrf_token";

type ApiEnvelope<T> = { ok: boolean; data?: T; error?: string; code?: string };

function getBaseUrl() {
  const envTarget = import.meta.env.VITE_API_TARGET as string | undefined;
  const envBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (typeof window === "undefined") return "";
  if (envBase && envBase.trim().length > 0) return envBase.replace(/\/+$/, "");
  if (envTarget && envTarget.trim().length > 0) return envTarget.replace(/\/+$/, "");
  return window.location.origin;
}

export function getCloudToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY) ?? localStorage.getItem("sv:cloud_token");
}

export function setCloudToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    // Phase 1: auth is carried by an httpOnly cookie. Remove legacy readable JWTs.
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem("sv:cloud_token");
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem("sv:cloud_token");
  }
}

export function clearCloudToken() {
  setCloudToken(null);
}

/** Persist CSRF from login/me JSON so cross-origin clients can send X-CSRF-Token. */
export function setCsrfToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) sessionStorage.setItem(CSRF_STORAGE_KEY, token);
    else sessionStorage.removeItem(CSRF_STORAGE_KEY);
  } catch {
    /* private mode */
  }
}

function readCsrfCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)sv_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function readCsrfToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = sessionStorage.getItem(CSRF_STORAGE_KEY);
    if (stored) return stored;
  } catch {
    /* ignore */
  }
  return readCsrfCookie();
}

function maybeCaptureCsrfFromData(data: unknown): void {
  if (data && typeof data === "object" && "csrfToken" in data) {
    const t = (data as { csrfToken?: unknown }).csrfToken;
    if (typeof t === "string" && t.length > 0) setCsrfToken(t);
  }
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit & { auth?: boolean },
): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  headers.set("Content-Type", "application/json");
  const method = (init?.method ?? "GET").toUpperCase();
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const csrf = readCsrfToken();
    if (csrf) headers.set("X-CSRF-Token", csrf);
  }
  if (init?.auth) {
    const token = getCloudToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(`${getBaseUrl()}${path}`, { ...init, headers, credentials: "include" });
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    throw new Error(`API returned non-JSON response (${response.status}): ${text.slice(0, 80)}`);
  }
  const body = (await response.json()) as ApiEnvelope<T>;
  if (body.ok && body.data !== undefined) {
    maybeCaptureCsrfFromData(body.data);
  }
  if (!response.ok || !body.ok) {
    throw new Error(body.error ?? `Request failed (${response.status})`);
  }
  return body.data as T;
}
