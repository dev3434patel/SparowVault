import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SparowVaultDB } from "@/db/database";
import { BaseRepo } from "@/repositories/baseRepo";
import { ApiError } from "@/lib/apiClient";
import * as cloud from "@/lib/cloud/repoClient";
import { enqueueMutation, mergeRemoteList, pendingMutations, replayMutations, useServerVersion } from "@/services/durableOutbox";
import type { Category } from "@/types";
import { useAuthStore } from "@/store/authStore";
import type { User } from "@/types";

vi.mock("@/lib/cloud/repoClient", () => ({
  canUseCloudRepo: () => true,
  cloudRepoCreate: vi.fn(), cloudRepoGet: vi.fn(), cloudRepoList: vi.fn(), cloudRepoUpdate: vi.fn(),
  cloudRepoHardDelete: vi.fn(), cloudRepoHardDeleteAll: vi.fn(),
}));

let db: SparowVaultDB;
let repo: BaseRepo<Category>;
const draft = { name: "Local category", appliesTo: "expense" as const, icon: "tag", color: "#ef4444" };
const row = (id = "cat-1", userId = "user-a"): Category => ({ ...draft, id, userId,
  createdAt: "2026-09-10T00:00:00.000Z", updatedAt: "2026-09-10T00:00:00.000Z", isDeleted: 0, version: 1, notes: "", tags: [] });

beforeEach(() => {
  vi.resetAllMocks();
  useAuthStore.setState({ currentUser: null });
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });
  db = new SparowVaultDB(`outbox-test-${crypto.randomUUID()}`);
  repo = new BaseRepo(() => db.categories, "cat", "categories");
  vi.mocked(cloud.cloudRepoCreate).mockImplementation(async (_collection, _userId, data) => data as Category);
  vi.mocked(cloud.cloudRepoList).mockResolvedValue([]);
});
afterEach(async () => { await db.delete(); useAuthStore.setState({ currentUser: null }); vi.unstubAllGlobals(); });

