import { CLOUD_COLLECTIONS, type CloudCollectionKey } from "@/lib/cloud/collections";
import { apiRequest, clearCloudToken, setCloudToken, setCsrfToken } from "@/lib/apiClient";
import { normalizeMoneyEntityDeep } from "@/utils/moneyEntityNormalize";

export async function cloudRegister(input: {
  username: string;
  displayName: string;
  pin: string;
  policyAcceptances: Array<{ key: string; version: string }>;
}) {
  const data = await apiRequest<{
    user: { id: string; username: string; displayName: string; policyOutstanding?: Array<{ key: string; version: string }> };
    csrfToken?: string;
  }>("/api/auth/register.php", { method: "POST", body: JSON.stringify(input) });
  setCloudToken(null);
  if (data.csrfToken) setCsrfToken(data.csrfToken);
  return data.user;
}

export async function cloudLogin(input: { username: string; pin: string }) {
  const data = await apiRequest<{
    user: { id: string; username: string; displayName: string; role?: string; policyOutstanding?: Array<{ key: string; version: string }> };
    csrfToken?: string;
  }>("/api/auth/login.php", { method: "POST", body: JSON.stringify(input) });
  setCloudToken(null);
  if (data.csrfToken) setCsrfToken(data.csrfToken);
  return data.user;
}

export async function fetchPolicyVersions() {
  return apiRequest<{
    versions: Record<string, string>;
    outstanding: Array<{ key: string; version: string }>;
  }>("/api/policies/current.php", { auth: true });
}

export async function acceptPolicies(accept: Array<{ key: string; version: string }>) {
  return apiRequest<{ accepted: Array<{ key: string; version: string }> }>("/api/policies/accept.php", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ accept }),
  });
}

export async function cloudAdminLogin(input: { username: string; pin: string }) {
  const data = await apiRequest<{
    user: { id: string; username: string; displayName: string; role?: string };
    csrfToken?: string;
  }>("/api/auth/admin-login.php", { method: "POST", body: JSON.stringify(input) });
  setCloudToken(null);
  if (data.csrfToken) setCsrfToken(data.csrfToken);
  return data.user;
}

export async function cloudMe() {
  return apiRequest<{
    mustChangePin?: boolean;
    id: string;
    username: string;
    displayName: string;
    role?: string;
    mobile?: string | null;
    email?: string | null;
    avatarEmoji?: string | null;
    avatarColor?: string | null;
    securityQuestion?: string | null;
    csrfToken?: string;
  }>(
    "/api/auth/me.php",
    {
      method: "GET",
      auth: true,
    },
  );
}

export async function cloudLogout() {
  let revoked = false;
  try {
    await apiRequest<{ loggedOut: boolean }>("/api/auth/logout.php", { method: "POST" });
    revoked = true;
  } catch {
    // Best-effort cookie cleanup; local app state is still cleared below.
  }
  clearCloudToken();
  setCsrfToken(null);
  return revoked;
}

export async function cloudSyncPush(_collections: Partial<Record<CloudCollectionKey, unknown[]>>) {
  const stamped: Partial<Record<CloudCollectionKey, unknown[]>> = {};
  for (const key of CLOUD_COLLECTIONS) {
    const rows = _collections[key];
    if (!Array.isArray(rows)) continue;
    stamped[key] = rows.map((r) => normalizeMoneyEntityDeep(key, r as object, "push"));
  }
  return apiRequest<{ upserted: number }>("/api/cloud/sync/push.php", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ collections: stamped }),
  });
}

export async function cloudSyncPull() {
  const data = await apiRequest<{ collections: Record<CloudCollectionKey, unknown[]> }>(
    "/api/cloud/sync/pull.php",
    {
      method: "GET",
      auth: true,
    },
  );
  const collections = { ...data.collections };
  for (const key of CLOUD_COLLECTIONS) {
    const rows = collections[key];
    if (!Array.isArray(rows)) continue;
    collections[key] = rows.map((r) => normalizeMoneyEntityDeep(key, r as object, "pull"));
  }
  return { collections };
}

export function buildCloudCollectionsFromDataStore(store: Record<string, unknown>) {
  const out: Partial<Record<CloudCollectionKey, unknown[]>> = {};
  for (const key of CLOUD_COLLECTIONS) {
    const value = store[key];
    if (Array.isArray(value)) out[key] = value;
  }
  return out;
}
