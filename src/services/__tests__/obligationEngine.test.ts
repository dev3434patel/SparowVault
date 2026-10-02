import { describe, it, expect } from "vitest";
import {
  cardStatementDuePaise,
  materializeCardEmiObligations,
  materializeCardStatementObligations,
  materializeInsuranceObligations,
  materializeRecurringObligations,
  materializeUdhariObligations,
  mergeObligationsUnique,
  obligationOccurrenceKey,
  projectRecurringDates,
} from "@/services/obligationEngine";
import type {
  Card,
  CardEmiInstallment,
  CardEmiPlan,
  CardStatement,
  InsurancePolicy,
  RecurringRule,
  UdhariRecord,
} from "@/types";

const rule = (over: Partial<RecurringRule>): RecurringRule =>
  ({
    id: over.id ?? "r1",
    userId: "u1",
    title: over.title ?? "Rent",
    type: "expense",
    amountPaise: over.amountPaise ?? 250_000_0,
    amount: 25000,
    paymentMode: "bank_transfer",
    frequency: "monthly",
    dayOfMonth: over.dayOfMonth ?? 5,
    nextRunDate: "2026-05-05",
    active: 1,
    isDeleted: 0,
    createdAt: "2026-05-01",
    updatedAt: "2026-05-01",
    version: 1,
    tags: [],
    notes: "",
    ...over,
  }) as RecurringRule;

