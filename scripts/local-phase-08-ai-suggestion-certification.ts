import fs from "node:fs";
import path from "node:path";
import {
  buildSuggestionDrafts,
  validateSuggestionDraft,
  type SuggestionDraft,
  type SuggestionEngineInput,
} from "@/services/suggestionEngine";
import { validateSuggestionAiRewrite } from "@/services/suggestionAiExplain";
import type {
  Account,
  Budget,
  Card,
  Category,
  EMIPayment,
  Goal,
  Loan,
  RecurringRule,
  Transaction,
  UdhariRecord,
} from "@/types";

const repoRoot = process.cwd();
const logsDir = path.join(repoRoot, "local-phase-08-logs");
fs.mkdirSync(logsDir, { recursive: true });

const userId = "phase8-user";
const otherUserId = "phase8-other-user";
const today = new Date("2026-05-22T10:00:00+05:30");

const base = {
  userId,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
  isDeleted: 0 as const,
  version: 1,
  tags: [] as string[],
  notes: "",
};

const categories: Category[] = [
  {
    ...base,
    id: "cat-food",
    name: "Food",
    parentId: null,
    appliesTo: "expense",
    icon: "utensils",
    color: "#ef4444",
    budgetable: 1,
    taxRelevant: 0,
    gstRelevant: 0,
    sortOrder: 1,
    archived: 0,
  },
  {
    ...base,
    id: "cat-subscription",
    name: "Subscriptions",
    parentId: null,
    appliesTo: "expense",
    icon: "repeat",
    color: "#0ea5e9",
    budgetable: 1,
    taxRelevant: 0,
    gstRelevant: 0,
    sortOrder: 2,
    archived: 0,
  },
  {
    ...base,
    id: "cat-business",
    name: "Business Supplies",
    parentId: null,
    appliesTo: "expense",
    icon: "briefcase",
    color: "#22c55e",
    budgetable: 1,
    taxRelevant: 1,
    gstRelevant: 1,
    sortOrder: 3,
    archived: 0,
  },
];

const accounts: Account[] = [
  {
    ...base,
    id: "acct-bank",
    name: "SBI Bank",
    type: "bank",
    openingBalance: 400,
    openingBalancePaise: 40_000,
    color: "#2563eb",
    icon: "bank",
    isInactive: 0,
  },
];

const cards: Card[] = [
  {
    ...base,
    id: "card-hdfc",
    nickname: "HDFC Card",
    bank: "HDFC",
    last4: "1111",
    type: "credit",
    creditLimit: 50_000,
    creditLimitPaise: 5_000_000,
    statementDay: 10,
    dueDay: 25,
    interestRate: 42,
    color: "#dc2626",
    isInactive: 0,
  },
  {
    ...base,
    userId: otherUserId,
    id: "other-card",
    nickname: "Other User Card",
    bank: "Other",
    last4: "9999",
    type: "credit",
    creditLimit: 10_000_000,
    creditLimitPaise: 1_000_000_000,
    statementDay: 1,
    dueDay: 15,
    color: "#000",
    isInactive: 0,
  },
];

const loans: Loan[] = [
  {
    ...base,
    id: "loan-personal",
    name: "Personal Loan",
    lender: "HDFC Bank",
    loanType: "personal",
    principal: 500_000,
    principalPaise: 50_000_000,
    startDate: "2026-01-01",
    firstEmiDate: "2026-02-05",
    tenureMonths: 60,
    annualInterestRate: 12,
    annualInterestBps: 1_200,
    interestType: "reducing_balance",
    emiDueDay: 5,
    processingFee: 0,
    insuranceCost: 0,
    prepaymentAllowed: 1,
    status: "active",
  },
];

const emis: EMIPayment[] = [
  {
    ...base,
    id: "emi-overdue",
    loanId: "loan-personal",
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
  },
  {
    ...base,
    id: "emi-partial",
    loanId: "loan-personal",
    dueDate: "2026-05-15",
    amountDue: 10_000,
    amountPaise: 1_000_000,
    amountPaid: 6_000,
    amountPaidPaise: 600_000,
    principalComponent: 4_200,
    principalComponentPaise: 420_000,
    interestComponent: 1_800,
    interestComponentPaise: 180_000,
    status: "partial",
  },
];

const goals: Goal[] = [
  {
    ...base,
    id: "goal-emergency",
    title: "Emergency Fund",
    goalType: "emergency_fund",
    targetAmount: 60_000,
    targetAmountPaise: 6_000_000,
    targetDate: "2026-11-30",
    startedAt: "2026-01-01",
    currentSaved: 1_000,
    savedAmountPaise: 100_000,
    priority: 1,
    icon: "shield",
    color: "#16a34a",
    status: "active",
  },
];

