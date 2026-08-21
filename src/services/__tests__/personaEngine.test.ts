import { describe, expect, it } from "vitest";
import {
  aiGuardrails,
  buildPersonaCoachSurfaces,
  buildPersonaSignals,
  inferPersona,
  rankSuggestionsForPersona,
  rankTopicsForPersona,
} from "@/services/personaEngine";
import type { AiSuggestion, Transaction } from "@/types";

const t = (over: Partial<Transaction>): Transaction => ({
  id: over.id ?? "t",
  userId: "u",
  type: "expense",
  amount: 0,
  amountPaise: 0,
  date: "2026-05-13",
  paymentMode: "upi",
  merchantOrPerson: "",
  description: "",
  billAvailable: 0,
  gstApplicable: 0,
  taxFlag: 0,
  businessOrPersonal: "personal",
  needWant: "unassigned",
  fixedVariable: "unassigned",
  plannedUnplanned: "unassigned",
  isDeleted: 0,
  createdAt: "2026-05-13T00:00:00.000Z",
  updatedAt: "2026-05-13T00:00:00.000Z",
  ...over,
}) as Transaction;

function suggestion(overrides: Partial<AiSuggestion>): AiSuggestion {
  return {
    id: overrides.id ?? "s1",
    userId: "u",
    dedupeKey: overrides.dedupeKey ?? `dedupe:${overrides.id ?? "s1"}`,
    suggestionType: overrides.suggestionType ?? "budget",
    severity: overrides.severity ?? "warning",
    title: overrides.title ?? "Suggestion",
    reason: overrides.reason ?? "A deterministic reason.",
    calculationInputsJson: overrides.calculationInputsJson ?? { amountPaise: 1000 },
    recommendedAction: overrides.recommendedAction ?? `Act on ${overrides.suggestionType ?? "budget"}`,
    expectedImpactJson: overrides.expectedImpactJson ?? {},
    confidenceScore: overrides.confidenceScore ?? 0.9,
    sourceModule: overrides.sourceModule ?? "test",
    status: overrides.status ?? "active",
    historyJson: [],
    aiExplanation: null,
    remindAt: null,
    expiresAt: overrides.expiresAt ?? "2026-06-01T00:00:00.000Z",
    isDeleted: 0,
    createdAt: "2026-05-13T00:00:00.000Z",
    updatedAt: "2026-05-13T00:00:00.000Z",
    ...overrides,
  };
}

describe("Phase 16 buildPersonaSignals", () => {
  it("computes monthly income and expense from the last 3 months", () => {
    const signals = buildPersonaSignals({
      transactions: [
        t({ id: "1", type: "income", amountPaise: 7_500_000, date: "2026-03-30" }),
        t({ id: "2", type: "income", amountPaise: 7_500_000, date: "2026-04-30" }),
        t({ id: "3", type: "expense", amountPaise: 3_000_000, date: "2026-04-15" }),
        t({ id: "4", type: "expense", amountPaise: 3_000_000, date: "2026-05-10" }),
      ],
      accounts: [],
      cards: [],
      loans: [],
      udharis: [],
      now: new Date(2026, 4, 13),
    });

    expect(signals.monthlyIncomePaise).toBe(5_000_000);
    expect(signals.monthlyExpensePaise).toBe(2_000_000);
  });
});

describe("Phase 16 inferPersona", () => {
  it("honors explicit user-selected persona", () => {
    const p = inferPersona({
      monthlyIncomePaise: 5_000_000,
      monthlyExpensePaise: 3_000_000,
      netDebtPaise: 0,
      liquidAssetsPaise: 100_000,
      cashShareRatio: 0.1,
      businessShareRatio: 0.05,
      hasLoans: false,
      hasCardOutstanding: false,
    }, "family");

    expect(p.primary).toBe("family");
    expect(p.confidence).toBe(1);
  });

  it("detects debt-heavy, cash-heavy, freelancer, small business, high net worth, student, and salaried", () => {
    const base = {
      monthlyIncomePaise: 5_000_000,
      monthlyExpensePaise: 3_000_000,
      netDebtPaise: 0,
      liquidAssetsPaise: 100_000,
      cashShareRatio: 0.1,
      businessShareRatio: 0.05,
      hasLoans: false,
      hasCardOutstanding: false,
    };

    expect(inferPersona({ ...base, netDebtPaise: 60_000_000, hasLoans: true }).primary).toBe("debt_heavy");
    expect(inferPersona({ ...base, cashShareRatio: 0.85 }).primary).toBe("cash_heavy");
    expect(inferPersona({ ...base, businessShareRatio: 0.4 }).primary).toBe("freelancer");
    expect(inferPersona({ ...base, businessShareRatio: 0.75 }).primary).toBe("small_business");
    expect(inferPersona({ ...base, liquidAssetsPaise: 5_000_000 * 60 }).primary).toBe("high_net_worth");
    expect(inferPersona({ ...base, monthlyIncomePaise: 1_000_000 }).primary).toBe("student");
    expect(inferPersona(base).primary).toBe("salaried");
  });
});