describe("durable financial outbox", () => {
  it("stores the full payload atomically and survives an empty server refresh", async () => {
    vi.mocked(cloud.cloudRepoCreate).mockRejectedValue(new TypeError("Offline"));
    const saved = await repo.create({ userId: "user-a", data: draft });
    expect((await pendingMutations(db, "user-a"))[0]).toMatchObject({ payload: { name: draft.name }, local: saved, state: "pending" });
    expect(await repo.list("user-a")).toEqual([saved]);
    expect(await db.categories.get(saved.id)).toEqual(saved);
  });

  it("replays after database close/reopen with the same mutation key", async () => {
    vi.mocked(cloud.cloudRepoCreate).mockRejectedValueOnce(new TypeError("Lost response"));
    const saved = await repo.create({ userId: "user-a", data: draft });
    const key = (await pendingMutations(db, "user-a"))[0]!.mutationId;
    const name = db.name; db.close(); db = new SparowVaultDB(name);
    vi.mocked(cloud.cloudRepoCreate).mockResolvedValue(saved);
    await replayMutations(db, "user-a");
    expect(cloud.cloudRepoCreate).toHaveBeenLastCalledWith("categories", "user-a", saved, "cat", key);
    expect(await pendingMutations(db, "user-a")).toEqual([]);
    expect(await db.categories.get(saved.id)).toEqual(saved);
  });

  it.each([401, 403, 422])("does not misreport HTTP %s as synchronized", async status => {
    vi.mocked(cloud.cloudRepoCreate).mockRejectedValue(new ApiError("Rejected", status, "FIXTURE"));
    if (status === 401) {
      await repo.create({ userId: "user-a", data: draft });
      expect((await pendingMutations(db, "user-a"))[0]?.state).toBe("pending");
    } else {
      await expect(repo.create({ userId: "user-a", data: draft })).rejects.toMatchObject({ status });
      expect(await db.categories.count()).toBe(0);
      expect((await pendingMutations(db, "user-a"))[0]).toMatchObject({ state: "rejected", payload: draft });
    }
  });

  it("preserves a conflict for explicit review without overwriting its local intent", async () => {
    await db.categories.put(row());
    vi.mocked(cloud.cloudRepoUpdate).mockRejectedValue(new ApiError("Stale", 409, "VERSION_CONFLICT"));
    await expect(repo.update("cat-1", { name: "Unsynced edit" })).rejects.toMatchObject({ status: 409 });
    expect((await db.categories.get("cat-1"))?.name).toBe("Unsynced edit");
    expect((await pendingMutations(db, "user-a"))[0]?.state).toBe("conflict");
    await mergeRemoteList(db.categories, "categories", "user-a", [row()]);
    expect((await db.categories.get("cat-1"))?.name).toBe("Unsynced edit");
  });

  it("replays edit and delete in order with their original expected versions", async () => {
    await db.categories.put(row());
    vi.mocked(cloud.cloudRepoUpdate).mockRejectedValue(new TypeError("Offline"));
    await repo.update("cat-1", { name: "Edited" });
    await repo.softDelete("cat-1");
    expect(await mergeRemoteList(db.categories, "categories", "user-a", [row()])).toEqual([]);
    vi.mocked(cloud.cloudRepoUpdate).mockImplementation(async (_collection, _id, patch, mutation) => ({ ...row(), name: "Edited", ...patch, version: mutation!.expectedVersion + 1 }));
    await replayMutations(db, "user-a");
    const last = vi.mocked(cloud.cloudRepoUpdate).mock.calls.slice(-2);
    expect(last.map(call => call[3]?.expectedVersion)).toEqual([1, 2]);
    expect((await db.categories.get("cat-1"))?.isDeleted).toBe(1);
    expect(await pendingMutations(db, "user-a")).toEqual([]);
  });

  it("does not erase a newly acknowledged create when an older GET completes", async () => {
    const snapshot: Category[] = [];
    const saved = await repo.create({ userId: "user-a", data: draft });
    expect(await mergeRemoteList(db.categories, "categories", "user-a", [], snapshot)).toEqual([saved]);
  });

  it("does not overwrite a newer acknowledged edit with an older GET", async () => {
    const snapshot = [row()];
    await db.categories.put({ ...row(), name: "Newer", version: 2 });
    await mergeRemoteList(db.categories, "categories", "user-a", snapshot, snapshot);
    expect((await db.categories.get("cat-1"))?.name).toBe("Newer");
  });

  it("never drains a different user's queue", async () => {
    vi.mocked(cloud.cloudRepoCreate).mockRejectedValue(new TypeError("Offline"));
    await repo.create({ userId: "user-a", data: draft });
    vi.mocked(cloud.cloudRepoCreate).mockClear();
    await replayMutations(db, "user-b");
    expect(cloud.cloudRepoCreate).not.toHaveBeenCalled();
    expect(await pendingMutations(db, "user-a")).toHaveLength(1);
  });

  it("rolls back the queue if the local entity cannot be stored", async () => {
    db.categories.hook("creating", () => { throw new Error("Storage full"); });
    await expect(repo.create({ userId: "user-a", data: draft })).rejects.toThrow("Storage full");
    expect(await db.categories.count()).toBe(0);
    expect(await db.syncMutations.count()).toBe(0);
    expect(cloud.cloudRepoCreate).not.toHaveBeenCalled();
  });

  it("keeps an acknowledged request retryable if the local acknowledgement transaction fails", async () => {
    const reject = () => { throw new Error("Cache write failed"); };
    db.categories.hook("updating", reject);
    vi.mocked(cloud.cloudRepoCreate).mockImplementation(async (_collection, _userId, data) => ({ ...data, name: "Server normalized" }) as Category);
    await expect(repo.create({ userId: "user-a", data: draft })).rejects.toThrow("Cache write failed");
    const pending = (await pendingMutations(db, "user-a"))[0]!;
    expect(pending.state).toBe("syncing");
    db.categories.hook("updating").unsubscribe(reject);
    await replayMutations(db, "user-a");
    expect(cloud.cloudRepoCreate).toHaveBeenLastCalledWith("categories", "user-a", pending.payload, "cat", pending.mutationId);
    expect(await pendingMutations(db, "user-a")).toHaveLength(0);
  });

  it("protects legacy pending records and does not guess how to replay them", async () => {
    await db.categories.put(row());
    localStorage.setItem("sparowvault_sync_outbox_v1", JSON.stringify([{ id: "categories:cat-1", collection: "categories", entityId: "cat-1", state: "failed" }]));
    expect(await repo.list("user-a")).toEqual([row()]);
    expect((await pendingMutations(db, "user-a"))[0]).toMatchObject({ operation: "review", state: "conflict", payload: row() });
    await replayMutations(db, "user-a");
    expect(cloud.cloudRepoCreate).not.toHaveBeenCalled();
    expect(cloud.cloudRepoUpdate).not.toHaveBeenCalled();
  });

  it("explicit conflict resolution restores server state and removes the entity's queued chain", async () => {
    const local = row();
    await enqueueMutation(db.categories, "categories", "cat", "create", local, local);
    await db.syncMutations.toCollection().modify({ state: "conflict" });
    vi.mocked(cloud.cloudRepoGet).mockResolvedValue({ ...local, name: "Server", version: 3 });
    await useServerVersion(db, (await pendingMutations(db, "user-a"))[0]!);
    expect((await db.categories.get(local.id))?.name).toBe("Server");
    expect(await pendingMutations(db, "user-a")).toHaveLength(0);
  });

  it("blocks permanent deletion while recoverable mutations exist", async () => {
    vi.mocked(cloud.cloudRepoCreate).mockRejectedValue(new TypeError("Offline"));
    const saved = await repo.create({ userId: "user-a", data: draft });
    await expect(repo.hardDelete(saved.id)).rejects.toThrow("Resolve unsynced changes");
    expect(cloud.cloudRepoHardDelete).not.toHaveBeenCalled();
  });

  it("restores a pending projection if another user's cache used the same entity ID", async () => {
    const local = row();
    await enqueueMutation(db.categories, "categories", "cat", "create", local, local);
    await db.categories.put(row("cat-1", "user-b"));
    expect(await mergeRemoteList(db.categories, "categories", "user-a", [])).toEqual([local]);
    expect((await pendingMutations(db, "user-a"))[0]?.payload).toEqual(local);
  });

  it("does not return another user's pending local record after an account switch", async () => {
    const local = row();
    await enqueueMutation(db.categories, "categories", "cat", "create", local, local);
    useAuthStore.setState({ currentUser: { id: "user-b" } as User });
    vi.mocked(cloud.cloudRepoGet).mockResolvedValue(row("cat-1", "user-b"));
    expect((await repo.get("cat-1"))?.userId).toBe("user-b");
    expect(cloud.cloudRepoGet).toHaveBeenCalledWith("categories", "cat-1", "user-b");
    expect((await pendingMutations(db, "user-a"))[0]?.payload).toEqual(local);
  });
});
