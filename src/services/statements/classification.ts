import type { Category, Transaction } from "@/types";
import type { StatementDecision, StatementRow, StatementKind } from "./types";

const rules: Array<{ match: RegExp; label: string; categories: RegExp; kind: StatementKind; direction: "credit" | "debit" }> = [
  { match: /\b(?:SALARY|PAYROLL)\b/i, label: "Salary keyword", categories: /salary/i, kind: "income", direction: "credit" },
  { match: /\b(?:INTEREST|INT\.?(?:\s|\/).*PAID)\b/i, label: "Interest keyword", categories: /interest/i, kind: "income", direction: "credit" },
  { match: /\b(?:SWIGGY|ZOMATO|RESTAURANT|CAFE|FALUDA|ICE\s*CREAM|SWEETS|BAKERY|DHABA)\b/i, label: "Food merchant keyword", categories: /food|dining|restaurant/i, kind: "expense", direction: "debit" },
  { match: /\b(?:DMART|BIGBASKET|BLINKIT|GROCERY|GROCERIES)\b/i, label: "Grocery merchant keyword", categories: /grocer/i, kind: "expense", direction: "debit" },
  { match: /\b(?:UBER|OLA|IRCTC|METRO)\b/i, label: "Transport merchant keyword", categories: /transport|travel|commut/i, kind: "expense", direction: "debit" },
  { match: /\b(?:PETROL|FUEL|HPCL|BPCL|IOCL)\b/i, label: "Fuel keyword", categories: /fuel|transport/i, kind: "expense", direction: "debit" },
  { match: /\b(?:AIRTEL|JIO|ELECTRICITY|BROADBAND|INTERNET)\b/i, label: "Utility merchant keyword", categories: /utilit|internet|phone|bill/i, kind: "expense", direction: "debit" },
  { match: /\b(?:HOSPITAL|PHARMACY|APOLLO|MEDICAL)\b/i, label: "Healthcare keyword", categories: /health|medical/i, kind: "expense", direction: "debit" },
  { match: /\b(?:NETFLIX|SPOTIFY|HOTSTAR)\b/i, label: "Subscription merchant keyword", categories: /subscription|entertainment/i, kind: "expense", direction: "debit" },
  { match: /\b(?:BANK CHARGE|SERVICE CHARGE|SMS CHARGE|CHARGES)\b/i, label: "Charge keyword", categories: /bank|fees|charge/i, kind: "expense", direction: "debit" },
];

function activeCategories(categories: Category[], kind: StatementKind): Category[] {
  return categories.filter(category => !category.isDeleted && !category.archived && (category.appliesTo === kind || category.appliesTo === "mixed"));
}

function pickCategory(categories: Category[], kind: StatementKind, nameHint?: RegExp): string {
  const pool = activeCategories(categories, kind);
  if (nameHint) {
    const matched = pool.filter(category => nameHint.test(category.name));
    if (matched.length === 1) return matched[0].id;
  }
  const fallback = pool.find(category => /other|misc|general|uncategor/i.test(category.name));
  if (fallback) return fallback.id;
  return pool.length === 1 ? pool[0].id : "";
}

function suggested(
  partial: Partial<StatementDecision> & Pick<StatementDecision, "reason">,
  row: StatementRow,
): StatementDecision {
  return {
    kind: "",
    suggestedKind: "",
    proposalStrength: "none",
    categoryId: "",
    scope: "",
    counterpartId: "",
    duplicate: null,
    ...partial,
    include: partial.include ?? row.issues.length === 0,
    // Suggestions are never approved postings.
    reviewed: false,
  };
}

/**
 * Propose a purpose for review. Never sets reviewed=true.
 * Direction-only cues stay as suggestedKind (weak) — kind remains empty so
 * bulk-confirm / import cannot treat them as definitive income/expense.
 */
