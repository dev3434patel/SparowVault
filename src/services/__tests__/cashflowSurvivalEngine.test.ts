import { describe, expect, it } from "vitest";
import type { Account, RecurringRule } from "@/types";
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

const cashAccount: Account = {
  ...baseEntity,
  id: "bank",
  name: "Salary bank",
  type: "bank",
  openingBalance: 7_200,
  openingBalancePaise: 720_000,
  color: "#2563eb",
  icon: "bank",
  isInactive: 0,
};

function recurringRule(
  id: string,
  type: RecurringRule["type"],
  amountPaise: number,
  nextRunDate: string,
): RecurringRule {
  return {
    ...baseEntity,
    id,
    title: id,
    type,
    amount: amountPaise / 100,
    amountPaise,
    accountId: "bank",
    paymentMode: "bank_transfer",
    frequency: "monthly",
    dayOfMonth: Number(nextRunDate.slice(8, 10)),
    nextRunDate,
    active: 1,
  };
}

describe("cashflowSurvivalEngine", () => {
  it("calculates safe daily spend after a card bill before salary", () => {
    const report = buildCashflowSurvivalReport(
      [cashAccount],
      [],
      [
        recurringRule("card bill", "cc_payment", 300_000, "2026-02-05"),
        recurringRule("salary", "income", 0, "2026-02-12"),
      ],
      [],
      [],
      [],
      [],
      [],
      [],
      new Date("2026-02-01T00:00:00.000Z"),
    );

    expect(report.cashAvailablePaise).toBe(720_000);
    expect(report.totalOutflowsBeforeIncomePaise).toBe(300_000);
    expect(report.daysUntilNextIncome).toBe(11);
    expect(report.disposableAfterBillsPaise).toBe(420_000);
    expect(report.safeDailySpendPaise).toBe(38_182);
  });
});
