import { describe, expect, it } from "vitest";
import {
  buildSuggestionDrafts,
  stableCalculationJson,
  validateSuggestionDraft,
} from "@/services/suggestionEngine";
import { appendSuggestionHistory } from "@/services/suggestionSync";
import { shouldSkipSuggestionDraft } from "@/services/suggestionSync";
import type { SuggestionEngineInput } from "@/services/suggestionEngine";
import type { Account, AiSuggestion, Card, Category, EMIPayment, Loan, Transaction, UdhariRecord } from "@/types";

const baseEntity = {
  userId: "u1",
  createdAt: "2026-05-01",
  updatedAt: "2026-05-01",
  isDeleted: 0 as const,
  version: 1,
  tags: [] as string[],
  notes: "",
};

const foodCategory: Category = {
  ...baseEntity,
  id: "cfood",
  name: "Food",
  color: "#000",
  icon: "food",
  parentId: null,
  sortOrder: 1,
  appliesTo: "expense",
  budgetable: 1,
  taxRelevant: 0,
  gstRelevant: 0,
  archived: 0,
};

function emptyInput(overrides: Partial<SuggestionEngineInput> = {}): SuggestionEngineInput {
  return {
    userId: "u1",
    today: new Date("2026-05-12T12:00:00"),
    accounts: [],
    cards: [],
    loans: [],
    emis: [],
    goals: [],
    budgets: [],
    udhari: [],
    recurringRules: [],
    categories: [foodCategory],
    transactions: [],
    ledgerEvents: [],
    ledgerEffects: [],
    ...overrides,
  };
}

function expense(overrides: Partial<Transaction> = {}): Transaction {
  return {
    ...baseEntity,
    id: "t1",
    date: "2026-05-10",
    type: "expense",
    amount: 1_000,
    amountPaise: 100_000,
    categoryId: "cfood",
    accountId: "a1",
    paymentMode: "upi",
    merchantOrPerson: "Store",
    description: "",
    billAvailable: 0,
    gstApplicable: 0,
    taxFlag: 0,
    businessOrPersonal: "personal",
    needWant: "need",
    fixedVariable: "variable",
    plannedUnplanned: "unplanned",
    ...overrides,
  };
}

function activeLoan(overrides: Partial<Loan> = {}): Loan {
  return {
    ...baseEntity,
    id: "loan1",
    lender: "HDFC Bank",
    loanType: "personal",
    principal: 500_000,
    principalPaise: 50_000_000,
    startDate: "2026-01-01",
    tenureMonths: 60,
    annualInterestRate: 12,
    emiDueDay: 5,
    processingFee: 0,
    insuranceCost: 0,
    prepaymentAllowed: 1,
    status: "active",
    ...overrides,
  };
}

function emiPayment(overrides: Partial<EMIPayment> = {}): EMIPayment {
  return {
    ...baseEntity,
    id: "emi1",
    loanId: "loan1",
    dueDate: "2026-05-05",
    amountDue: 10_000,
    amountPaise: 1_000_000,
    amountPaid: 0,
    amountPaidPaise: 0,
    principalComponent: 7_000,
    principalComponentPaise: 700_000,
    interestComponent: 3_000,
    interestComponentPaise: 300_000,
    status: "overdue",
    ...overrides,
  };
}