describe("Phase 16 ranking", () => {
  it("ranks topics by persona", () => {
    expect(rankTopicsForPersona("student")[0]).toBe("safe_daily_spend");
    expect(rankTopicsForPersona("debt_heavy").slice(0, 2)).toEqual(["credit_card", "loan"]);
    expect(rankTopicsForPersona("small_business").slice(0, 3)).toEqual(["missing_bill", "tax", "safe_daily_spend"]);
    expect(rankTopicsForPersona("high_net_worth").slice(0, 2)).toEqual(["net_worth", "safe_daily_spend"]);
  });

  it("reorders generic topic objects by persona priority", () => {
    const ranked = rankSuggestionsForPersona([
      { id: "a", topic: "tax" as const },
      { id: "b", topic: "budget" as const },
      { id: "c", topic: "credit_card" as const },
    ], "debt_heavy");

    expect(ranked[0].id).toBe("c");
  });

  it("ranks persisted AiSuggestion rows directly", () => {
    const rows = [
      suggestion({ id: "budget", suggestionType: "budget", severity: "danger" }),
      suggestion({ id: "card", suggestionType: "credit_card", severity: "warning" }),
      suggestion({ id: "tax", suggestionType: "tax", severity: "danger" }),
    ];

    expect(rankSuggestionsForPersona(rows, "debt_heavy")[0].id).toBe("card");
    expect(rankSuggestionsForPersona(rows, "small_business")[0].id).toBe("tax");
  });

  it("changes suggestion order when user persona changes", () => {
    const rows = [
      suggestion({ id: "cashflow", suggestionType: "cashflow", severity: "warning" }),
      suggestion({ id: "card", suggestionType: "credit_card", severity: "warning" }),
      suggestion({ id: "networth", suggestionType: "net_worth", severity: "info" }),
    ];

    expect(rankSuggestionsForPersona(rows, "student")[0].id).toBe("cashflow");
    expect(rankSuggestionsForPersona(rows, "debt_heavy")[0].id).toBe("card");
    expect(rankSuggestionsForPersona(rows, "high_net_worth")[0].id).toBe("networth");
  });
});

describe("Phase 16 AI guardrails", () => {
  it("blocks regulated or unsafe advice", () => {
    expect(aiGuardrails("You should buy TCS shares").ok).toBe(false);
    expect(aiGuardrails("Sell Nifty futures now").ok).toBe(false);
    expect(aiGuardrails("Recommend you sell HDFC").ok).toBe(false);
    expect(aiGuardrails("SIP in axis bluechip fund").ok).toBe(false);
    expect(aiGuardrails("Apply for ABC Bank credit card for better rewards").ok).toBe(false);
    expect(aiGuardrails("Take this personal loan product today").ok).toBe(false);
    expect(aiGuardrails("This is a guaranteed risk-free saving").ok).toBe(false);
  });

  it("allows deterministic educational coaching language", () => {
    expect(aiGuardrails("Your food budget is 92% used with 6 days left.").ok).toBe(true);
    expect(aiGuardrails("Consider paying down your card to bring usage below 30%.").ok).toBe(true);
  });

  it("blocks invented numbers when a deterministic number allowlist is supplied", () => {
    expect(aiGuardrails("Pay Rs 7000 to reduce usage to 70%", { allowedNumbers: [7000, 70] }).ok).toBe(true);
    expect(aiGuardrails("Pay Rs 9000 to reduce usage to 60%", { allowedNumbers: [7000, 70] }).ok).toBe(false);
  });
});

describe("Phase 16 coach surfaces", () => {
  it("builds explainable top actions and plan surfaces from deterministic suggestions", () => {
    const persona = inferPersona({
      monthlyIncomePaise: 5_000_000,
      monthlyExpensePaise: 4_000_000,
      netDebtPaise: 60_000_000,
      liquidAssetsPaise: 100_000,
      cashShareRatio: 0.1,
      businessShareRatio: 0,
      hasLoans: true,
      hasCardOutstanding: true,
    });
    const surfaces = buildPersonaCoachSurfaces({
      persona,
      suggestions: [
        suggestion({ id: "goal", suggestionType: "goal", title: "Goal behind", severity: "warning" }),
        suggestion({ id: "loan", suggestionType: "loan", title: "Loan prepayment", severity: "opportunity" }),
        suggestion({ id: "cash", suggestionType: "cashflow", title: "Low daily spend", severity: "danger" }),
        suggestion({ id: "card", suggestionType: "credit_card", title: "Card risk", severity: "warning" }),
      ],
    });

    expect(surfaces.persona.primary).toBe("debt_heavy");
    expect(surfaces.top3ActionsToday[0].sourceData).toEqual({ amountPaise: 1000 });
    expect(surfaces.top3ActionsToday[0].calculation).toContain("deterministic");
    expect(surfaces.debtActionPlan?.recommendedAction).toBe("Act on credit_card");
    expect(surfaces.goalActionPlan?.sourceData).toEqual({ amountPaise: 1000 });
    expect(surfaces.cashflowDangerWarning?.riskLevel).toBe("critical");
  });
});
