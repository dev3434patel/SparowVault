const AUTH_TOKEN_KEY = "sv:auth_token";
const CSRF_STORAGE_KEY = "sv:csrf_token";

type ApiEnvelope<T> = { ok: boolean; data?: T; error?: string; code?: string };

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
    this.name = "ApiError";
  }
}

export function isRetryableApiError(error: unknown): boolean {
  return error instanceof TypeError ||
    (error instanceof ApiError && (error.status >= 500 || [408, 429].includes(error.status)));
}

function getBaseUrl() {
  // VITE_API_BASE_URL is the browser fetch origin. VITE_API_TARGET is only the Vite
  // proxy upstream and must not be used here (it forces cross-origin credentialed CORS).
  const envBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (typeof window === "undefined") return "";
  if (envBase && envBase.trim().length > 0) return envBase.replace(/\/+$/, "");
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
  // Another tab can log in and replace the shared cookie; tab storage may be stale.
  const cookie = readCsrfCookie();
  if (cookie) return cookie;
  try {
    const stored = sessionStorage.getItem(CSRF_STORAGE_KEY);
    if (stored) return stored;
  } catch {
    /* ignore */
  }
  return null;
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
    throw new ApiError(`API returned an unexpected response (${response.status})`, response.status, "INVALID_RESPONSE");
  }
  let body: ApiEnvelope<T>;
  try { body = (await response.json()) as ApiEnvelope<T>; }
  catch { throw new ApiError("Server response could not be verified", 502, "INVALID_RESPONSE"); }
  if (body.ok && body.data !== undefined) {
    maybeCaptureCsrfFromData(body.data);
  }
  if (!response.ok || !body.ok) {
    throw new ApiError(body.error ?? `Request failed (${response.status})`, response.status, body.code);
  }
  return body.data as T;
}