describe("suggestionEngine", () => {
  it("stableCalculationJson is order-insensitive", () => {
    const a = { z: 1, b: { y: 2, a: 3 } };
    const b = { b: { a: 3, y: 2 }, z: 1 };
    expect(stableCalculationJson(a as Record<string, unknown>)).toBe(
      stableCalculationJson(b as Record<string, unknown>),
    );
  });

  it("emits budget draft with reason and calculation_inputs_json", () => {
    const today = new Date("2026-05-12T12:00:00");
    const input: SuggestionEngineInput = {
      userId: "u1",
      today,
      accounts: [],
      cards: [],
      loans: [],
      emis: [],
      goals: [],
      budgets: [
        {
          id: "b1",
          userId: "u1",
          createdAt: "2026-05-01",
          updatedAt: "2026-05-01",
          isDeleted: 0,
          version: 1,
          tags: [],
          notes: "",
          period: "monthly",
          year: 2026,
          month: 5,
          categoryId: "cfood",
          amount: 8000,
          amountPaise: 800_000,
          mode: "fixed",
          carryForward: 0,
          rolloverSavings: 0,
        },
      ],
      udhari: [],
      recurringRules: [],
      categories: [
        {
          id: "cfood",
          userId: "u1",
          createdAt: "2026-05-01",
          updatedAt: "2026-05-01",
          isDeleted: 0,
          version: 1,
          tags: [],
          notes: "",
          name: "Food",
          color: "#000",
          parentId: "",
          sortOrder: 1,
          appliesTo: "expense",
        },
      ],
      transactions: [
        {
          id: "t1",
          userId: "u1",
          createdAt: "2026-05-10",
          updatedAt: "2026-05-10",
          isDeleted: 0,
          version: 1,
          tags: [],
          notes: "",
          date: "2026-05-10",
          type: "expense",
          amount: 6900,
          amountPaise: 690_000,
          categoryId: "cfood",
          accountId: "a1",
          paymentMode: "upi",
          merchantOrPerson: "Store",
          description: "Groceries",
          billAvailable: 0,
          gstApplicable: 0,
          taxFlag: 0,
          businessOrPersonal: "personal",
          needWant: "need",
          fixedVariable: "variable",
          plannedUnplanned: "unplanned",
        },
      ],
      ledgerEvents: [],
      ledgerEffects: [],
    };
    const drafts = buildSuggestionDrafts(input);
    const food = drafts.find((d) => d.dedupeKey === "budget:cfood:2026-05");
    expect(food).toBeDefined();
    expect(food!.reason.length).toBeGreaterThan(10);
    expect(food!.calculationInputsJson.spentPaise).toBe(690_000);
    expect(food!.calculationInputsJson.capPaise).toBe(800_000);
  });

  it("every generated draft satisfies the explainable source-of-truth contract", () => {
    const today = new Date("2026-05-12T12:00:00");
    const input: SuggestionEngineInput = {
      userId: "u1",
      today,
      accounts: [],
      cards: [],
      loans: [],
      emis: [],
      goals: [],
      budgets: [
        {
          id: "b1",
          userId: "u1",
          createdAt: "2026-05-01",
          updatedAt: "2026-05-01",
          isDeleted: 0,
          version: 1,
          tags: [],
          notes: "",
          period: "monthly",
          year: 2026,
          month: 5,
          categoryId: "cfood",
          amount: 8000,
          limitPaise: 800_000,
          mode: "fixed",
          carryForward: 0,
          rolloverSavings: 0,
        },
      ],
      udhari: [],
      recurringRules: [],
      categories: [
        {
          id: "cfood",
          userId: "u1",
          createdAt: "2026-05-01",
          updatedAt: "2026-05-01",
          isDeleted: 0,
          version: 1,
          tags: [],
          notes: "",
          name: "Food",
          color: "#000",
          icon: "food",
          parentId: null,
          sortOrder: 1,
          appliesTo: "expense",
          budgetable: 1,
          taxRelevant: 0,
          gstRelevant: 0,
          archived: 0,
        },
      ],
      transactions: [
        {
          id: "t1",
          userId: "u1",
          createdAt: "2026-05-10",
          updatedAt: "2026-05-10",
          isDeleted: 0,
          version: 1,
          tags: [],
          notes: "",
          date: "2026-05-10",
          type: "expense",
          amount: 6900,
          amountPaise: 690_000,
          categoryId: "cfood",
          accountId: "a1",
          paymentMode: "upi",
          merchantOrPerson: "Store",
          description: "Groceries",
          billAvailable: 0,
          gstApplicable: 0,
          taxFlag: 0,
          businessOrPersonal: "personal",
          needWant: "need",
          fixedVariable: "variable",
          plannedUnplanned: "unplanned",
        },
      ],
      ledgerEvents: [],
      ledgerEffects: [],
    };

    const drafts = buildSuggestionDrafts(input);

    expect(drafts.length).toBeGreaterThan(0);
    for (const row of drafts) {
      expect(validateSuggestionDraft(row)).toEqual([]);
      expect(row.status).toBe("active");
      expect(row.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(row.confidenceScore).toBeLessThanOrEqual(1);
      expect(row.sourceModule).toBe("suggestionEngine.v1");
    }
  });

  it("emits deterministic EMI overdue and partial pending suggestions", () => {
    const drafts = buildSuggestionDrafts(
      emptyInput({
        loans: [activeLoan()],
        emis: [
          emiPayment({ id: "emi-overdue", status: "overdue", dueDate: "2026-05-01" }),
          emiPayment({
            id: "emi-partial",
            status: "partial",
            dueDate: "2026-05-10",
            amountPaid: 6_000,
            amountPaidPaise: 600_000,
          }),
        ],
      }),
    );

    const overdue = drafts.find((d) => d.dedupeKey === "emi:overdue:emi-overdue:2026-05");
    const partial = drafts.find((d) => d.dedupeKey === "emi:partial:emi-partial:2026-05");
    expect(overdue).toBeDefined();
    expect(partial).toBeDefined();
    expect(overdue!.calculationInputsJson.pendingPaise).toBe(1_000_000);
    expect(partial!.calculationInputsJson.pendingPaise).toBe(400_000);
    expect(validateSuggestionDraft(overdue!)).toEqual([]);
    expect(validateSuggestionDraft(partial!)).toEqual([]);
  });

  it("tracks suggestion history events without replacing prior audit trail", () => {
    const history = appendSuggestionHistory(
      { historyJson: [{ type: "created", at: "2026-05-01T00:00:00.000Z" }] },
      "dismissed",
      new Date("2026-05-02T00:00:00.000Z"),
    );

    expect(history).toHaveLength(2);
    expect(history[0].type).toBe("created");
    expect(history[1]).toMatchObject({ type: "dismissed", at: "2026-05-02T00:00:00.000Z" });
  });

  it("card utilization suggestion uses exact outstanding and limit", () => {
    const card: Card = {
      ...baseEntity,
      id: "card1",
      nickname: "HDFC",
      bank: "HDFC",
      last4: "1111",
      type: "credit",
      creditLimit: 50_000,
      creditLimitPaise: 5_000_000,
      statementDay: 1,
      dueDay: 20,
      interestRate: 42,
      color: "#111827",
      isInactive: 0,
    };

    const drafts = buildSuggestionDrafts(
      emptyInput({
        cards: [card],
        transactions: [
          expense({
            id: "cc1",
            paymentMode: "credit_card",
            linkedCardId: "card1",
            amount: 42_000,
            amountPaise: 4_200_000,
          }),
        ],
      }),
    );
    const suggestion = drafts.find((d) => d.suggestionType === "credit_card");

    expect(suggestion).toBeDefined();
    expect(suggestion!.calculationInputsJson.outstandingPaise).toBe(4_200_000);
    expect(suggestion!.calculationInputsJson.limitPaise).toBe(5_000_000);
    expect(suggestion!.calculationInputsJson.utilizationPct).toBe(84);
  });

  it("loan suggestion uses exact principal, interest estimate, and prepayment values", () => {
    const loan: Loan = {
      ...baseEntity,
      id: "loan1",
      name: "Personal loan",
      lender: "Bank",
      loanType: "personal",
      principal: 100_000,
      principalPaise: 10_000_000,
      startDate: "2026-01-01",
      tenureMonths: 12,
      annualInterestRate: 12,
      emiDueDay: 5,
      processingFee: 0,
      insuranceCost: 0,
      prepaymentAllowed: 1,
      foreclosureCharges: 0,
      status: "active",
    };

    const drafts = buildSuggestionDrafts(emptyInput({ loans: [loan] }));
    const suggestion = drafts.find((d) => d.suggestionType === "loan");

    expect(suggestion).toBeDefined();
    expect(suggestion!.calculationInputsJson.outstandingPrincipalPaise).toBe(10_000_000);
    expect(suggestion!.calculationInputsJson.extraPrepaymentPaise).toBe(200_000);
    expect(Number(suggestion!.calculationInputsJson.remainingInterestEstimatePaise)).toBeGreaterThan(0);
  });

  it("cashflow suggestion uses safe daily spend from the survival engine", () => {
    const account: Account = {
      ...baseEntity,
      id: "bank",
      name: "Bank",
      type: "bank",
      openingBalance: 7_200,
      openingBalancePaise: 720_000,
      color: "#2563eb",
      icon: "bank",
      isInactive: 0,
    };

    const drafts = buildSuggestionDrafts(
      emptyInput({
        today: new Date("2026-02-01T00:00:00.000Z"),
        accounts: [account],
        recurringRules: [
          {
            ...baseEntity,
            id: "card-bill",
            title: "Card bill",
            type: "cc_payment",
            amount: 3_000,
            amountPaise: 300_000,
            accountId: "bank",
            paymentMode: "bank_transfer",
            frequency: "monthly",
            dayOfMonth: 5,
            nextRunDate: "2026-02-05",
            active: 1,
          },
          {
            ...baseEntity,
            id: "salary",
            title: "Salary",
            type: "income",
            amount: 0,
            amountPaise: 0,
            accountId: "bank",
            paymentMode: "bank_transfer",
            frequency: "monthly",
            dayOfMonth: 12,
            nextRunDate: "2026-02-12",
            active: 1,
          },
        ],
      }),
    );
    const suggestion = drafts.find((d) => d.suggestionType === "cashflow");

    expect(suggestion).toBeDefined();
    expect(suggestion!.calculationInputsJson.safeDailyCorePaise).toBe(38_182);
    expect(suggestion!.calculationInputsJson.daysUntilNextIncome).toBe(11);
  });

  it("udhari suggestion uses person ledger amount and ageing", () => {
    const udhari: UdhariRecord = {
      ...baseEntity,
      id: "u1",
      personName: "Rahul",
      type: "receivable",
      amount: 2_500,
      amountPaise: 250_000,
      amountSettled: 0,
      amountSettledPaise: 0,
      givenDate: "2026-04-24",
      status: "open",
      reminderOn: 1,
      context: "friend",
    };

    const drafts = buildSuggestionDrafts(emptyInput({ udhari: [udhari] }));
    const suggestion = drafts.find((d) => d.suggestionType === "udhari");

    expect(suggestion).toBeDefined();
    expect(suggestion!.calculationInputsJson.personName).toBe("Rahul");
    expect(suggestion!.calculationInputsJson.openBalancePaise).toBe(250_000);
    expect(suggestion!.calculationInputsJson.daysSinceAnchor).toBe(18);
  });

  it("dismissed suggestions do not duplicate immediately, while expired suggestions can regenerate", () => {
    const baseSuggestion: AiSuggestion = {
      ...baseEntity,
      id: "ais1",
      dedupeKey: "budget:cfood:2026-05",
      suggestionType: "budget",
      severity: "warning",
      title: "Food budget pace",
      reason: "Reason",
      calculationInputsJson: { spentPaise: 690_000 },
      recommendedAction: "Action",
      expectedImpactJson: {},
      confidenceScore: 0.8,
      sourceModule: "suggestionEngine.v1",
      status: "dismissed",
      expiresAt: "2026-05-31T23:59:59.000Z",
    };

    expect(shouldSkipSuggestionDraft(baseSuggestion, new Date("2026-05-12"))).toBe(true);
    expect(
      shouldSkipSuggestionDraft(
        { ...baseSuggestion, status: "expired", updatedAt: "2026-04-01" },
        new Date("2026-05-12"),
      ),
    ).toBe(false);
  });

  it("AI suggestions cannot access another user's data", () => {
    const drafts = buildSuggestionDrafts(
      emptyInput({
        transactions: [
          expense({
            id: "other-tx",
            userId: "other",
            amount: 7_900,
            amountPaise: 790_000,
          }),
        ],
        budgets: [
          {
            ...baseEntity,
            id: "other-budget",
            userId: "other",
            period: "monthly",
            year: 2026,
            month: 5,
            categoryId: "cfood",
            amount: 8_000,
            limitPaise: 800_000,
            mode: "fixed",
            carryForward: 0,
            rolloverSavings: 0,
          },
        ],
      }),
    );

    expect(drafts.some((d) => stableCalculationJson(d.calculationInputsJson).includes("790000"))).toBe(false);
  });
});
