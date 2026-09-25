/**
 * TEST-ONLY helpers — accounting invariants INV-01..INV-10 for unit tests.
 * Server remains source of truth; these mirror documented rules. Do not import from pages.
 */

import type {
  AccountNature,
  BillAllocation,
  BillRef,
  CompanyPermission,
  DraftVoucherLine,
  VoucherLine,
  VoucherStatus,
  VoucherType,
} from "@/company/types";
import { assertBalanced, isBalanced, sumCredit, sumDebit } from "@/company/services/voucherBalance";
import { balanceSheet, profitLoss, trialBalance } from "@/company/services/__tests__/helpers/reportEngine";
import { purposeAffectsProfit } from "@/company/services/purposeEngine";

export type InvariantResult = { ok: true } | { ok: false; code: string; message: string };

function fail(code: string, message: string): InvariantResult {
  return { ok: false, code, message };
}
function ok(): InvariantResult {
  return { ok: true };
}

/** INV-01: Posted (or posting) voucher lines must balance Debit = Credit. */
export function checkInv01Balanced(lines: Array<Pick<VoucherLine, "side" | "amountPaise">>): InvariantResult {
  try {
    assertBalanced(lines);
    return ok();
  } catch (e) {
    return fail("INV-01", e instanceof Error ? e.message : "Unbalanced");
  }
}

/** INV-02: Every line amountPaise is a positive integer. */
export function checkInv02PositivePaise(lines: Array<{ amountPaise: number }>): InvariantResult {
  for (const line of lines) {
    if (!Number.isInteger(line.amountPaise) || line.amountPaise <= 0) {
      return fail("INV-02", `Invalid amountPaise: ${line.amountPaise}`);
    }
  }
  return ok();
}

/** INV-03: At least two lines required to post. */
export function checkInv03MinLines(lines: unknown[]): InvariantResult {
  if (lines.length < 2) return fail("INV-03", "At least two lines required");
  return ok();
}

/** INV-04: Trial Balance closing debit total = credit total. */
export function checkInv04TrialBalance(
  lines: Array<Pick<VoucherLine, "ledgerId" | "side" | "amountPaise">>,
  natures: Record<string, AccountNature>,
): InvariantResult {
  const tb = trialBalance(lines, natures);
  if (!tb.balanced) {
    return fail("INV-04", `TB imbalance: Dr ${tb.totalDebitPaise} Cr ${tb.totalCreditPaise}`);
  }
  return ok();
}

/** INV-05: Balance Sheet Assets = Liabilities + Equity (with P&L folded into equity). */
export function checkInv05BalanceSheetEquation(
  lines: Array<Pick<VoucherLine, "ledgerId" | "side" | "amountPaise">>,
  natures: Record<string, AccountNature>,
): InvariantResult {
  const bs = balanceSheet(lines, natures, { includeProfitInEquity: true });
  if (!bs.balanced) {
    return fail("INV-05", `BS gap ${bs.equationGapPaise}: A ${bs.assetsPaise} L ${bs.liabilitiesPaise} E ${bs.equityPaise}`);
  }
  return ok();
}

/** INV-06: Pure non-P&L purposes must not change Profit & Loss. */
export function checkInv06NoSpuriousPnL(
  lines: DraftVoucherLine[],
  natures: Record<string, AccountNature>,
  purposeCode?: string,
): InvariantResult {
  if (purposeCode && purposeAffectsProfit(purposeCode as Parameters<typeof purposeAffectsProfit>[0])) {
    return ok();
  }
  const pl = profitLoss(lines, natures);
  if (pl.profitPaise !== 0 || pl.incomePaise !== 0 || pl.expensePaise !== 0) {
    return fail("INV-06", `Unexpected P&L impact: profit=${pl.profitPaise}`);
  }
  return ok();
}

/** INV-07: RECEIPT debits a cash/bank ledger; PAYMENT credits cash/bank; CONTRA both sides cash/bank. */
export function checkInv07CashBankRules(
  voucherType: VoucherType,
  lines: Array<{ ledgerId: string; side: string }>,
  cashBankLedgerIds: Set<string>,
): InvariantResult {
  if (voucherType === "RECEIPT") {
    const hasDrCash = lines.some((l) => l.side === "DEBIT" && cashBankLedgerIds.has(l.ledgerId));
    if (!hasDrCash) return fail("INV-07", "RECEIPT must debit a cash/bank ledger");
  } else if (voucherType === "PAYMENT") {
    const hasCrCash = lines.some((l) => l.side === "CREDIT" && cashBankLedgerIds.has(l.ledgerId));
    if (!hasCrCash) return fail("INV-07", "PAYMENT must credit a cash/bank ledger");
  } else if (voucherType === "CONTRA") {
    const allCash = lines.every((l) => cashBankLedgerIds.has(l.ledgerId));
    if (!allCash) return fail("INV-07", "CONTRA lines must all be cash/bank");
  }
  return ok();
}

/** INV-08: Only POSTED vouchers affect books — draft/pending must be excluded by caller filter. */
export function checkInv08PostedOnly(
  status: VoucherStatus,
  includedInBooks: boolean,
): InvariantResult {
  const shouldInclude = status === "POSTED";
  if (includedInBooks !== shouldInclude) {
    return fail("INV-08", `Status ${status} includedInBooks=${includedInBooks}`);
  }
  return ok();
}

/** INV-09: Bill allocations cannot over-allocate outstanding. */
export function checkInv09BillAllocation(
  bill: Pick<BillRef, "outstandingPaise" | "originalAmountPaise">,
  allocations: Array<Pick<BillAllocation, "amountPaise" | "allocationType">>,
): InvariantResult {
  let against = 0;
  for (const a of allocations) {
    if (!Number.isInteger(a.amountPaise) || a.amountPaise <= 0) {
      return fail("INV-09", "Allocation amount must be positive paise");
    }
    if (a.allocationType === "AGAINST_REFERENCE") against += a.amountPaise;
  }
  if (against > bill.outstandingPaise) {
    return fail("INV-09", `Over-allocation ${against} > outstanding ${bill.outstandingPaise}`);
  }
  if (against > bill.originalAmountPaise) {
    return fail("INV-09", `Over-allocation vs original ${bill.originalAmountPaise}`);
  }
  return ok();
}

/** INV-10: Permission gate — action denied when key missing. */
export function checkInv10Permission(
  granted: CompanyPermission[],
  required: CompanyPermission,
): InvariantResult {
  if (!granted.includes(required)) {
    return fail("INV-10", `Missing permission: ${required}`);
  }
  return ok();
}

export const INVARIANT_IDS = [
  "INV-01",
  "INV-02",
  "INV-03",
  "INV-04",
  "INV-05",
  "INV-06",
  "INV-07",
  "INV-08",
  "INV-09",
  "INV-10",
] as const;

export function runAllStructuralChecks(input: {
  lines: Array<Pick<VoucherLine, "ledgerId" | "side" | "amountPaise">>;
  natures: Record<string, AccountNature>;
}): InvariantResult[] {
  return [
    checkInv01Balanced(input.lines),
    checkInv02PositivePaise(input.lines),
    checkInv03MinLines(input.lines),
    checkInv04TrialBalance(input.lines, input.natures),
    checkInv05BalanceSheetEquation(input.lines, input.natures),
  ];
}

export { isBalanced, sumDebit, sumCredit };
