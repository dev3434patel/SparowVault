import { describe, expect, it } from "vitest";
import { decideHouseholdAccept, decideHouseholdWrite, decideLastOwner } from "@/services/householdGrantRules";

const invite = {
  inviterUserId: "alice",
  role: "viewer",
  expiresAt: "2026-10-10T00:00:00Z",
  usedAt: null,
  revokedAt: null,
};

describe("household grant rules", () => {
  it("lets a different login accept and refuses replay, expiry, and self-accept", () => {
    expect(decideHouseholdAccept(invite, "bob", "2026-10-03T00:00:00Z").ok).toBe(true);
    expect(decideHouseholdAccept(invite, "alice", "2026-10-03T00:00:00Z").code).toBe("SELF_ACCEPT");
    expect(decideHouseholdAccept({ ...invite, usedAt: "2026-10-03T00:00:01Z" }, "bob", "2026-10-03T00:00:00Z").code).toBe("TOKEN_USED");
    expect(decideHouseholdAccept({ ...invite, expiresAt: "2026-10-01T00:00:00Z" }, "bob", "2026-10-03T00:00:00Z").code).toBe("EXPIRED");
    expect(decideHouseholdAccept({ ...invite, revokedAt: "2026-10-02T00:00:00Z" }, "bob", "2026-10-03T00:00:00Z").code).toBe("REVOKED");
    expect(decideHouseholdAccept({ ...invite, role: "owner" }, "bob", "2026-10-03T00:00:00Z").code).toBe("ROLE");
  });

  it("keeps a viewer read-only and rechecks a queued grant", () => {
    const scope = [{ collection: "transactions", entityId: "tx-shared" }];
    const viewer = { revokedAt: null, role: "viewer", revision: 2, resourceScope: scope };
    expect(decideHouseholdWrite(viewer, "transactions", "tx-shared", 2).code).toBe("VIEWER_DENIED");
    const partner = { ...viewer, role: "partner" };
    expect(decideHouseholdWrite(partner, "transactions", "tx-shared", 2).ok).toBe(true);
    expect(decideHouseholdWrite(partner, "transactions", "tx-private", 2).code).toBe("OUT_OF_SCOPE");
    expect(decideHouseholdWrite(partner, "transactions", "tx-shared", 1).code).toBe("STALE_GRANT");
    expect(decideHouseholdWrite({ ...partner, revokedAt: "2026-10-03T00:00:00Z" }, "transactions", "tx-shared", 2).code).toBe("REVOKED");
  });

  it("refuses to remove the last owner", () => {
    expect(decideLastOwner(1, "viewer").code).toBe("LAST_OWNER");
    expect(decideLastOwner(2, "viewer").ok).toBe(true);
  });
});