export function suggestStatementDecision(row: StatementRow, categories: Category[]): StatementDecision {
  const blank = suggested({ reason: "Transaction purpose requires review", proposalStrength: "none" }, row);

  if (/\b(?:REFUND|REVERSAL|REVERSED|REV\/|CASHBACK)\b/i.test(row.description)) {
    return suggested({
      kind: row.creditPaise ? "refund" : "",
      suggestedKind: row.creditPaise ? "refund" : "",
      proposalStrength: "strong",
      categoryId: row.creditPaise ? pickCategory(categories, "expense") : "",
      reason: "Possible refund/reversal; verify the original expense",
      scope: row.creditPaise ? "personal" : "",
    }, row);
  }
  if (/\b(?:SELF|OWN ACCOUNT|TO SELF|SELF TRANSFER|ATM|CASH WDL|CASH WITHDRAWAL)\b/i.test(row.description)) {
    return suggested({
      kind: "transfer",
      suggestedKind: "transfer",
      proposalStrength: "strong",
      reason: "Possible own-account or cash transfer; select the other account",
    }, row);
  }
  if (/\b(?:CC PAYMENT|CREDIT CARD PAYMENT|CARD BILL|CREDITCARD)\b/i.test(row.description)) {
    return suggested({
      kind: row.debitPaise ? "cc_payment" : "",
      suggestedKind: row.debitPaise ? "cc_payment" : "",
      proposalStrength: "strong",
      reason: "Possible card payment; confirm the linked card",
      scope: row.debitPaise ? "personal" : "",
    }, row);
  }
  if (/\b(?:COLLECTION FROM|UDHARI|RECEIVED FROM FRIEND|LENT)\b/i.test(row.description) && row.creditPaise) {
    return suggested({
      include: false,
      proposalStrength: "strong",
      reason: "Possible receivable collection; confirm udhari workflow — not automatic income",
    }, row);
  }
  if (/\b(?:EMI|LOAN|NACH|ECS|MUTUAL|SIP|REDEMPTION|DISBURS)\b/i.test(row.description)) {
    return suggested({
      include: false,
      proposalStrength: "strong",
      reason: "Loan/investment/mandate movement needs the dedicated finance workflow; not assumed to be income or expense",
    }, row);
  }

  if (row.creditPaise > 0 && /\b(?:ONE97|PAYTM|PHONEPE|AMAZON\s*PAY|GPAY CASHBACK|GOOGLE PAY CASHBACK)\b/i.test(row.description)) {
    return suggested({
      kind: "refund",
      suggestedKind: "refund",
      proposalStrength: "strong",
      categoryId: pickCategory(categories, "expense"),
      scope: "personal",
      reason: "Payment-app credit; suggested as refund/cashback — confirm before treating as income",
    }, row);
  }

  const rule = rules.find(rule => rule.match.test(row.description) && (rule.direction === "debit" ? row.debitPaise > 0 : row.creditPaise > 0));
  if (rule) {
    return suggested({
      kind: rule.kind,
      suggestedKind: rule.kind,
      proposalStrength: "strong",
      categoryId: pickCategory(categories, rule.kind, rule.categories),
      scope: "personal",
      reason: `${rule.label}; suggested from narration — confirm before import`,
    }, row);
  }

  // Direction-only: bank movement hint only. Do NOT bind kind (would enable bulk approve / P&L).
  if (row.debitPaise > 0 && row.creditPaise === 0) {
    return suggested({
      kind: "",
      suggestedKind: "expense",
      proposalStrength: "weak",
      scope: "",
      reason: "Bank debit — purpose unresolved. Suggested candidate: expense (not approved). Choose transfer/card payment/expense explicitly.",
    }, row);
  }
  if (row.creditPaise > 0 && row.debitPaise === 0) {
    return suggested({
      kind: "",
      suggestedKind: "income",
      proposalStrength: "weak",
      scope: "",
      reason: "Bank credit — purpose unresolved. Suggested candidate: income (not approved). Choose transfer/refund/loan/salary explicitly.",
    }, row);
  }

  return blank;
}

