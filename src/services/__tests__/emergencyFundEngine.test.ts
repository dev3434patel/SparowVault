import { describe, expect, it } from "vitest";
import type { Category, Goal, Transaction } from "@/types";
import { buildEmergencyFundIntel, isEssentialCategoryName } from "@/services/emergencyFundEngine";

const baseEntity = {
  userId: "u1",
  isDeleted: 0 as const,
  version: 1,
  tags: [] as string[],
  notes: "",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function expense(id: string, date: string, amountPaise: number): Transaction {
  return {
    ...baseEntity,
    id,
    type: "expense",
    amount: amountPaise / 100,
    amountPaise,
    date,
    categoryId: "rent",
    accountId: "bank",
    paymentMode: "upi",
    merchantOrPerson: "Landlord",
    description: "",
    billAvailable: 0,
    gstApplicable: 0,
    taxFlag: 0,
    businessOrPersonal: "personal",
    needWant: "need",
    fixedVariable: "fixed",
    plannedUnplanned: "planned",
  };
}

const rentCategory: Category = {
  ...baseEntity,
  id: "rent",
  name: "Rent",
  parentId: null,
  appliesTo: "expense",
  icon: "home",
  color: "#334155",
  budgetable: 1,
  taxRelevant: 0,
  gstRelevant: 0,
  sortOrder: 1,
  archived: 0,
};

const emergencyGoal: Goal = {
  ...baseEntity,
  id: "emergency-goal",
  title: "Emergency fund",
  goalType: "emergency_fund",
  targetAmount: 120_000,
  targetAmountPaise: 12_000_000,
  targetDate: "2026-12-31T00:00:00.000Z",
  startedAt: "2026-01-01T00:00:00.000Z",
  currentSaved: 10_000,
  savedAmountPaise: 1_000_000,
  priority: 1,
  icon: "shield",
  color: "#0f766e",
  status: "active",
};

describe("emergencyFundEngine", () => {
  it("recognizes essential categories", () => {
    expect(isEssentialCategoryName("Food/basic groceries")).toBe(true);
    expect(isEssentialCategoryName("Medical")).toBe(true);
    expect(isEssentialCategoryName("Weekend cafe")).toBe(false);
  });

  it("calculates emergency coverage and shortfall", () => {
    const intel = buildEmergencyFundIntel(
      [
        expense("rent-jan", "2026-01-05", 2_000_000),
        expense("rent-feb", "2026-02-05", 2_000_000),
        expense("rent-mar", "2026-03-05", 2_000_000),
      ],
      [rentCategory],
      [],
      [emergencyGoal],
      new Date("2026-03-15T00:00:00.000Z"),
      6,
    );

    expect(intel.monthlyEssentialPaise).toBe(2_000_000);
    expect(intel.emergencyFundAvailablePaise).toBe(1_000_000);
    expect(intel.monthsCovered).toBe(0.5);
    expect(intel.targetRecommendedPaise).toBe(12_000_000);
    expect(intel.shortfallVsTargetPaise).toBe(11_000_000);
  });
});
