import { describe, expect, it } from "vitest";
import {
  moduleWriteBlocked,
  planCapMessage,
  collectionWriteBlocked,
  snapshotFromBooleanFeatures,
  personalNavHidden,
  navVisibilityFlags,
  personalMobileMoreKeys,
  planFeatureOff,
} from "@/services/modulePolicy";
import type { UserPlanSnapshot } from "@/services/planFeatureGate";

describe("modulePolicy", () => {
  it("blocks only an explicit false flag", () => {
    expect(moduleWriteBlocked({}, "goals")).toBeNull();
    expect(moduleWriteBlocked({ goals_enabled: true }, "goals")).toBeNull();
    expect(moduleWriteBlocked({ goals_enabled: false }, "goals")).toMatch(/turned off/);
    expect(moduleWriteBlocked({ investments_enabled: false }, "transactions")).toBeNull();
    expect(collectionWriteBlocked({ goals_enabled: false }, "goals")).toMatch(/turned off/);
    expect(collectionWriteBlocked({ goals_enabled: true }, "goals")).toBeNull();
  });

  it("states the account cap when the quota is used up", () => {
    const snapshot: UserPlanSnapshot = {
      planId: 1,
      planCode: "free",
      status: "active",
      features: { max_accounts: { isEnabled: true, limitValue: 2 } },
    };
    expect(planCapMessage(snapshot, "accounts", 2)).toMatch(/allows 2 accounts/);
    expect(planCapMessage(snapshot, "accounts", 1)).toBeNull();
    expect(
      planCapMessage(snapshotFromBooleanFeatures({ max_accounts: false }), "accounts", 1),
    ).toMatch(/allows 1 accounts/);
    expect(planCapMessage(snapshotFromBooleanFeatures({}), "cards", 3)).toBeNull();
    expect(planCapMessage(snapshot, "cards", 1)).toBeNull();
    const cardCap: UserPlanSnapshot = {
      planId: 1,
      planCode: "free",
      status: "active",
      features: {
        max_cards: { isEnabled: true, limitValue: 1 },
        max_loans: { isEnabled: true, limitValue: 1 },
        max_goals: { isEnabled: true, limitValue: 1 },
      },
    };
    expect(planCapMessage(cardCap, "cards", 1)).toMatch(/allows 1 cards/);
    expect(planCapMessage(cardCap, "loans", 1)).toMatch(/allows 1 loans/);
    expect(planCapMessage(cardCap, "goals", 1)).toMatch(/allows 1 goals/);
  });

  it("hides personal nav only when an admin or plan flag is explicitly false", () => {
    expect(personalNavHidden({}, "goals")).toBe(false);
    expect(personalNavHidden({ goals_enabled: false }, "goals")).toBe(true);
    expect(personalNavHidden({ investments_enabled: false }, "savings")).toBe(true);
    expect(personalNavHidden({ udhari_enabled: false }, "udhari")).toBe(true);
    expect(personalNavHidden({ udhari: false }, "udhari")).toBe(true);
    expect(personalNavHidden({ import: false }, "import")).toBe(true);
    expect(personalNavHidden({ recurring_enabled: false }, "bill-calendar")).toBe(true);
    expect(personalNavHidden({ exports: false }, "export")).toBe(true);
    expect(personalNavHidden({ alerts: false }, "alerts")).toBe(true);
    expect(personalNavHidden({ ai_suggestions: false }, "suggestions")).toBe(true);
    expect(personalNavHidden({ goals_enabled: false }, "transactions")).toBe(false);
    const merged = navVisibilityFlags({ goals_enabled: true }, { goals_enabled: false });
    expect(personalNavHidden(merged, "goals")).toBe(true);
    expect(navVisibilityFlags({ import: true }, {}).import).toBe(true);
  });

  it("puts the remaining personal routes on the mobile More sheet", () => {
    const keys = [
      "dashboard",
      "transactions",
      "income",
      "expenses",
      "categories",
      "budgets",
      "goals",
      "envelopes",
      "savings",
      "accounts",
      "cards",
      "loans",
      "udhari",
      "bill-calendar",
      "household",
      "reports",
      "reconciliation",
      "suggestions",
      "alerts",
      "export",
      "import",
      "settings",
      "profile",
      "audit",
      "subscription",
      "admin-flags",
    ];
    const more = personalMobileMoreKeys(keys, {}, true);
    expect(more).toEqual(expect.arrayContaining([
      "accounts",
      "udhari",
      "envelopes",
      "savings",
      "export",
      "cards",
      "loans",
      "household",
      "subscription",
    ]));
    expect(more).not.toContain("dashboard");
    expect(more).not.toContain("goals");
    expect(more).not.toContain("admin-flags");
    const hidden = personalMobileMoreKeys(keys, { goals_enabled: false, udhari: false }, false);
    expect(hidden).not.toContain("udhari");
    expect(hidden).not.toContain("subscription");
    expect(hidden).toContain("accounts");
    expect(personalMobileMoreKeys(keys, { goals_enabled: false }, true)).toContain("envelopes");
  });

  it("locks plan features only when the boolean is explicitly false", () => {
    expect(planFeatureOff({}, "ca_reports")).toBe(false);
    expect(planFeatureOff({ ca_reports: false }, "ca_reports")).toBe(true);
    expect(planFeatureOff({ ai_suggestions: false }, "ai_suggestions")).toBe(true);
    expect(planFeatureOff({ attachment_storage_mb: false }, "attachment_storage_mb")).toBe(true);
    expect(planFeatureOff({ max_exports_per_month: false }, "max_exports_per_month")).toBe(true);
    expect(planFeatureOff({ ca_reports: true }, "ca_reports")).toBe(false);
    expect(
      planCapMessage(snapshotFromBooleanFeatures({ max_accounts: false, max_cards: false }), "cards", 0),
    ).toMatch(/allows 0 cards/);
  });
});
