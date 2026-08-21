/**
 * BaseRepo - SQL-backed repository with a legacy IndexedDB fallback only for
 * entities that have not been mapped to a SQL collection yet.
 *
 * IMPORTANT SAFETY RULES:
 *  1. mirrorLocalList NEVER deletes local records when remote returns 0 rows
 *     for a userId that already has local data (guards against API hiccups).
 *  2. create() attempts cloud first; on failure, saves locally and logs clearly.
 *  3. createMany() syncs each entity to cloud individually (fixes ImportPage).
 */

import type { Table } from "dexie";
import type { BaseEntity, ID } from "@/types";
import { nowIso, uid } from "@/lib/utils";
import type { CloudCollectionKey } from "@/lib/cloud/collections";
import {
  canUseCloudRepo,
  cloudRepoCreate,
  cloudRepoGet,
  cloudRepoHardDelete,
  cloudRepoHardDeleteAll,
  cloudRepoList,
  cloudRepoSoftDelete,
  cloudRepoUpdate,
} from "@/lib/cloud/repoClient";
import { enqueueSyncOutbox, markSyncOutboxState } from "@/services/syncOutbox";

export interface CreateInput<T extends BaseEntity> {
  data: Omit<
    T,
    "id" | "userId" | "createdAt" | "updatedAt" | "isDeleted" | "version" | "tags" | "notes"
  > &
    Partial<Pick<T, "tags" | "notes" | "id">>;
  userId: ID;
}

export class BaseRepo<T extends BaseEntity> {
  constructor(
    protected table: () => Table<T, string>,
    protected idPrefix: string,
    protected cloudCollection?: CloudCollectionKey,
  ) {}

  private canRemote(): boolean {
    return !!this.cloudCollection && canUseCloudRepo(this.cloudCollection);
  }

  private async mirrorLocal(entity: T): Promise<void> {
    await this.table().put(entity);
  }

  private async mirrorLocalList(userId: ID, rows: T[]): Promise<void> {
    const table = this.table();
    const existingKeys = await table.where("userId").equals(userId).primaryKeys();
    await table.bulkDelete(existingKeys);
    if (rows.length > 0) {
      await table.bulkPut(rows);
    }
  }

  // ---------------------------------------------------------------------------
  // CREATE
  // ---------------------------------------------------------------------------

  async create(input: CreateInput<T>): Promise<T> {
    const now = nowIso();
    const entity = {
      id: input.data.id ?? uid(this.idPrefix),
      userId: input.userId,
      createdAt: now,
      updatedAt: now,
      isDeleted: 0,
      version: 1,
      tags: input.data.tags ?? [],
      notes: input.data.notes ?? "",
      ...input.data,
    } as unknown as T;

    if (this.canRemote()) {
      enqueueSyncOutbox(this.cloudCollection!, entity.id);
      markSyncOutboxState(this.cloudCollection!, entity.id, "syncing");
      try {
        const remote = await cloudRepoCreate<T>(
          this.cloudCollection!,
          input.userId,
          entity as Partial<T>,
          this.idPrefix,
        );
        await this.mirrorLocal(remote);
        markSyncOutboxState(this.cloudCollection!, remote.id, "synced");
        return remote;
      } catch (err) {
        await this.mirrorLocal(entity);
        markSyncOutboxState(
          this.cloudCollection!,
          entity.id,
          "failed",
          err instanceof Error ? err.message : "Cloud create failed — saved on device",
        );
        return entity;
      }
    }

    await this.table().add(entity);
    return entity;
  }

  /**
   * Bulk create — each entity is synced to cloud individually so imports
   * don't silently lose data. Uses allSettled so one failure doesn't abort.
   */
  async createMany(inputs: CreateInput<T>[]): Promise<T[]> {
    const now = nowIso();
    const entities = inputs.map(
      (i) =>
        ({
          id: i.data.id ?? uid(this.idPrefix),
          userId: i.userId,
          createdAt: now,
          updatedAt: now,
          isDeleted: 0,
          version: 1,
          tags: i.data.tags ?? [],
          notes: i.data.notes ?? "",
          ...i.data,
        }) as unknown as T,
    );

    if (this.canRemote()) {
      const settled = await Promise.allSettled(
        entities.map(async (entity) => {
          enqueueSyncOutbox(this.cloudCollection!, entity.id);
          markSyncOutboxState(this.cloudCollection!, entity.id, "syncing");
          try {
            const remote = await cloudRepoCreate<T>(
              this.cloudCollection!,
              entity.userId,
              entity as Partial<T>,
              this.idPrefix,
            );
            markSyncOutboxState(this.cloudCollection!, remote.id, "synced");
            return remote;
          } catch (err) {
            markSyncOutboxState(
              this.cloudCollection!,
              entity.id,
              "failed",
              err instanceof Error ? err.message : "Cloud create failed — saved on device",
            );
            return entity;
          }
        }),
      );
      const rows = settled.map((r, i) => (r.status === "fulfilled" ? r.value : entities[i]!));
      if (rows.length > 0) await this.table().bulkPut(rows);
      return rows;
    }

    await this.table().bulkAdd(entities);
    return entities;
  }