describe("obligationEngine", () => {
  it("occurrenceKey is idempotent for same rule+date", () => {
    const k1 = obligationOccurrenceKey("recurring", "r1", "2026-05-05");
    const k2 = obligationOccurrenceKey("recurring", "r1", "2026-05-05");
    expect(k1).toBe(k2);
  });

  it("mergeObligationsUnique never duplicates occurrenceKey", () => {
    const today = new Date("2026-05-01");
    const a = materializeRecurringObligations([rule({ id: "r1" })], "u1", today);
    const b = materializeRecurringObligations([rule({ id: "r1" })], "u1", today);
    const merged = mergeObligationsUnique(a, b);
    const keys = new Set(merged.map((o) => o.occurrenceKey));
    expect(keys.size).toBe(merged.length);
  });

  it("projects weekly dates and does not invent an expense", () => {
    const today = new Date("2026-05-04T00:00:00.000Z");
    const dates = projectRecurringDates(
      rule({ frequency: "weekly", nextRunDate: "2026-05-04", dayOfWeek: 1 }),
      today,
      14,
    );
    expect(dates.length).toBeGreaterThan(1);
    const rows = materializeRecurringObligations(
      [rule({ frequency: "weekly", nextRunDate: "2026-05-04" })],
      "u1",
      today,
      14,
    );
    expect(rows.every((row) => row.notes === "scheduled-due")).toBe(true);
    expect(rows.every((row) => row.sourceType === "recurring_rule")).toBe(true);
  });

  it("materializes card, EMI, udhari, and insurance dues without turning them into expenses", () => {
    const today = new Date(2026, 4, 1);
    const base = {
      userId: "u1",
      createdAt: "2026-05-01",
      updatedAt: "2026-05-01",
      isDeleted: 0 as const,
      version: 1,
      tags: [] as string[],
      notes: "",
    };
    const statements = materializeCardStatementObligations(
      [
        {
          ...base,
          id: "st-open",
          cardId: "card-1",
          cycleStartDate: "2026-04-01",
          cycleEndDate: "2026-04-30",
          statementDate: "2026-05-01",
          openingBalancePaise: 0,
          closingBalancePaise: 300000,
          minimumDuePaise: 10000,
          retailSpendPaise: 300000,
          feesPaise: 0,
          interestPaise: 0,
          paymentsPaise: 0,
          creditsPaise: 0,
          status: "open",
        },
        {
          ...base,
          id: "st-paid",
          cardId: "card-1",
          cycleStartDate: "2026-03-01",
          cycleEndDate: "2026-03-31",
          statementDate: "2026-04-01",
          openingBalancePaise: 0,
          closingBalancePaise: 10000,
          minimumDuePaise: 10000,
          retailSpendPaise: 0,
          feesPaise: 0,
          interestPaise: 0,
          paymentsPaise: 10000,
          creditsPaise: 0,
          status: "paid",
        },
      ] as CardStatement[],
      [{ ...base, id: "card-1", nickname: "Local Card", dueDay: 15, type: "credit", isInactive: 0 } as Card],
      "u1",
      today,
    );
    const emis = materializeCardEmiObligations(
      [
        {
          ...base,
          id: "inst-1",
          planId: "plan-1",
          installmentNo: 1,
          dueDate: "2026-05-10",
          emiPaise: 40000,
          principalPaise: 38000,
          interestPaise: 2000,
          feePaise: 0,
          taxPaise: 0,
          status: "projected",
          source: "estimated",
        },
        {
          ...base,
          id: "inst-paid",
          planId: "plan-1",
          installmentNo: 2,
          dueDate: "2026-06-10",
          emiPaise: 40000,
          principalPaise: 38000,
          interestPaise: 2000,
          feePaise: 0,
          taxPaise: 0,
          status: "paid",
          source: "estimated",
        },
      ] as CardEmiInstallment[],
      [{ ...base, id: "plan-1", cardId: "card-1", purchaseTransactionIds: ["purchase-1"], status: "active" } as CardEmiPlan],
      "u1",
      today,
    );
    const udhari = materializeUdhariObligations(
      [
        {
          ...base,
          id: "ud-1",
          personName: "Rita",
          type: "payable",
          amount: 500,
          amountPaise: 50000,
          givenDate: "2026-04-01",
          dueDate: "2026-05-12",
          status: "open",
          amountSettled: 200,
          amountSettledPaise: 20000,
          reminderOn: 0,
          context: "friend",
        },
        {
          ...base,
          id: "ud-settled",
          personName: "Settled",
          type: "payable",
          amount: 100,
          amountPaise: 10000,
          givenDate: "2026-04-01",
          dueDate: "2026-05-12",
          status: "settled",
          amountSettled: 100,
          amountSettledPaise: 10000,
          reminderOn: 0,
          context: "friend",
        },
      ] as UdhariRecord[],
      "u1",
      today,
    );
    const insurance = materializeInsuranceObligations(
      [
        { ...base, id: "pol-1", name: "Health", insurer: "Local", premiumPaise: 150000, premiumDueDay: 20, coveragePaise: 0, status: "active" },
        { ...base, id: "pol-lapsed", name: "Lapsed", insurer: "Local", premiumPaise: 90000, premiumDueDay: 20, coveragePaise: 0, status: "lapsed" },
      ] as InsurancePolicy[],
      "u1",
      today,
    );
    const rows = [...statements, ...emis, ...udhari, ...insurance];
    expect(rows.map((row) => [row.sourceType, row.dueDate, row.amountPaise])).toEqual([
      ["card_statement", "2026-05-15", 10000],
      ["card_emi", "2026-05-10", 40000],
      ["udhari", "2026-05-12", 30000],
      ["insurance", "2026-05-20", 150000],
    ]);
    expect(rows.every((row) => row.notes === "scheduled-due")).toBe(true);
    expect(rows.every((row) => row.status === "due")).toBe(true);
    expect(emis[0]?.cardId).toBe("card-1");
    expect(JSON.stringify(rows)).not.toContain("purchase-1");
    const again = mergeObligationsUnique(rows, rows);
    expect(again).toHaveLength(rows.length);
  });

  it("leaves an unobserved card minimum off the calendar", () => {
    const today = new Date(2026, 4, 1);
    const statement = {
      id: "st-unknown",
      userId: "u1",
      cardId: "card-1",
      cycleStartDate: "2026-04-01",
      cycleEndDate: "2026-04-30",
      statementDate: "2026-05-01",
      openingBalancePaise: 0,
      closingBalancePaise: 300000,
      minimumDuePaise: 0,
      retailSpendPaise: 300000,
      feesPaise: 0,
      interestPaise: 0,
      paymentsPaise: 0,
      creditsPaise: 0,
      status: "open",
      createdAt: "2026-05-01",
      updatedAt: "2026-05-01",
      isDeleted: 0,
      version: 1,
      tags: [],
      notes: "minimumDue=not_observed",
    } as CardStatement;
    expect(cardStatementDuePaise(statement)).toBeNull();
    const rows = materializeCardStatementObligations(
      [statement],
      [{ id: "card-1", userId: "u1", nickname: "Local", dueDay: 15, type: "credit", isInactive: 0, isDeleted: 0 } as Card],
      "u1",
      today,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.title).toContain("minimum due unknown");
    expect(rows[0]?.amountPaise).toBe(300000);
    expect(rows[0]?.notes).toBe("scheduled-due");
    expect(rows[0]?.status).toBe("due");
  });
});
