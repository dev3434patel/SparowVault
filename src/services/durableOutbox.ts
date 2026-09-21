import type Dexie from "dexie";
import type { Table } from "dexie";
import { ApiError, isRetryableApiError } from "@/lib/apiClient";
import { cloudRepoCreate, cloudRepoGet, cloudRepoUpdate } from "@/lib/cloud/repoClient";
import type { CloudCollectionKey } from "@/lib/cloud/collections";
import type { BaseEntity } from "@/types";
import { uid } from "@/lib/utils";

export interface DurableMutation {
  sequence?: number;
  mutationId: string;
  userId: string;
  collection: CloudCollectionKey;
  tableName: string;
  entityId: string;
  operation: "create" | "patch" | "review";
  payload: Partial<BaseEntity>;
  local: BaseEntity;
  before?: BaseEntity;
  expectedVersion: number;
  idPrefix: string;
  state: "pending" | "syncing" | "conflict" | "rejected";
  updatedAt: string;
  error?: string;
  errorStatus?: number;
  errorCode?: string;
}

export function mutationTable(db: Dexie): Table<DurableMutation, number> {
  return db.table("syncMutations");
}

export async function pendingMutations(db: Dexie, userId: string): Promise<DurableMutation[]> {
  return (await mutationTable(db).where("userId").equals(userId).toArray())
    .sort((a, b) => a.sequence! - b.sequence!);
}

// Old markers cannot be replayed safely: the operation and base version were never saved.
export async function preserveLegacyPending<T extends BaseEntity>(table: Table<T, string>, collection: CloudCollectionKey, userId: string) {
  if (typeof localStorage === "undefined") return;
  const raw = localStorage.getItem("sparowvault_sync_outbox_v1");
  if (!raw) return;
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("Legacy sync metadata needs recovery before refreshing data");
  const queue = mutationTable(table.db);
  await table.db.transaction("rw", [table, queue], async () => {
    for (const entry of parsed) {
      if (entry?.collection !== collection || typeof entry.entityId !== "string" || entry.state === "synced") continue;
      const local = await table.get(entry.entityId);
      if (!local || local.userId !== userId) continue;
      if (await queue.where("[userId+collection+entityId]").equals([userId, collection, local.id]).count()) continue;
      await queue.add({ mutationId: uid("legacy"), userId, collection, tableName: table.name, entityId: local.id,
        operation: "review", payload: local, local, expectedVersion: local.version, idPrefix: "ent",
        state: "conflict", updatedAt: new Date().toISOString(), error: "Legacy unsynced change requires review; no replay payload was recorded." });
    }
  });
}

export async function enqueueMutation<T extends BaseEntity>(table: Table<T, string>, collection: CloudCollectionKey, idPrefix: string,
  operation: "create" | "patch", local: T, payload: Partial<T>, before?: T): Promise<DurableMutation> {
  const queue = mutationTable(table.db);
  const item: DurableMutation = { mutationId: uid("mut"), userId: local.userId, collection, tableName: table.name,
    entityId: local.id, operation, payload, local, before, expectedVersion: before?.version ?? 0,
    idPrefix, state: "pending", updatedAt: new Date().toISOString() };
  await table.db.transaction("rw", [table, queue], async () => {
    const current = await table.get(local.id);
    if (operation === "create" && current) throw new Error("Entity already exists on this device");
    if (operation === "patch" && (!current || current.userId !== local.userId || current.version !== before?.version)) {
      throw new Error("Record changed on this device. Reload before editing.");
    }
    item.sequence = await queue.add(item);
    await table.put(local);
  });
  return item;
}

const drains = new Map<string, Promise<void>>();

export async function replayMutations(db: Dexie, userId: string, isActive: () => boolean = () => true): Promise<void> {
  const lockKey = `${db.name}:${userId}`;
  const existing = drains.get(lockKey);
  if (existing) { await existing; return replayMutations(db, userId, isActive); }
  const drain = async () => {
    const queue = mutationTable(db);
    for (const item of await pendingMutations(db, userId)) {
      if (!isActive() || item.state === "conflict" || item.state === "rejected") break;
      const table = db.table<BaseEntity, string>(item.tableName);
      await queue.update(item.sequence!, { state: "syncing" });
      let remote: BaseEntity;
      try {
        remote = item.operation === "create"
          ? await cloudRepoCreate<BaseEntity>(item.collection, userId, item.payload, item.idPrefix, item.mutationId)
          : await cloudRepoUpdate<BaseEntity>(item.collection, item.entityId, item.payload,
            { userId, mutationId: item.mutationId, expectedVersion: item.expectedVersion });
        if (remote.id !== item.entityId || remote.userId !== userId) throw new ApiError("Server returned a different record owner or id", 409, "RESPONSE_MISMATCH");
      } catch (error) {
        const retry = isRetryableApiError(error) || (error instanceof ApiError && error.status === 401);
        const conflict = error instanceof ApiError && [409, 428].includes(error.status);
        await db.transaction("rw", [queue, table], async () => {
          await queue.update(item.sequence!, { state: retry ? "pending" : conflict ? "conflict" : "rejected",
            error: error instanceof Error ? error.message : "Sync failed", errorStatus: error instanceof ApiError ? error.status : undefined,
            errorCode: error instanceof ApiError ? error.code : undefined, updatedAt: new Date().toISOString() });
          const later = await queue.where("[userId+collection+entityId]").equals([userId, item.collection, item.entityId]).filter(row => row.sequence! > item.sequence!).count();
          if (!retry && !conflict && !later) {
            if (item.before) await table.put(item.before);
            else await table.delete(item.entityId);
          }
        });
        break;
      }
      // A lost acknowledgement leaves the immutable request queued for an idempotent retry.
      await db.transaction("rw", [queue, table], async () => {
        await queue.delete(item.sequence!);
        const later = await queue.where("[userId+collection+entityId]").equals([userId, item.collection, item.entityId]).count();
        if (!later) await table.put(remote);
      });
    }
  };
  const run = (async () => {
    if (typeof navigator !== "undefined" && navigator.locks) await navigator.locks.request(`sparowvault-sync:${lockKey}`, drain);
    else await drain();
  })();
  drains.set(lockKey, run);
  try { await run; } finally { if (drains.get(lockKey) === run) drains.delete(lockKey); }
}

