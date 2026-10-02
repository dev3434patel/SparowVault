import type { Table } from "dexie";
import type { BaseEntity, ID } from "@/types";
import { nowIso, uid } from "@/lib/utils";
import type { CloudCollectionKey } from "@/lib/cloud/collections";
import { ApiError, isRetryableApiError } from "@/lib/apiClient";
import { useAuthStore } from "@/store/authStore";
import { useCloudAppStore } from "@/store/cloudAppStore";
import { collectionWriteBlocked } from "@/services/modulePolicy";
import { assertTransactionCreateAllowed } from "@/services/transactionMonthlyCap";
import { canUseCloudRepo, cloudRepoGet, cloudRepoHardDelete, cloudRepoHardDeleteAll, cloudRepoList } from "@/lib/cloud/repoClient";
import { commitMutation, enqueueMutation, mergeRemoteList, mutationTable, preserveLegacyPending, requireEmptyOutbox } from "@/services/durableOutbox";

export interface CreateInput<T extends BaseEntity> {
  data: Omit<T, "id" | "userId" | "createdAt" | "updatedAt" | "isDeleted" | "version" | "tags" | "notes"> &
    Partial<Pick<T, "tags" | "notes" | "id">>;
  userId: ID;
}

export class BaseRepo<T extends BaseEntity> {
  constructor(protected table: () => Table<T, string>, protected idPrefix: string, protected cloudCollection?: CloudCollectionKey) {}

  private assertModuleWritable(): void {
    if (!this.cloudCollection) return;
    const blocked = collectionWriteBlocked(useCloudAppStore.getState().flags, this.cloudCollection);
    if (blocked) throw new Error(blocked);
  }

  private canRemote(): boolean {
    return !!this.cloudCollection && canUseCloudRepo(this.cloudCollection);
  }

  async create(input: CreateInput<T>): Promise<T> {
    this.assertModuleWritable();
    if (this.cloudCollection === "transactions") {
      const { useCloudAppStore } = await import("@/store/cloudAppStore");
      const { useDataStore } = await import("@/store/dataStore");
      assertTransactionCreateAllowed(
        useCloudAppStore.getState().effectiveFeatures,
        useDataStore.getState().transactions,
        input.userId,
      );
    }
    const now = nowIso();
    const entity = { ...input.data, id: input.data.id ?? uid(this.idPrefix), userId: input.userId,
      createdAt: now, updatedAt: now, isDeleted: 0, version: 1,
      tags: input.data.tags ?? [], notes: input.data.notes ?? "" } as unknown as T;
    const table = this.table();
    if (this.canRemote()) {
      const mutation = await enqueueMutation(table, this.cloudCollection!, this.idPrefix, "create", entity, entity);
      return commitMutation(table, mutation);
    }
    await table.add(entity);
    return entity;
  }

  async createMany(inputs: CreateInput<T>[]): Promise<T[]> {
    const completed: T[] = [];
    for (const input of inputs) {
      try { completed.push(await this.create(input)); }
      catch (error) {
        throw new Error(`Created ${completed.length} of ${inputs.length} records. Remaining records were not submitted. ${error instanceof Error ? error.message : "Create failed"}`);
      }
    }
    return completed;
  }

  async get(id: ID): Promise<T | undefined> {
    const table = this.table();
    if (!this.canRemote()) return table.get(id);
    const cached = await table.get(id);
    const activeUserId = useAuthStore.getState().currentUser?.id;
    const local = cached && (!activeUserId || cached.userId === activeUserId) ? cached : undefined;
    if (local) {
      await preserveLegacyPending(table, this.cloudCollection!, local.userId);
      const pending = await mutationTable(table.db).where("[userId+collection+entityId]")
        .equals([local.userId, this.cloudCollection!, id]).count();
      if (pending) return local;
    }
    try {
      const remote = await cloudRepoGet<T>(this.cloudCollection!, id, activeUserId ?? local?.userId);
      const queue = mutationTable(table.db);
      return table.db.transaction("rw", [table, queue], async () => {
        const current = await table.get(id);
        const pending = await queue.where("[userId+collection+entityId]").equals([remote.userId, this.cloudCollection!, id]).count();
        if (current && current.userId === remote.userId && (pending || current.version > remote.version)) return current;
        await table.put(remote);
        return remote;
      });
    } catch (error) {
      if (isRetryableApiError(error)) return local;
      if (error instanceof ApiError && error.status === 404) return undefined;
      throw error;
    }
  }

  async list(userId: ID): Promise<T[]> {
    const table = this.table();
    const snapshot = await table.where("userId").equals(userId).toArray();
    if (this.canRemote()) {
      try {
        const remote = await cloudRepoList<T>(this.cloudCollection!, userId);
        return await mergeRemoteList(table, this.cloudCollection!, userId, remote, snapshot);
      } catch (error) {
        if (!isRetryableApiError(error)) throw error;
      }
    }
    return (await table.where("userId").equals(userId).toArray()).filter(row => !row.isDeleted);
  }

  async listIncludingDeleted(userId: ID): Promise<T[]> {
    return this.table().where("userId").equals(userId).toArray();
  }

  async update(id: ID, patch: Partial<T>): Promise<T | undefined> {
    const table = this.table();
    const cached = await table.get(id);
    const activeUserId = useAuthStore.getState().currentUser?.id;
    const current = cached && (!activeUserId || cached.userId === activeUserId) ? cached : await this.get(id);
    if (!current) return undefined;
    for (const field of ["id", "userId", "createdAt", "version"] as const) {
      if (field in patch) throw new Error(`Cannot patch ${field}`);
    }
    const next = { ...current, ...patch, updatedAt: nowIso(), version: (current.version ?? 0) + 1 } as T;
    if (this.canRemote()) {
      await preserveLegacyPending(table, this.cloudCollection!, current.userId);
      const mutation = await enqueueMutation(table, this.cloudCollection!, this.idPrefix, "patch", next, patch, current);
      return commitMutation(table, mutation);
    }
    await table.put(next);
    return next;
  }

  async updateMany(ids: ID[], patch: Partial<T>): Promise<T[]> {
    const out: T[] = [];
    for (const id of ids) {
      const updated = await this.update(id, patch);
      if (updated) out.push(updated);
    }
    return out;
  }

  async softDelete(id: ID): Promise<void> {
    await this.update(id, { isDeleted: 1 } as Partial<T>);
  }

  async softDeleteMany(ids: ID[]): Promise<void> {
    for (const id of ids) await this.softDelete(id);
  }

  async restore(id: ID): Promise<void> {
    await this.update(id, { isDeleted: 0 } as Partial<T>);
  }

  async hardDelete(id: ID): Promise<void> {
    const table = this.table();
    const current = await table.get(id);
    if (this.canRemote()) {
      if (current) {
        await preserveLegacyPending(table, this.cloudCollection!, current.userId);
        await requireEmptyOutbox(table.db, current.userId);
      }
      await cloudRepoHardDelete(this.cloudCollection!, id);
    }
    await table.delete(id);
  }

  async hardDeleteAllForUser(userId: ID): Promise<void> {
    const table = this.table();
    if (this.canRemote()) {
      await preserveLegacyPending(table, this.cloudCollection!, userId);
      await requireEmptyOutbox(table.db, userId);
      await cloudRepoHardDeleteAll(this.cloudCollection!, userId);
    }
    await table.where("userId").equals(userId).delete();
  }

  async count(userId: ID): Promise<number> {
    return (await this.list(userId)).length;
  }
}
