import type {
  Account,
  Card,
  Category,
  FinancialEvent,
  Loan,
  PaymentMode,
  Transaction,
  TransactionType,
  UdhariRecord,
} from "@/types";
import { safeParseMoneyInput, transactionAmountPaise } from "@/utils/money";
import { diagnoseLedgerCoverage } from "@/services/ledgerDiagnostics";
import type { LedgerDiagnosticInput } from "@/services/ledgerDiagnostics";

export type ImportMappingKey =
  | "date"
  | "type"
  | "amount"
  | "category"
  | "account"
  | "card"
  | "loan"
  | "person"
  | "description"
  | "merchantOrPerson"
  | "paymentMode"
  | "businessOrPersonal"
  | "taxFlag"
  | "gstFlag"
  | "billAvailable";

export type ImportMapping = Partial<Record<ImportMappingKey, string>>;

export interface ImportPreviewContext {
  existingTransactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  cards: Card[];
  loans: Loan[];
  udhari: UdhariRecord[];
}

export interface ImportPreviewRow {
  index: number;
  valid: boolean;
  errors: string[];
  warnings: string[];
  duplicateCandidate: boolean;
  amountPaise: number;
  type?: TransactionType;
  paymentMode?: PaymentMode;
  categoryId?: string;
  accountId?: string;
  cardId?: string;
  loanId?: string;
  personId?: string;
  transaction?: Omit<Transaction, "id" | "userId" | "createdAt" | "updatedAt" | "isDeleted" | "version">;
}

export interface ImportPreview {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateCandidates: number;
  missingAccounts: string[];
  missingCategories: string[];
  missingCards: string[];
  missingLoans: string[];
  missingPeople: string[];
  estimatedIncomePaise: number;
  estimatedExpensePaise: number;
  estimatedCardLiabilityChangePaise: number;
  estimatedCashflowEffectPaise: number;
  rows: ImportPreviewRow[];
}

export interface ImportBatchRecord {
  importBatchId: string;
  rowCount: number;
  importedRowIds: string[];
  failedRows: Array<{ index: number; errors: string[] }>;
  createdEventIds: string[];
  createdEffectIds: string[];
  auditLogId?: string;
  createdAt: string;
}

export interface ImportRollbackPlan {
  importBatchId: string;
  transactionIdsToSoftDelete: string[];
  eventIdsToReverse: string[];
  effectIdsToMarkReversed: string[];
  auditAction: "import_rollback";
}

export interface DataRepairQueue {
  transactionsWithoutLedgerEvent: string[];
  creditCardTransactionsWithoutCard: string[];
  emiTransactionsWithoutLoan: string[];
  udhariEntriesWithoutPerson: string[];
  categoriesMissingColor: string[];
  duplicateCategories: Array<{ normalizedName: string; ids: string[] }>;
  legacyAmountWithoutAmountPaise: string[];
}

export function normalizeImportType(raw: unknown): TransactionType | null {
  const s = String(raw ?? "").toLowerCase().trim();
  const map: Record<string, TransactionType> = {
    income: "income",
    expense: "expense",
    transfer: "transfer",
    emi: "emi_payment",
    "emi payment": "emi_payment",
    emi_payment: "emi_payment",
    "card payment": "cc_payment",
    "credit card payment": "cc_payment",
    "cc payment": "cc_payment",
    cc_payment: "cc_payment",
    "udhari given": "udhari_given",
    udhari_given: "udhari_given",
    "udhari received": "udhari_received",
    udhari_received: "udhari_received",
    "udhari collect": "udhari_collect",
    udhari_collect: "udhari_collect",
    "udhari repay": "udhari_repay",
    udhari_repay: "udhari_repay",
    refund: "refund",
    adjustment: "adjustment",
  };
  return map[s] ?? null;
}