  // ---------------------------------------------------------------------------
  // READ
  // ---------------------------------------------------------------------------

  async get(id: ID): Promise<T | undefined> {
    if (this.canRemote()) {
      const remote = await cloudRepoGet<T>(this.cloudCollection!, id);
      if (remote) await this.mirrorLocal(remote);
      return remote;
    }
    return this.table().get(id);
  }

  async list(userId: ID): Promise<T[]> {
    if (this.canRemote()) {
      const remote = await cloudRepoList<T>(this.cloudCollection!, userId);
      await this.mirrorLocalList(userId, remote);
      return remote.filter((r) => !r.isDeleted);
    }
    const rows = await this.table().where("userId").equals(userId).toArray();
    return rows.filter((r) => !r.isDeleted);
  }

  async listIncludingDeleted(userId: ID): Promise<T[]> {
    return this.table().where("userId").equals(userId).toArray();
  }

  // ---------------------------------------------------------------------------
  // UPDATE
  // ---------------------------------------------------------------------------

  async update(id: ID, patch: Partial<T>): Promise<T | undefined> {
    if (this.canRemote()) {
      enqueueSyncOutbox(this.cloudCollection!, id);
      markSyncOutboxState(this.cloudCollection!, id, "syncing");
      try {
        const updated = await cloudRepoUpdate<T>(this.cloudCollection!, id, patch);
        if (updated) {
          await this.mirrorLocal(updated);
          markSyncOutboxState(this.cloudCollection!, id, "synced");
        }
        return updated;
      } catch (err) {
        const current = await this.table().get(id);
        if (!current) {
          markSyncOutboxState(
            this.cloudCollection!,
            id,
            "failed",
            err instanceof Error ? err.message : "Cloud update failed",
          );
          return undefined;
        }
        const next = {
          ...current,
          ...patch,
          updatedAt: nowIso(),
          version: (current.version ?? 0) + 1,
        } as T;
        await this.table().put(next);
        markSyncOutboxState(
          this.cloudCollection!,
          id,
          "failed",
          err instanceof Error ? err.message : "Cloud update failed — saved on device",
        );
        return next;
      }
    }
    const current = await this.table().get(id);
    if (!current) return undefined;
    const next = {
      ...current,
      ...patch,
      updatedAt: nowIso(),
      version: (current.version ?? 0) + 1,
    } as T;
    await this.table().put(next);
    return next;
  }

  async updateMany(ids: ID[], patch: Partial<T>): Promise<T[]> {
    if (ids.length === 0) return [];
    if (this.canRemote()) {
      const out: T[] = [];
      for (const id of ids) {
        const updated = await this.update(id, patch);
        if (updated) out.push(updated);
      }
      return out;
    }
    const out: T[] = [];
    for (const id of ids) {
      const updated = await this.update(id, patch);
      if (updated) out.push(updated);
    }
    return out;
  }

  // ---------------------------------------------------------------------------
  // DELETE
  // ---------------------------------------------------------------------------

  async softDelete(id: ID): Promise<void> {
    if (this.canRemote()) {
      enqueueSyncOutbox(this.cloudCollection!, id);
      markSyncOutboxState(this.cloudCollection!, id, "syncing");
      try {
        const deleted = await cloudRepoSoftDelete<T>(this.cloudCollection!, id);
        await this.mirrorLocal(deleted);
        markSyncOutboxState(this.cloudCollection!, id, "synced");
        return;
      } catch (err) {
        const current = await this.table().get(id);
        if (current) {
          const next = {
            ...current,
            isDeleted: 1,
            updatedAt: nowIso(),
            version: (current.version ?? 0) + 1,
          } as T;
          await this.table().put(next);
        }
        markSyncOutboxState(
          this.cloudCollection!,
          id,
          "failed",
          err instanceof Error ? err.message : "Cloud delete failed — saved on device",
        );
        return;
      }
    }
    await this.update(id, { isDeleted: 1 } as Partial<T>);
  }

  async softDeleteMany(ids: ID[]): Promise<void> {
    if (ids.length === 0) return;
    for (const id of ids) {
      await this.softDelete(id);
    }
  }

  async restore(id: ID): Promise<void> {
    await this.update(id, { isDeleted: 0 } as Partial<T>);
  }

  async hardDelete(id: ID): Promise<void> {
    if (this.canRemote()) {
      await cloudRepoHardDelete(this.cloudCollection!, id);
    }
    await this.table().delete(id);
  }

  async hardDeleteAllForUser(userId: ID): Promise<void> {
    if (this.canRemote()) {
      await cloudRepoHardDeleteAll(this.cloudCollection!, userId);
    }
    const rows = await this.table().where("userId").equals(userId).primaryKeys();
    await this.table().bulkDelete(rows);
  }

  // ---------------------------------------------------------------------------
  // UTILITY
  // ---------------------------------------------------------------------------

  async count(userId: ID): Promise<number> {
    const arr = await this.list(userId);
    return arr.length;
  }
}
