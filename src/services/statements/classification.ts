import type { Category, Transaction } from "@/types";
import type { StatementDecision, StatementRow, StatementKind } from "./types";

const rules: Array<{ match: RegExp; label: string; categories: RegExp; kind: StatementKind; direction: "credit" | "debit" }> = [
  { match: /\b(?:SALARY|PAYROLL)\b/i, label: "Salary keyword", categories: /salary/i, kind: "income", direction: "credit" },
  { match: /\b(?:INTEREST|INT\.?(?:\s|\/).*PAID)\b/i, label: "Interest keyword", categories: /interest/i, kind: "income", direction: "credit" },
  { match: /\b(?:SWIGGY|ZOMATO|RESTAURANT|CAFE)\b/i, label: "Food merchant keyword", categories: /food|dining|restaurant/i, kind: "expense", direction: "debit" },
  { match: /\b(?:DMART|BIGBASKET|BLINKIT|GROCERY|GROCERIES)\b/i, label: "Grocery merchant keyword", categories: /grocer/i, kind: "expense", direction: "debit" },
  { match: /\b(?:UBER|OLA|IRCTC|METRO)\b/i, label: "Transport merchant keyword", categories: /transport|travel|commut/i, kind: "expense", direction: "debit" },
  { match: /\b(?:PETROL|FUEL|HPCL|BPCL|IOCL)\b/i, label: "Fuel keyword", categories: /fuel|transport/i, kind: "expense", direction: "debit" },
  { match: /\b(?:AIRTEL|JIO|ELECTRICITY|BROADBAND|INTERNET)\b/i, label: "Utility merchant keyword", categories: /utilit|internet|phone|bill/i, kind: "expense", direction: "debit" },
  { match: /\b(?:HOSPITAL|PHARMACY|APOLLO|MEDICAL)\b/i, label: "Healthcare keyword", categories: /health|medical/i, kind: "expense", direction: "debit" },
  { match: /\b(?:NETFLIX|SPOTIFY|HOTSTAR)\b/i, label: "Subscription merchant keyword", categories: /subscription|entertainment/i, kind: "expense", direction: "debit" },
  { match: /\b(?:BANK CHARGE|SERVICE CHARGE|SMS CHARGE|CHARGES)\b/i, label: "Charge keyword", categories: /bank|fees|charge/i, kind: "expense", direction: "debit" },
];

export function suggestStatementDecision(row: StatementRow, categories: Category[]): StatementDecision {
  const initial: StatementDecision = { include: row.issues.length === 0, reviewed: false, kind: "", categoryId: "", scope: "", counterpartId: "", reason: "Transaction purpose requires review", duplicate: null };
  if (/\b(?:REFUND|REVERSAL|REVERSED|REV\/|CASHBACK)\b/i.test(row.description)) return { ...initial, kind: row.creditPaise ? "refund" : "", reason: "Possible refund/reversal; verify the original expense" };
  if (/\b(?:SELF|OWN ACCOUNT|ATM|CASH WDL|CASH WITHDRAWAL)\b/i.test(row.description)) return { ...initial, kind: "transfer", reason: "Possible own-account or cash transfer; select the other account" };
  if (/\b(?:CC PAYMENT|CREDIT CARD PAYMENT|CARD BILL|CREDITCARD)\b/i.test(row.description)) return { ...initial, kind: row.debitPaise ? "cc_payment" : "", reason: "Possible card payment; confirm the linked card" };
  if (/\b(?:EMI|LOAN|NACH|ECS|MUTUAL|SIP|REDEMPTION)\b/i.test(row.description)) return { ...initial, include: false, reason: "Loan/investment/mandate movement needs the dedicated finance workflow; not assumed to be income or expense" };
  const rule = rules.find(rule => rule.match.test(row.description) && (rule.direction === "debit" ? row.debitPaise > 0 : row.creditPaise > 0));
  if (!rule) return initial;
  const choices = categories.filter(category => !category.isDeleted && !category.archived && (category.appliesTo === rule.kind || category.appliesTo === "mixed") && rule.categories.test(category.name));
  return { ...initial, kind: rule.kind, categoryId: choices.length === 1 ? choices[0].id : "", reason: `${rule.label}; suggestion, not a verified classification` };
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
  if (!decision.kind) issues.push("Choose transaction purpose");
  if (!decision.scope) issues.push("Choose personal or business scope");
  if (["income", "expense", "refund", "contribution"].includes(decision.kind) && !decision.categoryId) issues.push("Choose a category");
  if (["transfer", "cc_payment", "refund", "contribution"].includes(decision.kind) && !decision.counterpartId) issues.push("Choose the linked account/card/original expense");
  if (decision.kind === "contribution" && row.debitPaise) issues.push("A contribution return must be a credit");
  if (decision.kind === "transfer" && decision.counterpartId === accountId) issues.push("Transfer accounts must differ");
  if (decision.kind === "income" && row.debitPaise || decision.kind === "expense" && row.creditPaise || decision.kind === "refund" && row.debitPaise || decision.kind === "cc_payment" && row.creditPaise) issues.push("Purpose contradicts debit/credit direction");
  return issues;
}

export function monthlyStatementTotals(rows: StatementRow[], decisions: Record<string, StatementDecision>) {
  const months = new Map<string, { month: string; debitPaise: number; creditPaise: number; reviewedIncomePaise: number; reviewedExpensePaise: number; reviewedRefundPaise: number; unreviewed: number }>();
  for (const row of rows) {
    const month = row.date.slice(0, 7);
    const total = months.get(month) ?? { month, debitPaise: 0, creditPaise: 0, reviewedIncomePaise: 0, reviewedExpensePaise: 0, reviewedRefundPaise: 0, unreviewed: 0 };
    total.debitPaise += row.debitPaise; total.creditPaise += row.creditPaise;
    const decision = decisions[row.id];
    if (!decision?.include || !decision.reviewed || !decision.scope || row.issues.length) total.unreviewed++;
    else if (decision.kind === "income" && decision.categoryId && row.creditPaise) total.reviewedIncomePaise += row.creditPaise;
    else if (decision.kind === "expense" && decision.categoryId && row.debitPaise) total.reviewedExpensePaise += row.debitPaise;
    else if (["refund", "contribution"].includes(decision.kind) && decision.categoryId && decision.counterpartId && row.creditPaise) total.reviewedRefundPaise += row.creditPaise;
    months.set(month, total);
  }
  return [...months.values()].sort((a, b) => a.month.localeCompare(b.month));
}