const budgets: Budget[] = [
  {
    ...base,
    id: "budget-food",
    period: "monthly",
    year: 2026,
    month: 5,
    categoryId: "cat-food",
    amount: 5_000,
    amountPaise: 500_000,
    mode: "fixed",
    carryForward: 0,
    rolloverSavings: 0,
  },
];

const udhari: UdhariRecord[] = [
  {
    ...base,
    id: "udhari-rahul",
    personName: "Rahul",
    type: "receivable",
    amount: 2_500,
    amountPaise: 250_000,
    givenDate: "2026-04-01",
    dueDate: "2026-04-20",
    status: "open",
    amountSettled: 0,
    amountSettledPaise: 0,
    reminderOn: 1,
    context: "friend",
  },
];

const recurringRules: RecurringRule[] = [
  {
    ...base,
    id: "rule-streaming",
    title: "Streaming App",
    type: "expense",
    amount: 499,
    amountPaise: 49_900,
    categoryId: "cat-subscription",
    accountId: "acct-bank",
    paymentMode: "upi",
    frequency: "monthly",
    dayOfMonth: 3,
    nextRunDate: "2026-05-30",
    active: 1,
  },
];

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    ...base,
    id: "tx",
    date: "2026-05-10",
    type: "expense",
    amount: 1,
    amountPaise: 100,
    categoryId: "cat-food",
    accountId: "acct-bank",
    paymentMode: "upi",
    merchantOrPerson: "Merchant",
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

const transactions: Transaction[] = [
  tx({
    id: "tx-card-utilization",
    amount: 42_000,
    amountPaise: 4_200_000,
    paymentMode: "credit_card",
    linkedCardId: "card-hdfc",
    categoryId: "cat-food",
    accountId: undefined,
    merchantOrPerson: "Grocery Store",
  }),
  tx({
    id: "tx-budget-overrun",
    amount: 6_500,
    amountPaise: 650_000,
    categoryId: "cat-food",
    merchantOrPerson: "Food Store",
  }),
  tx({
    id: "tx-business-missing-bill",
    amount: 1_200,
    amountPaise: 120_000,
    categoryId: "cat-business",
    businessOrPersonal: "business",
    billAvailable: 0,
    gstApplicable: 1,
    taxFlag: 1,
    merchantOrPerson: "Office Vendor",
  }),
  tx({
    id: "tx-subscription-1",
    date: "2026-05-03",
    amount: 499,
    amountPaise: 49_900,
    categoryId: "cat-subscription",
    merchantOrPerson: "Streaming App",
  }),
  tx({
    id: "tx-subscription-2",
    date: "2026-05-11",
    amount: 499,
    amountPaise: 49_900,
    categoryId: "cat-subscription",
    merchantOrPerson: "Streaming App",
  }),
  tx({
    id: "tx-subscription-3",
    date: "2026-05-19",
    amount: 499,
    amountPaise: 49_900,
    categoryId: "cat-subscription",
    merchantOrPerson: "Streaming App",
  }),
  tx({
    ...base,
    userId: otherUserId,
    id: "other-user-secret-tx",
    amount: 9_999_999,
    amountPaise: 999_999_900,
    merchantOrPerson: "Other User Private Merchant",
  }),
];

const input: SuggestionEngineInput = {
  userId,
  today,
  accounts,
  cards,
  loans,
  emis,
  goals,
  budgets,
  udhari,
  recurringRules,
  categories,
  transactions,
  ledgerEvents: [],
  ledgerEffects: [],
};

const drafts = buildSuggestionDrafts(input);

const requiredChecks: Array<{ key: string; match: (draft: SuggestionDraft) => boolean }> = [
  { key: "card_utilization_above_80", match: (d) => d.suggestionType === "credit_card" && d.dedupeKey.startsWith("card:card-hdfc") },
  { key: "emi_overdue", match: (d) => d.dedupeKey === "emi:overdue:emi-overdue:2026-05" },
  { key: "partial_emi_pending", match: (d) => d.dedupeKey === "emi:partial:emi-partial:2026-05" },
  { key: "udhari_overdue", match: (d) => d.suggestionType === "udhari" && d.dedupeKey.startsWith("udhari:udhari-rahul") },
  { key: "goal_behind_schedule", match: (d) => d.suggestionType === "goal" && d.dedupeKey.startsWith("goal:goal-emergency") },
  { key: "emergency_fund_low", match: (d) => d.suggestionType === "emergency_fund" },
  { key: "budget_overrun", match: (d) => d.suggestionType === "budget" && d.dedupeKey.startsWith("budget:cat-food") },
  { key: "missing_bill_business_expense", match: (d) => d.suggestionType === "missing_bill" && d.dedupeKey === "tax:txn:tx-business-missing-bill" },
  { key: "subscription_recurring_expense", match: (d) => d.suggestionType === "subscription" && d.dedupeKey.startsWith("subscription:rule-streaming") },
  { key: "low_safe_daily_spend", match: (d) => d.suggestionType === "cashflow" && d.dedupeKey.startsWith("cashflow:daily") },
];

