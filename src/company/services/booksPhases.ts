/**
 * Company-book phase rules (SV14–SV29).
 * Amounts are integer units supplied by the caller. Posted vouchers store paise.
 * Inventory costing is weighted average. STOCK is the control ledger.
 */

export const COSTING_METHOD = "weighted-average" as const;
export const STOCK_CONTROL_LEDGER = "STOCK";

export function ownerCountAfterRoleChange(
  members: Array<{ id: string; roles: string[] }>,
  membershipId: string,
  nextRole: string,
): number {
  const role = nextRole.toUpperCase();
  let count = 0;
  let seen = false;
  for (const member of members) {
    if (member.id === membershipId) seen = true;
    const roles = member.id === membershipId ? [role] : member.roles;
    if (roles.some((item) => item.toUpperCase() === "OWNER")) count += 1;
  }
  if (!seen && role === "OWNER") count += 1;
  return count;
}

export function consumeInviteToken(
  stored: { tokenHash: string; usedAt: string | null },
  presentedHash: string,
): { ok: true } | { ok: false; error: "TOKEN_MISMATCH" | "TOKEN_USED" } {
  if (stored.tokenHash !== presentedHash) return { ok: false, error: "TOKEN_MISMATCH" };
  if (stored.usedAt) return { ok: false, error: "TOKEN_USED" };
  return { ok: true };
}

export function normalizePartyType(raw: string): "PERSON" | "ORGANIZATION" {
  const value = raw.trim().toUpperCase();
  if (value === "" || value === "PERSON") return "PERSON";
  if (value === "ORGANIZATION" || value === "ORGANISATION" || value === "BUSINESS" || value === "ORG") {
    return "ORGANIZATION";
  }
  throw new Error("partyType must be PERSON or ORGANIZATION");
}

export function splitCostAllocation(lineAmount: number, parts: number[]) {
  const allocated = parts.reduce((sum, part) => sum + part, 0);
  if (parts.length > 0 && allocated !== lineAmount) {
    throw new Error("Cost allocations must sum to the line amount");
  }
  return { lineAmount, allocated, voucherTotal: lineAmount };
}

export function documentRelativeKey(companyId: string, docId: string): string {
  if (!/^[A-Za-z0-9_-]{1,191}$/.test(companyId) || !/^[A-Za-z0-9_-]{1,191}$/.test(docId)) {
    throw new Error("Invalid document key");
  }
  return `storage/company-documents/${companyId}/${docId}`;
}

export function documentKeyOutsidePublicWeb(key: string): boolean {
  if (key.includes("..") || key.startsWith("public/") || key.startsWith("api/") || key.startsWith("/")) return false;
  return key.startsWith("storage/company-documents/");
}

export function documentDownloadStatus(authenticated: boolean, metadataExists: boolean, fileExists: boolean): number {
  if (!authenticated) return 401;
  if (!metadataExists || !fileExists) return 404;
  return 200;
}

export function documentHostingStatus(sizeBytes: number): "local" | "BLOCKED_EXTERNAL" {
  return sizeBytes > 262144 ? "BLOCKED_EXTERNAL" : "local";
}

export function invoiceThenSettlement(kind: "sale" | "purchase", base: number, tax: number, settlement: number) {
  if (base < 0 || tax < 0 || settlement < 0) throw new Error("Amounts must be >= 0");
  const balance = base + tax;
  if (settlement > balance) throw new Error("Settlement exceeds the invoice");
  const revenue = kind === "sale" ? base : 0;
  const expense = kind === "purchase" ? base : 0;
  return {
    kind,
    receivableOrPayable: balance,
    outstanding: balance - settlement,
    revenue,
    revenueAfterSettlement: revenue,
    expense,
    expenseAfterSettlement: expense,
    hypotheticalTax: true,
    settlementIsSeparateVoucher: true,
  };
}

export function chequeMatchEffect(postedCash: number, fee: number) {
  if (postedCash < 0 || fee < 0) throw new Error("Amounts must be >= 0");
  return {
    postedCash,
    cashPostedAgain: 0,
    feeVoucherAmount: fee,
    feeIsExplicitVoucher: fee > 0,
  };
}

export function recurringTemplateDraft<T extends Record<string, unknown>>(template: T) {
  return { ...template, status: "DRAFT" as const, bankPaymentOnDueDate: false };
}

export function recurringRunDecision(runDate: string, lockBefore: string | null, alreadyRan: boolean) {
  if (alreadyRan) return { post: false, reason: "IDEMPOTENT" as const, status: "DRAFT" as const, bankPayment: false };
  if (lockBefore && runDate < lockBefore) {
    return { post: false, reason: "PERIOD_LOCKED" as const, status: "DRAFT" as const, bankPayment: false };
  }
  return { post: true, reason: null, status: "DRAFT" as const, bankPayment: false };
}

const BACKUP_SECRET_KEYS = new Set([
  "pin",
  "password",
  "password_hash",
  "pin_hash",
  "passwd",
  "token",
  "token_hash",
  "invite_token",
  "secret",
  "api_key",
  "webhook_secret",
  "session_token",
  "request_hash",
  "response_json",
]);

export function stripBackupSecrets(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (BACKUP_SECRET_KEYS.has(key.toLowerCase())) continue;
    out[key] =
      value && typeof value === "object" && !Array.isArray(value)
        ? stripBackupSecrets(value as Record<string, unknown>)
        : value;
  }
  return out;
}

export function backupUsesServerDump(): boolean {
  return false;
}

export function backupScopeOk(rows: Array<{ company_id?: string }>, companyId: string): boolean {
  return rows.every((row) => row.company_id === undefined || row.company_id === companyId);
}

