import { describe, it, expect } from "vitest";
import { addDays } from "date-fns";
import type { Budget, Goal, RecurringRule, Transaction } from "@/types";
import { goalPriorityTier, buildGoalIntel } from "@/services/goalEngine";
import { buildEmergencyFundIntel, isEssentialCategoryName } from "@/services/emergencyFundEngine";
import { smartBudgetStatuses } from "@/services/smartBudgetEngine";
import { buildCashflowSurvivalReport } from "@/services/cashflowSurvivalEngine";

const baseEntity = {
  userId: "u1",
  isDeleted: 0 as const,
  version: 1,
  tags: [] as string[],
  notes: "",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("goalEngine", () => {
  it("maps priority to tier", () => {
    expect(goalPriorityTier(1)).toBe("critical");
    expect(goalPriorityTier(3)).toBe("lifestyle");
    expect(goalPriorityTier(5)).toBe("wealth");
  });

  it("buildGoalIntel exposes weekly and daily required", () => {
    const target = addDays(new Date("2026-06-15T12:00:00"), 60);
    const g: Goal = {
      ...baseEntity,
      id: "g1",
      title: "Test",
      goalType: "custom",
      targetAmount: 100_000,
      targetDate: target.toISOString(),
      startedAt: "2026-01-01T00:00:00.000Z",
      currentSaved: 10_000,
      priority: 3,
      icon: "🎯",
      color: "#000",
      status: "active",
    };
    const intel = buildGoalIntel(g, new Date("2026-06-15T12:00:00"));
    expect(intel.targetPaise).toBeGreaterThan(0);
    expect(intel.weeklyRequiredPaise).toBeGreaterThan(0);
    expect(intel.dailyRequiredPaise).toBeGreaterThan(0);
  });
});

describe("emergencyFundEngine", () => {
  it("detects essential-ish category names", () => {
    expect(isEssentialCategoryName("Rent — flat")).toBe(true);
    expect(isEssentialCategoryName("Netflix")).toBe(false);
  });

  it("buildEmergencyFundIntel returns non-negative months when no data", () => {
    const intel = buildEmergencyFundIntel([], [], [], [], new Date("2026-06-15"));
    expect(intel.monthsCovered).toBe(0);
    expect(intel.monthlyEssentialPaise).toBe(0);
  });
});

describe("smartBudgetEngine", () => {
  it("extends budget status with burn fields", () => {
    const b: Budget = {
      ...baseEntity,
      id: "b1",
      period: "monthly",
      year: 2026,
      month: 6,
      categoryId: "cat1",
      amount: 10_000,
      mode: "flexible",
      carryForward: 0,
      rolloverSavings: 0,
    };
    const txs: Transaction[] = [
      {
        ...baseEntity,
        id: "t1",
        type: "expense",
        amount: 6_000,
        amountPaise: 600_000,
        date: "2026-06-10",
        categoryId: "cat1",
        accountId: "a1",
        paymentMode: "upi",
        merchantOrPerson: "x",
        description: "",
        billAvailable: 0,
        gstApplicable: 0,
        taxFlag: 0,
        businessOrPersonal: "personal",
        needWant: "unassigned",
        fixedVariable: "unassigned",
        plannedUnplanned: "unassigned",
      } as Transaction,
    ];
    const rules: RecurringRule[] = [];
    const sm = smartBudgetStatuses([b], txs, rules, new Date("2026-06-15"));
    expect(sm[0].dayProgressPct).toBeGreaterThan(0);
    expect(sm[0].burnRisk).toBeDefined();
    expect(typeof sm[0].adjustedMonthEndProjectedPaise).toBe("number");
  });
});

describe("cashflowSurvivalEngine", () => {
  it("exposes core vs full disposable when udhari payable exists", () => {
    const survival = buildCashflowSurvivalReport(
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [
        {
          ...baseEntity,
          id: "u1",
          personName: "Bob",
          type: "payable",
          amount: 50_000,
          givenDate: "2026-01-01",
          status: "open",
          amountSettled: 0,
          reminderOn: 1,
          context: "friend",
        },
      ],
      [],
      new Date("2026-06-15T12:00:00"),
    );
    expect(survival.udhariPayablePaise).toBeGreaterThan(0);
    expect(survival.disposableCorePaise).toBeGreaterThanOrEqual(survival.disposableAfterBillsPaise);
  });
});