export async function commitMutation<T extends BaseEntity>(table: Table<T, string>, item: DurableMutation): Promise<T> {
  await replayMutations(table.db, item.userId);
  const pending = await mutationTable(table.db).get(item.sequence!);
  if (pending?.state === "rejected" || pending?.state === "conflict") {
    throw new ApiError(pending.error || "Change needs review", pending.errorStatus || 409, pending.errorCode);
  }
  return (await table.get(item.entityId)) ?? item.local as T;
}

export async function mergeRemoteList<T extends BaseEntity>(table: Table<T, string>, collection: CloudCollectionKey, userId: string, remote: T[], snapshot?: T[]): Promise<T[]> {
  await preserveLegacyPending(table, collection, userId);
  if (remote.some(row => row.userId !== userId)) throw new Error("Server returned records belonging to another user");
  const queue = mutationTable(table.db);
  return table.db.transaction("rw", [table, queue], async () => {
    const pending = await queue.where("[userId+collection]").equals([userId, collection]).toArray();
    const protectedIds = new Set(pending.map(row => row.entityId));
    const remoteIds = new Set(remote.map(row => row.id));
    const current = await table.where("userId").equals(userId).toArray();
    const versions = new Map((snapshot ?? current).map(row => [row.id, row.version]));
    for (const row of current) if (versions.get(row.id) !== row.version) protectedIds.add(row.id);
    const currentById = new Map(current.map(row => [row.id, row]));
    await table.bulkDelete(current.filter(row => !remoteIds.has(row.id) && !protectedIds.has(row.id)).map(row => row.id));
    await table.bulkPut(remote.filter(row => !protectedIds.has(row.id) && (currentById.get(row.id)?.version ?? 0) <= row.version));
    // Legacy tables key by entity ID only. Restore this owner's pending projection from its durable payload.
    const latest = new Map(pending.map(item => [item.entityId, item]));
    for (const item of latest.values()) {
      if (item.state !== "rejected") {
        const cached = await table.get(item.entityId);
        if (!cached || cached.userId !== userId) await table.put(item.local as T);
      }
    }
    return (await table.where("userId").equals(userId).toArray()).filter(row => !row.isDeleted);
  });
}

export async function requireEmptyOutbox(db: Dexie, userId: string): Promise<void> {
  if ((await pendingMutations(db, userId)).length) throw new Error("Resolve unsynced changes before permanently deleting data");
}

/** Explicit user-confirmed discard of an entity's queued changes, never an automatic conflict merge. */
export async function useServerVersion(db: Dexie, item: DurableMutation): Promise<void> {
  const queue = mutationTable(db);
  const pending = await queue.where("[userId+collection+entityId]").equals([item.userId, item.collection, item.entityId]).toArray();
  if (pending.some(row => row.state === "syncing")) throw new Error("Wait for the active sync to finish");
  let remote: BaseEntity | undefined;
  try { remote = await cloudRepoGet<BaseEntity>(item.collection, item.entityId, item.userId); }
  catch (error) { if (!(error instanceof ApiError && error.status === 404)) throw error; }
  if (remote && remote.userId !== item.userId) throw new Error("Account changed. Sign in to the original account.");
  const table = db.table<BaseEntity, string>(item.tableName);
  await db.transaction("rw", [queue, table], async () => {
    const current = await queue.where("[userId+collection+entityId]").equals([item.userId, item.collection, item.entityId]).toArray();
    if (current.length !== pending.length || current.some((row, i) => row.sequence !== pending[i]?.sequence || row.state === "syncing")) {
      throw new Error("Pending changes changed. Review again before discarding.");
    }
    await queue.bulkDelete(pending.map(row => row.sequence!));
    if (remote) await table.put(remote);
    else await table.delete(item.entityId);
  });
  if (typeof localStorage !== "undefined") {
    const raw = localStorage.getItem("sparowvault_sync_outbox_v1");
    if (raw) {
      const entries: unknown = JSON.parse(raw);
      if (Array.isArray(entries)) localStorage.setItem("sparowvault_sync_outbox_v1", JSON.stringify(entries.filter(row => row?.collection !== item.collection || row?.entityId !== item.entityId)));
    }
  }
}
