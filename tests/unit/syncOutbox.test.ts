import { describe, expect, it, beforeEach } from "vitest";
import {
  enqueueSyncOutbox,
  listPendingSyncOutbox,
  markSyncOutboxState,
  pendingSyncCount,
  resetSyncOutboxForTests,
} from "@/services/syncOutbox";

describe("syncOutbox durable badge state", () => {
  beforeEach(() => {
    resetSyncOutboxForTests();
  });

  it("enqueues pending and counts for UI badge", () => {
    enqueueSyncOutbox("transactions", "txn_1");
    expect(pendingSyncCount()).toBe(1);
    expect(listPendingSyncOutbox()[0]?.state).toBe("pending");
  });

  it("clears on synced", () => {
    enqueueSyncOutbox("cards", "card_1");
    markSyncOutboxState("cards", "card_1", "synced");
    expect(pendingSyncCount()).toBe(0);
  });

  it("keeps failed items for offline badge", () => {
    enqueueSyncOutbox("transactions", "txn_2");
    markSyncOutboxState("transactions", "txn_2", "failed", "network");
    expect(pendingSyncCount()).toBe(1);
    expect(listPendingSyncOutbox()[0]?.error).toBe("network");
  });
});