export type StockState = {
  qty: number;
  value: number;
  cogs: number;
  revenue: number;
  method: typeof COSTING_METHOD;
  stockLedger: typeof STOCK_CONTROL_LEDGER;
};

export function stockState(): StockState {
  return { qty: 0, value: 0, cogs: 0, revenue: 0, method: COSTING_METHOD, stockLedger: STOCK_CONTROL_LEDGER };
}

export function applyWeightedAverage(state: StockState, event: "buy" | "sell", qty: number, unit: number): StockState {
  if (qty <= 0 || unit < 0) throw new Error("Quantity must be positive");
  const next: StockState = { ...state, method: COSTING_METHOD, stockLedger: STOCK_CONTROL_LEDGER };
  if (event === "buy") {
    next.qty += qty;
    next.value += qty * unit;
    return next;
  }
  if (qty > next.qty || next.qty === 0 || next.value % next.qty !== 0) {
    throw new Error("Sell quantity exceeds stock or average cost is not a whole unit");
  }
  const cogs = Math.floor(next.value / next.qty) * qty;
  next.qty -= qty;
  next.value -= cogs;
  next.cogs += cogs;
  next.revenue += qty * unit;
  return next;
}

export function customerCollection(state: StockState, amount: number) {
  if (amount <= 0) throw new Error("Collection amount must be positive");
  return {
    qty: state.qty,
    value: state.value,
    cogs: state.cogs,
    revenue: state.revenue,
    stockLedger: STOCK_CONTROL_LEDGER,
    collection: {
      amount,
      repeatsRevenue: false,
      repeatsCogs: false,
      lines: [
        { ledger: "BANK", side: "DEBIT" as const, amount },
        { ledger: "AR_CONTROL", side: "CREDIT" as const, amount },
      ],
    },
  };
}

export type GstState = "draft" | "validated" | "exported";

export function gstWorkbench(state: GstState, action: "validate" | "export" | "file") {
  if (action === "file") throw new Error("Exported is not filed. No IRN is issued.");
  if (action === "validate") {
    if (state !== "draft") throw new Error("Validate starts from draft");
    return { state: "validated" as const, filed: false, irn: null };
  }
  if (action === "export") {
    if (state !== "validated") throw new Error("Export starts from validated");
    return { state: "exported" as const, filed: false, irn: null };
  }
  throw new Error("Unknown GST action");
}

export function payrollPreview(gross: number) {
  if (gross !== 30000) {
    throw new Error("Payroll preview uses synthetic gross 30000 only. Rates are unverified.");
  }
  const employeeDeductions = 3000 + 1000;
  const employer = 1800;
  return {
    gross,
    employeeDeductions,
    employer,
    expense: gross + employer,
    netPayable: gross - employeeDeductions,
    rates: "unverified" as const,
  };
}

export function payrollPayment(preview: { netPayable: number; expense: number }) {
  return {
    repeatsSalaryExpense: false,
    lines: [
      { ledger: "SALARY_PAYABLE", side: "DEBIT" as const, amount: preview.netPayable },
      { ledger: "BANK", side: "CREDIT" as const, amount: preview.netPayable },
    ],
    expenseUnchanged: preview.expense,
  };
}

export type BridgeState = "proposed" | "company_posted" | "personal_applied" | "completed" | "retry";

export function bridgeTransition(state: BridgeState, event: "post_company" | "apply_personal" | "complete" | "fail"): BridgeState {
  const allowed: Record<BridgeState, Partial<Record<typeof event, BridgeState>>> = {
    proposed: { post_company: "company_posted", fail: "retry" },
    company_posted: { apply_personal: "personal_applied", fail: "retry" },
    personal_applied: { complete: "completed", fail: "retry" },
    retry: { post_company: "company_posted", apply_personal: "personal_applied" },
    completed: {},
  };
  const next = allowed[state][event];
  if (!next) throw new Error(`Bridge cannot move from ${state} on ${event}`);
  return next;
}

export function reimbursementPlan(amount: number) {
  if (amount <= 0) throw new Error("Reimbursement amount must be positive");
  return {
    companyPayable: amount,
    personalReceivable: amount,
    singleDatabaseTransaction: false,
    stores: ["mysql", "indexeddb"] as const,
  };
}

export function orgSubscriptionFromFixture(fixture: {
  source?: string;
  subject?: string;
  planCode?: string;
  status?: string;
}) {
  if (fixture.source !== "local-fixture") throw new Error("Live Razorpay delivery is untested");
  if (fixture.subject !== "company_org_subscriptions") {
    throw new Error("Company billing subject is company_org_subscriptions");
  }
  const status = fixture.status ?? "TRIAL";
  if (!["ACTIVE", "PAST_DUE", "CANCELLED", "TRIAL"].includes(status)) {
    throw new Error("Invalid subscription status");
  }
  if (!fixture.planCode?.trim()) throw new Error("planCode required");
  return {
    subject: "company_org_subscriptions" as const,
    planCode: fixture.planCode.trim(),
    status,
    personalSubscriptionUntouched: true,
    source: "local-fixture" as const,
  };
}

export function groupManagementTotals(
  companyTotals: Array<{ companyId: string; total: number }>,
  matchedPairs: Array<{ fromCompanyId: string; toCompanyId: string; amount: number }>,
) {
  const ids = new Set(companyTotals.map((row) => row.companyId));
  const sum = companyTotals.reduce((total, row) => total + row.total, 0);
  let eliminated = 0;
  for (const pair of matchedPairs) {
    if (!ids.has(pair.fromCompanyId) || !ids.has(pair.toCompanyId)) {
      throw new Error("Elimination pair must be two companies in the group");
    }
    eliminated += pair.amount;
  }
  return {
    managementTotal: sum - eliminated,
    eliminated,
    statutoryConsolidation: false,
    automaticElimination: false,
  };
}
