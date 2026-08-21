import { describe, expect, it } from "vitest";
import type { Budget, RecurringRule, Transaction } from "@/types";
import { smartBudgetStatuses } from "@/services/smartBudgetEngine";

const baseEntity = {
  userId: "u1",
  isDeleted: 0 as const,
  version: 1,
  tags: [] as string[],
  notes: "",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const rentBudget: Budget = {
  ...baseEntity,
  id: "budget-rent",
  period: "monthly",
  year: 2026,
  month: 6,
  categoryId: "rent",
  amount: 20_000,
  limitPaise: 2_000_000,
  mode: "fixed",
  carryForward: 0,
  rolloverSavings: 0,
};

const rentRule: RecurringRule = {
  ...baseEntity,
  id: "rule-rent",
  title: "Rent",
  type: "expense",
  amount: 15_000,
  amountPaise: 1_500_000,
  categoryId: "rent",
  accountId: "bank",
  paymentMode: "bank_transfer",
  frequency: "monthly",
  dayOfMonth: 1,
  nextRunDate: "2026-06-01",
  active: 1,
};

const rentPayment: Transaction = {
  ...baseEntity,
  id: "tx-rent",
  type: "expense",
  amount: 15_000,
  amountPaise: 1_500_000,
  date: "2026-06-01",
  categoryId: "rent",
  accountId: "bank",
  paymentMode: "bank_transfer",
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

describe("smartBudgetEngine", () => {
  it("does not project day-1 rent as 30x monthly rent", () => {
    const [status] = smartBudgetStatuses(
      [rentBudget],
      [rentPayment],
      [rentRule],
      new Date("2026-06-01T12:00:00.000Z"),
    );

    expect(status.fixedRecurringCreditedPaise).toBe(1_500_000);
    expect(status.variableSpentPaise).toBe(0);
    expect(status.adjustedMonthEndProjectedPaise).toBe(1_500_000);
    expect(status.adjustedMonthEndProjectedPaise).toBeLessThan(2_000_000);
    expect(status.burnRisk).toBe("ok");
  });

  it("separates planned and unplanned spend for budget explanations", () => {
    const unplanned: Transaction = {
      ...rentPayment,
      id: "tx-repair",
      amount: 1_000,
      amountPaise: 100_000,
      date: "2026-06-10",
      merchantOrPerson: "Repair",
      plannedUnplanned: "unplanned",
    };

    const [status] = smartBudgetStatuses(
      [rentBudget],
      [rentPayment, unplanned],
      [rentRule],
      new Date("2026-06-10T12:00:00.000Z"),
    );

    expect(status.plannedSpentPaise).toBe(1_500_000);
    expect(status.unplannedSpentPaise).toBe(100_000);
  });
});