/** Bulk-confirm must not approve weak direction-only proposals. */
export function canBulkConfirmDecision(decision: StatementDecision): boolean {
  if (!decision.include) return false;
  if (decision.proposalStrength === "weak" && !decision.kind) return false;
  return true;
}

export type BulkAcceptScope = "" | "personal" | "business";

/** Stable reasons written only when the user invokes bulk accept. */
export const BULK_ACCEPT_REASON = {
  accepted: "bulk:accepted",
  category: "bulk:category",
  transfer: "bulk:transfer",
  cc_payment: "bulk:cc_payment",
  refund: "bulk:refund",
  contribution: "bulk:contribution",
} as const;

const categoryKinds = new Set<StatementKind>(["income", "expense", "refund", "contribution"]);
const counterpartKinds = new Set<StatementKind>(["transfer", "cc_payment", "refund", "contribution"]);

function categoryAppliesTo(kind: StatementKind): "income" | "expense" {
  return kind === "income" ? "income" : "expense";
}

/** First usable category already on the user. Does not create one. */
export function firstMatchingCategory(categories: Category[], kind: StatementKind, userId?: string): Category | undefined {
  const applies = categoryAppliesTo(kind);
  return categories.find((category) =>
    category.isDeleted !== 1
    && category.archived !== 1
    && (userId == null || category.userId === userId)
    && (category.appliesTo === applies || category.appliesTo === "mixed"),
  );
}

/**
 * User-triggered accept of an included row's suggestion.
 * Does not guess a transfer, card, refund, or contribution counterpart.
 * Leaves reviewed false unless the row then has no decision problems.
 */
export function applyBulkAcceptDecision(
  row: StatementRow,
  decision: StatementDecision,
  categories: Category[],
  accountId: string,
  selectedScope: BulkAcceptScope = "",
  userId?: string,
): StatementDecision {
  if (!decision.include) return decision;
  const kind = (decision.kind || decision.suggestedKind || "") as StatementKind | "";
  const scope = selectedScope || decision.scope || "personal";
  let categoryId = decision.categoryId;
  if (kind && categoryKinds.has(kind) && !categoryId) {
    categoryId = firstMatchingCategory(categories, kind, userId)?.id ?? "";
  }
  const next: StatementDecision = {
    ...decision,
    kind,
    scope,
    categoryId,
    proposalStrength: !decision.kind && kind ? "strong" : decision.proposalStrength,
    reviewed: false,
  };
  const problems = decisionProblems(row, { ...next, reviewed: true }, accountId);
  if (problems.length === 0) {
    return { ...next, reviewed: true, reason: BULK_ACCEPT_REASON.accepted };
  }
  if (kind && counterpartKinds.has(kind) && !next.counterpartId) {
    const reason = kind === "transfer"
      ? BULK_ACCEPT_REASON.transfer
      : kind === "cc_payment"
        ? BULK_ACCEPT_REASON.cc_payment
        : kind === "refund"
          ? BULK_ACCEPT_REASON.refund
          : BULK_ACCEPT_REASON.contribution;
    return { ...next, reviewed: false, reason };
  }
  if (kind && categoryKinds.has(kind) && !categoryId) {
    return { ...next, reviewed: false, reason: BULK_ACCEPT_REASON.category };
  }
  return { ...next, reviewed: false, reason: problems[0] ?? decision.reason };
}