export function normalizeImportDate(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const parts = s.split(/[/\-.]/);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    const candidate = a.length === 4
      ? `${a}-${b.padStart(2, "0")}-${c.padStart(2, "0")}`
      : `${c}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
    const d = new Date(candidate);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function normalizeImportPaymentMode(raw: unknown): PaymentMode | null {
  const s = String(raw ?? "").toLowerCase().trim();
  if (!s) return "other";
  if (s.includes("upi")) return "upi";
  if (s.includes("cash")) return "cash";
  if (s.includes("cheque")) return "cheque";
  if (s.includes("credit")) return "credit_card";
  if (s.includes("debit")) return "debit_card";
  if (s.includes("wallet")) return "wallet";
  if (s.includes("auto")) return "auto_debit";
  if (s.includes("bank") || s.includes("transfer") || s.includes("neft") || s.includes("imps")) {
    return "bank_transfer";
  }
  return "other";
}

function truthy(raw: unknown): 0 | 1 {
  const s = String(raw ?? "").toLowerCase().trim();
  return ["1", "true", "yes", "y"].includes(s) ? 1 : 0;
}

function norm(raw: string): string {
  return raw.trim().toLowerCase();
}

function getMapped(row: Record<string, unknown>, mapping: ImportMapping, key: ImportMappingKey): unknown {
  const header = mapping[key];
  return header ? row[header] : undefined;
}

export function buildImportPreview(
  rows: Record<string, unknown>[],
  mapping: ImportMapping,
  ctx: ImportPreviewContext,
): ImportPreview {
  const categories = new Map(ctx.categories.map((c) => [norm(c.name), c]));
  const accounts = new Map(ctx.accounts.map((a) => [norm(a.name), a]));
  const cards = new Map(ctx.cards.map((c) => [norm(c.nickname || `${c.bank} ${c.last4}`), c]));
  const loans = new Map(ctx.loans.map((l) => [norm(l.name || l.lender), l]));
  const people = new Map(ctx.udhari.map((u) => [norm(u.personName), u]));
  const missingAccounts = new Set<string>();
  const missingCategories = new Set<string>();
  const missingCards = new Set<string>();
  const missingLoans = new Set<string>();
  const missingPeople = new Set<string>();

  const previewRows = rows.map((row, index): ImportPreviewRow => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const amountPaise = safeParseMoneyInput(getMapped(row, mapping, "amount") as string | number, {
      allowZero: false,
      allowRounding: false,
      throwOnInvalid: false,
    });
    if (amountPaise <= 0) errors.push("invalid_amount");
    const date = normalizeImportDate(getMapped(row, mapping, "date"));
    if (!date) errors.push("invalid_date");
    const type = normalizeImportType(getMapped(row, mapping, "type"));
    if (!type) errors.push("invalid_type");
    const paymentMode = normalizeImportPaymentMode(getMapped(row, mapping, "paymentMode"));
    if (!paymentMode) errors.push("invalid_payment_mode");

    const categoryName = String(getMapped(row, mapping, "category") ?? "").trim();
    const accountName = String(getMapped(row, mapping, "account") ?? "").trim();
    const cardName = String(getMapped(row, mapping, "card") ?? "").trim();
    const loanName = String(getMapped(row, mapping, "loan") ?? "").trim();
    const personName = String(getMapped(row, mapping, "person") ?? getMapped(row, mapping, "merchantOrPerson") ?? "").trim();
    const category = categoryName ? categories.get(norm(categoryName)) : undefined;
    const account = accountName ? accounts.get(norm(accountName)) : undefined;
    const card = cardName ? cards.get(norm(cardName)) : undefined;
    const loan = loanName ? loans.get(norm(loanName)) : undefined;
    const person = personName ? people.get(norm(personName)) : undefined;

    if ((type === "income" || type === "expense" || type === "refund" || type === "udhari_write_off") && !category) {
      errors.push("missing_category");
      if (categoryName) missingCategories.add(categoryName);
    }
    if (paymentMode === "credit_card" && type === "expense" && !card) {
      errors.push("missing_card");
      if (cardName || personName) missingCards.add(cardName || personName);
    }
    if (type === "emi_payment" && !loan) {
      errors.push("missing_loan");
      if (loanName) missingLoans.add(loanName);
    }
    if (type && ["udhari_given", "udhari_received", "udhari_collect", "udhari_repay", "udhari_write_off"].includes(type) && !person) {
      errors.push("missing_person");
      if (personName) missingPeople.add(personName);
    }
    if (paymentMode !== "credit_card" && ["income", "expense", "refund", "emi_payment", "cc_payment"].includes(type ?? "") && !account) {
      errors.push("missing_account");
      if (accountName) missingAccounts.add(accountName);
    }

    const merchantOrPerson = String(getMapped(row, mapping, "merchantOrPerson") ?? personName ?? "").trim();
    const duplicateCandidate = ctx.existingTransactions.some(
      (t) =>
        date &&
        t.date.slice(0, 10) === date.slice(0, 10) &&
        type &&
        t.type === type &&
        transactionAmountPaise(t) === amountPaise &&
        (t.merchantOrPerson ?? "") === merchantOrPerson,
    );
    if (duplicateCandidate) warnings.push("duplicate_candidate");
    const businessOrPersonalRaw = String(getMapped(row, mapping, "businessOrPersonal") ?? "personal").toLowerCase();
    const businessOrPersonal = ["business", "mixed", "personal"].includes(businessOrPersonalRaw)
      ? (businessOrPersonalRaw as "business" | "mixed" | "personal")
      : "personal";
    const transaction: ImportPreviewRow["transaction"] = !date || !type || amountPaise <= 0 || !paymentMode
      ? undefined
      : {
          date,
          type,
          amount: amountPaise / 100,
          amountPaise,
          categoryId: category?.id,
          accountId: account?.id,
          linkedCardId: card?.id,
          linkedLoanId: loan?.id,
          linkedUdhariId: person?.id,
          paymentMode,
          merchantOrPerson,
          description: String(getMapped(row, mapping, "description") ?? ""),
          billAvailable: truthy(getMapped(row, mapping, "billAvailable")),
          gstApplicable: truthy(getMapped(row, mapping, "gstFlag")),
          taxFlag: truthy(getMapped(row, mapping, "taxFlag")),
          businessOrPersonal,
          needWant: "unassigned",
          fixedVariable: "unassigned",
          plannedUnplanned: "unassigned",
          notes: "",
          tags: [],
        };
    return {
      index,
      valid: errors.length === 0,
      errors,
      warnings,
      duplicateCandidate,
      amountPaise,
      type: type ?? undefined,
      paymentMode: paymentMode ?? undefined,
      categoryId: category?.id,
      accountId: account?.id,
      cardId: card?.id,
      loanId: loan?.id,
      personId: person?.id,
      transaction,
    };
  });

  return {
    totalRows: rows.length,
    validRows: previewRows.filter((row) => row.valid).length,
    invalidRows: previewRows.filter((row) => !row.valid).length,
    duplicateCandidates: previewRows.filter((row) => row.duplicateCandidate).length,
    missingAccounts: [...missingAccounts],
    missingCategories: [...missingCategories],
    missingCards: [...missingCards],
    missingLoans: [...missingLoans],
    missingPeople: [...missingPeople],
    estimatedIncomePaise: previewRows.filter((row) => row.valid && row.type === "income").reduce((sum, row) => sum + row.amountPaise, 0),
    estimatedExpensePaise: previewRows.filter((row) => row.valid && row.type === "expense").reduce((sum, row) => sum + row.amountPaise, 0),
    estimatedCardLiabilityChangePaise: previewRows.filter((row) => row.valid && row.paymentMode === "credit_card" && row.type === "expense").reduce((sum, row) => sum + row.amountPaise, 0),
    estimatedCashflowEffectPaise: previewRows.filter((row) => row.valid).reduce((sum, row) => {
      if (row.type === "income" || row.type === "refund") return sum + row.amountPaise;
      if (row.type === "expense" && row.paymentMode !== "credit_card") return sum - row.amountPaise;
      if (row.type === "cc_payment" || row.type === "emi_payment") return sum - row.amountPaise;
      return sum;
    }, 0),
    rows: previewRows,
  };
}

export function createImportBatchRecord(input: {
  importBatchId: string;
  preview: ImportPreview;
  importedRowIds: string[];
  createdEventIds?: string[];
  createdEffectIds?: string[];
  auditLogId?: string;
  createdAt?: string;
}): ImportBatchRecord {
  return {
    importBatchId: input.importBatchId,
    rowCount: input.preview.totalRows,
    importedRowIds: input.importedRowIds,
    failedRows: input.preview.rows.filter((row) => !row.valid).map((row) => ({ index: row.index, errors: row.errors })),
    createdEventIds: input.createdEventIds ?? [],
    createdEffectIds: input.createdEffectIds ?? [],
    auditLogId: input.auditLogId,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

export function buildImportRollbackPlan(batch: ImportBatchRecord): ImportRollbackPlan {
  return {
    importBatchId: batch.importBatchId,
    transactionIdsToSoftDelete: batch.importedRowIds,
    eventIdsToReverse: batch.createdEventIds,
    effectIdsToMarkReversed: batch.createdEffectIds,
    auditAction: "import_rollback",
  };
}

export function buildDataRepairQueue(input: LedgerDiagnosticInput): DataRepairQueue {
  const diagnostics = diagnoseLedgerCoverage(input);
  const activeCategories = input.categories.filter((c) => c.userId === input.userId && c.isDeleted !== 1);
  const byName = new Map<string, string[]>();
  for (const c of activeCategories) {
    const key = norm(c.name);
    byName.set(key, [...(byName.get(key) ?? []), c.id]);
  }
  return {
    transactionsWithoutLedgerEvent: diagnostics.transactionsWithoutFinancialEvent.map((row) => row.id),
    creditCardTransactionsWithoutCard: diagnostics.creditCardTransactionsMissingCard.map((row) => row.id),
    emiTransactionsWithoutLoan: diagnostics.emiTransactionsMissingLoan.map((row) => row.id),
    udhariEntriesWithoutPerson: diagnostics.udhariTransactionsMissingPerson.map((row) => row.id),
    categoriesMissingColor: activeCategories.filter((c) => !c.color || c.color.trim() === "").map((c) => c.id),
    duplicateCategories: [...byName.entries()]
      .filter(([, ids]) => ids.length > 1)
      .map(([normalizedName, ids]) => ({ normalizedName, ids })),
    legacyAmountWithoutAmountPaise: input.transactions
      .filter((t) => t.userId === input.userId && t.isDeleted !== 1)
      .filter((t) => t.amountPaise == null)
      .map((t) => t.id),
  };
}
