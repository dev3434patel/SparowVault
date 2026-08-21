/**
 * Durable sync outbox — persists pending/failed financial writes across reloads.
 */

export type SyncOutboxState = "pending" | "syncing" | "synced" | "conflict" | "failed";

export interface SyncOutboxItem {
  id: string;
  collection: string;
  entityId: string;
  state: SyncOutboxState;
  updatedAt: string;
  error?: string;
}

const LS_KEY = "sparowvault_sync_outbox_v1";
type Listener = () => void;

const listeners = new Set<Listener>();

function loadMap(): Map<string, SyncOutboxItem> {
  const map = new Map<string, SyncOutboxItem>();
  if (typeof window === "undefined") return map;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return map;
    const arr = JSON.parse(raw) as SyncOutboxItem[];
    if (!Array.isArray(arr)) return map;
    for (const item of arr) {
      if (item?.id && item.collection && item.entityId) map.set(item.id, item);
    }
  } catch {
    /* ignore corrupt */
  }
  return map;
}

let outbox = loadMap();

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...outbox.values()]));
  } catch {
    /* quota */
  }
  for (const l of listeners) l();
}

export function subscribeSyncOutbox(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function enqueueSyncOutbox(collection: string, entityId: string): SyncOutboxItem {
  const id = `${collection}:${entityId}`;
  const item: SyncOutboxItem = {
    id,
    collection,
    entityId,
    state: "pending",
    updatedAt: new Date().toISOString(),
  };
  outbox.set(id, item);
  persist();
  return item;
}

export function markSyncOutboxState(
  collection: string,
  entityId: string,
  state: SyncOutboxState,
  error?: string,
): void {
  const id = `${collection}:${entityId}`;
  outbox.set(id, {
    id,
    collection,
    entityId,
    state,
    updatedAt: new Date().toISOString(),
    error,
  });
  if (state === "synced") {
    outbox.delete(id);
  }
  persist();
}

export function listPendingSyncOutbox(): SyncOutboxItem[] {
  return [...outbox.values()].filter(
    (i) => i.state === "pending" || i.state === "failed" || i.state === "syncing" || i.state === "conflict",
  );
}

export function pendingSyncCount(): number {
  return listPendingSyncOutbox().length;
}

export function clearSyncedOutbox(): void {
  for (const [id, item] of outbox) {
    if (item.state === "synced") outbox.delete(id);
  }
  persist();
}

/** Test-only: wipe in-memory + storage. */
export function resetSyncOutboxForTests(): void {
  outbox = new Map();
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(LS_KEY);
    } catch {
      /* ignore */
    }
  }
  for (const l of listeners) l();
}