export function statementDuplicate(row: StatementRow, accountId: string, existing: Transaction[]): string | null {
  const normalized = (text: string) => text.replace(/\s+/g, " ").trim().toUpperCase();
  for (const tx of existing) {
    if (tx.isDeleted || tx.date.slice(0, 10) !== row.date || (tx.amountPaise ?? Math.round(tx.amount * 100)) !== row.debitPaise + row.creditPaise) continue;
    const outgoing = tx.accountId === accountId && ["expense", "transfer", "cc_payment", "emi_payment", "loan_prepayment", "investment_contribution", "udhari_given", "udhari_repay", "savings_contribution"].includes(tx.type);
    const incoming = tx.toAccountId === accountId && tx.type === "transfer" || tx.accountId === accountId && ["income", "refund", "loan_disbursement", "udhari_received", "udhari_collect", "investment_sell", "goal_withdrawal"].includes(tx.type);
    if (!(row.debitPaise ? outgoing : incoming)) continue;
    if (normalized(tx.description) === normalized(row.description)) return "Same account, date, direction, amount and narration already exist";
    return "Possible match by account, date, direction and amount; compare before including";
  }
  return null;
}

export function decisionProblems(row: StatementRow, decision: StatementDecision, accountId: string): string[] {
  if (!decision.include) return [];
  const issues = [...row.issues];
  if (!decision.reviewed) issues.push("Review confirmation required");
  if (!decision.kind) issues.push(decision.suggestedKind ? `Choose purpose (suggested: ${decision.suggestedKind}, not approved)` : "Choose transaction purpose");
  if (!decision.scope) issues.push("Choose personal or business scope");
  if (["income", "expense", "refund", "contribution"].includes(decision.kind) && !decision.categoryId) issues.push("Choose a category");
  if (["transfer", "cc_payment", "refund", "contribution"].includes(decision.kind) && !decision.counterpartId) issues.push("Choose the linked account/card/original expense");
  if (decision.kind === "contribution" && row.debitPaise) issues.push("A contribution return must be a credit");
  if (decision.kind === "transfer" && decision.counterpartId === accountId) issues.push("Transfer accounts must differ");
  if (decision.kind === "income" && row.debitPaise || decision.kind === "expense" && row.creditPaise || decision.kind === "refund" && row.debitPaise || decision.kind === "cc_payment" && row.creditPaise) issues.push("Purpose contradicts debit/credit direction");
  return issues;
}

export function monthlyStatementTotals(rows: StatementRow[], decisions: Record<string, StatementDecision>) {
  const months = new Map<string, {
    month: string;
    debitPaise: number;
    creditPaise: number;
    debitCount: number;
    creditCount: number;
    transactionCount: number;
    reviewedIncomePaise: number;
    reviewedExpensePaise: number;
    reviewedRefundPaise: number;
    unreviewed: number;
  }>();
  for (const row of rows) {
    const month = row.date.slice(0, 7);
    const total = months.get(month) ?? {
      month,
      debitPaise: 0,
      creditPaise: 0,
      debitCount: 0,
      creditCount: 0,
      transactionCount: 0,
      reviewedIncomePaise: 0,
      reviewedExpensePaise: 0,
      reviewedRefundPaise: 0,
      unreviewed: 0,
    };
    total.debitPaise += row.debitPaise;
    total.creditPaise += row.creditPaise;
    if (row.debitPaise > 0) total.debitCount += 1;
    if (row.creditPaise > 0) total.creditCount += 1;
    if (row.debitPaise > 0 || row.creditPaise > 0) total.transactionCount += 1;
    const decision = decisions[row.id];
    if (!decision?.include || !decision.reviewed || !decision.scope || !decision.kind || row.issues.length) total.unreviewed++;
    else if (decision.kind === "income" && decision.categoryId && row.creditPaise) total.reviewedIncomePaise += row.creditPaise;
    else if (decision.kind === "expense" && decision.categoryId && row.debitPaise) total.reviewedExpensePaise += row.debitPaise;
    else if (["refund", "contribution"].includes(decision.kind) && decision.categoryId && decision.counterpartId && row.creditPaise) total.reviewedRefundPaise += row.creditPaise;
    months.set(month, total);
  }
  return [...months.values()].sort((a, b) => a.month.localeCompare(b.month));
}
