import { CLOUD_COLLECTIONS, type CloudCollectionKey } from "@/lib/cloud/collections";
import { apiRequest } from "@/lib/apiClient";
import { normalizeMoneyEntityDeep } from "@/utils/moneyEntityNormalize";

export function canUseCloudRepo(collection: string): collection is CloudCollectionKey {
  return (CLOUD_COLLECTIONS as readonly string[]).includes(collection);
}

function pull<T>(collection: CloudCollectionKey, row: unknown): T {
  return normalizeMoneyEntityDeep(collection, row as object, "pull") as T;
}

function push<T>(collection: CloudCollectionKey, row: unknown): T {
  return normalizeMoneyEntityDeep(collection, row as object, "push") as T;
}

export async function cloudRepoCreate<T extends { userId: string }>(
  collection: CloudCollectionKey,
  userId: string,
  data: Partial<T>,
  idPrefix: string,
) {
  const body = push<T>(collection, data);
  const raw = await apiRequest<unknown>(`/api/data/entity.php?collection=${encodeURIComponent(collection)}`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ userId, data: body, idPrefix }),
  });
  return pull<T>(collection, raw);
}

export async function cloudRepoGet<T>(collection: CloudCollectionKey, id: string) {
  const raw = await apiRequest<unknown>(
    `/api/data/entity-item.php?collection=${encodeURIComponent(collection)}&id=${encodeURIComponent(id)}`,
    { method: "GET", auth: true },
  );
  return pull<T>(collection, raw);
}

export async function cloudRepoList<T>(collection: CloudCollectionKey, userId: string) {
  const rows = await apiRequest<unknown[]>(
    `/api/data/entity.php?collection=${encodeURIComponent(collection)}&userId=${encodeURIComponent(userId)}`,
    {
      method: "GET",
      auth: true,
    },
  );
  return rows.map((row) => pull<T>(collection, row));
}

export async function cloudRepoUpdate<T>(
  collection: CloudCollectionKey,
  id: string,
  patch: Partial<T>,
) {
  const body = push<T>(collection, patch);
  const raw = await apiRequest<unknown>(
    `/api/data/entity-item.php?collection=${encodeURIComponent(collection)}&id=${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      auth: true,
      body: JSON.stringify({ patch: body }),
    },
  );
  return pull<T>(collection, raw);
}

export async function cloudRepoUpdateMany<T>(
  collection: CloudCollectionKey,
  ids: string[],
  patch: Partial<T>,
) {
  const body = push<T>(collection, patch);
  const res = await apiRequest<{ updated: unknown[]; count: number }>(
    `/api/data/entity.php?collection=${encodeURIComponent(collection)}`,
    {
      method: "PATCH",
      auth: true,
      body: JSON.stringify({ ids, patch: body }),
    },
  );
  return {
    ...res,
    updated: res.updated.map((row) => pull<T>(collection, row)),
  };
}

export async function cloudRepoSoftDelete<T>(collection: CloudCollectionKey, id: string) {
  const raw = await apiRequest<unknown>(
    `/api/data/entity-item.php?collection=${encodeURIComponent(collection)}&id=${encodeURIComponent(id)}`,
    { method: "DELETE", auth: true },
  );
  return pull<T>(collection, raw);
}

export async function cloudRepoHardDelete(collection: CloudCollectionKey, id: string) {
  return apiRequest<{ hardDeleted: boolean }>(
    `/api/data/entity-item.php?collection=${encodeURIComponent(collection)}&id=${encodeURIComponent(id)}&hard=1`,
    {
      method: "DELETE",
      auth: true,
    },
  );
}

export async function cloudRepoHardDeleteAll(collection: CloudCollectionKey, userId: string) {
  return apiRequest<{ deleted: number }>(
    `/api/data/entity.php?collection=${encodeURIComponent(collection)}&userId=${encodeURIComponent(userId)}`,
    { method: "DELETE", auth: true },
  );
}

export async function cloudRepoSoftDeleteMany(collection: CloudCollectionKey, ids: string[]) {
  return apiRequest<{ deleted: number }>(
    `/api/data/entity.php?collection=${encodeURIComponent(collection)}`,
    {
      method: "DELETE",
      auth: true,
      body: JSON.stringify({ ids }),
    },
  );
}