const triggerResults = requiredChecks.map((check) => {
  const found = drafts.find(check.match);
  return {
    key: check.key,
    passed: Boolean(found),
    dedupeKey: found?.dedupeKey ?? null,
    title: found?.title ?? null,
    severity: found?.severity ?? null,
    calculationInputsJson: found?.calculationInputsJson ?? null,
  };
});

const metadataResults = drafts.map((draft) => ({
  dedupeKey: draft.dedupeKey,
  title: draft.title,
  suggestionType: draft.suggestionType,
  missingFields: validateSuggestionDraft(draft),
}));

const serializedDrafts = JSON.stringify(drafts);
const isolationResult = {
  passed:
    !serializedDrafts.includes(otherUserId) &&
    !serializedDrafts.includes("other-user-secret-tx") &&
    !serializedDrafts.includes("Other User Private Merchant") &&
    !serializedDrafts.includes("999999900"),
  searchedForbiddenValues: [
    otherUserId,
    "other-user-secret-tx",
    "Other User Private Merchant",
    "999999900",
  ],
};

const guardrailPayload = {
  title: "Safe daily spend",
  reason: "After bills, safe daily spend is Rs 381 per day.",
  calculationInputsJson: { safeDailySpendPaise: 38_100, daysUntilSalary: 11 },
};
const guardrailResults = [
  {
    key: "stock_buy_sell_advice_blocked",
    result: validateSuggestionAiRewrite(
      guardrailPayload,
      "Safe daily spend is Rs 381 per day. You should buy a stock.\n\nThis rewrite is for educational guidance only; it does not change the calculated amounts above.",
    ),
  },
  {
    key: "mutual_fund_buy_sell_advice_blocked",
    result: validateSuggestionAiRewrite(
      guardrailPayload,
      "Safe daily spend is Rs 381 per day. You should sell a mutual fund.\n\nThis rewrite is for educational guidance only; it does not change the calculated amounts above.",
    ),
  },
  {
    key: "loan_product_recommendation_blocked",
    result: validateSuggestionAiRewrite(
      guardrailPayload,
      "Safe daily spend is Rs 381 per day. You should take a home loan.\n\nThis rewrite is for educational guidance only; it does not change the calculated amounts above.",
    ),
  },
  {
    key: "credit_card_product_recommendation_blocked",
    result: validateSuggestionAiRewrite(
      guardrailPayload,
      "Safe daily spend is Rs 381 per day. You should apply for a credit card.\n\nThis rewrite is for educational guidance only; it does not change the calculated amounts above.",
    ),
  },
  {
    key: "invented_number_blocked",
    result: validateSuggestionAiRewrite(
      guardrailPayload,
      "Safe daily spend is Rs 500 per day.\n\nThis rewrite is for educational guidance only; it does not change the calculated amounts above.",
    ),
  },
];

const failedTriggers = triggerResults.filter((r) => !r.passed);
const failedMetadata = metadataResults.filter((r) => r.missingFields.length > 0);
const failedGuardrails = guardrailResults.filter((r) => r.result.ok !== false);

const result = {
  generatedAt: new Date().toISOString(),
  userId,
  today: today.toISOString(),
  draftCount: drafts.length,
  triggerResults,
  metadataResults,
  isolationResult,
  guardrailResults,
  drafts,
  finalStatus:
    failedTriggers.length === 0 &&
    failedMetadata.length === 0 &&
    isolationResult.passed &&
    failedGuardrails.length === 0
      ? "PASS"
      : "FAIL",
};

const outFile = path.join(logsDir, "ai-suggestion-certification-results.json");
fs.writeFileSync(outFile, `${JSON.stringify(result, null, 2)}\n`);

if (result.finalStatus !== "PASS") {
  console.error(JSON.stringify({
    failedTriggers,
    failedMetadata,
    isolationResult,
    failedGuardrails,
    evidence: outFile,
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: result.finalStatus,
  draftCount: result.draftCount,
  evidence: outFile,
  triggersPassed: triggerResults.map((r) => r.key),
}, null, 2));
