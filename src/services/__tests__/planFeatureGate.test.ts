import { describe, it, expect } from "vitest";
import { isFeatureUnlocked, remainingQuota, lockReason } from "@/services/planFeatureGate";
import type { UserPlanSnapshot } from "@/services/planFeatureGate";

const PRO: UserPlanSnapshot = {
  planId: 2,
  planCode: "PRO",
  status: "active",
  features: {
    advanced_reports_enabled: { isEnabled: true },
    exports: { isEnabled: true },
    ca_reports_enabled:       { isEnabled: true },
    max_transactions_per_month: { isEnabled: true, limitValue: 1000, limitUnit: "per_month" },
    max_exports_per_month:    { isEnabled: true, limitValue: 10, limitUnit: "per_month" },
  },
};

const FREE: UserPlanSnapshot = {
  planId: 1,
  planCode: "BASIC",
  status: "active",
  features: {
    advanced_reports_enabled: { isEnabled: false },
    exports: { isEnabled: false },
    ca_reports_enabled:       { isEnabled: false },
    max_transactions_per_month: { isEnabled: true, limitValue: 100, limitUnit: "per_month" },
  },
};

describe("Phase 14 — plan feature gate", () => {
  it("isFeatureUnlocked returns true only when feature is enabled", () => {
    expect(isFeatureUnlocked(PRO, "advanced_reports_enabled")).toBe(true);
    expect(isFeatureUnlocked(PRO, "exports")).toBe(true);
    expect(isFeatureUnlocked(FREE, "advanced_reports_enabled")).toBe(false);
  });

  it("remainingQuota returns Infinity when no limit is set", () => {
    expect(remainingQuota(PRO, "advanced_reports_enabled", 999)).toBe(Number.POSITIVE_INFINITY);
  });

  it("remainingQuota counts down correctly", () => {
    expect(remainingQuota(PRO, "max_transactions_per_month", 100)).toBe(900);
    expect(remainingQuota(FREE, "max_transactions_per_month", 100)).toBe(0);
    expect(remainingQuota(FREE, "max_transactions_per_month", 150)).toBe(0);
  });

  it("remainingQuota is 0 when feature is locked", () => {
    expect(remainingQuota(FREE, "ca_reports_enabled", 0)).toBe(0);
  });

  it("lockReason is plan-status aware", () => {
    expect(lockReason(FREE, "ca_reports_enabled")).toMatch(/upgrade/i);
    expect(lockReason(FREE, "exports")).toMatch(/upgrade/i);
    expect(lockReason({ ...FREE, status: "expired" }, "ca_reports_enabled")).toMatch(/activate a plan/i);
  });
});
