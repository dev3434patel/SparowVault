/**
 * TEST-ONLY helpers — company report math mirrors for unit tests.
 * Runtime FE report pages call PHP via companyApi.report(); do not import from pages.
 */
import type {
  AccountNature,
  AgeingBucketKey,
  BillRef,
  LineSide,
  VoucherLine,
} from "@/company/types";
import { sumCredit, sumDebit } from "@/company/services/voucherBalance";

export interface LedgerNatureMap {
  [ledgerId: string]: AccountNature;
}

export interface TrialBalanceRow {
  ledgerId: string;
  debitPaise: number;
  creditPaise: number;
  closingDebitPaise: number;
  closingCreditPaise: number;
}

export interface TrialBalanceResult {
  rows: TrialBalanceRow[];
  totalDebitPaise: number;
  totalCreditPaise: number;
  balanced: boolean;
}

export interface ProfitLossResult {
  incomePaise: number;
  expensePaise: number;
  profitPaise: number;
  byLedger: Array<{ ledgerId: string; nature: AccountNature; amountPaise: number }>;
}

export interface BalanceSheetResult {
  assetsPaise: number;
  liabilitiesPaise: number;
  equityPaise: number;
  /** Equity includes current-period profit when provided. */
  balanced: boolean;
  equationGapPaise: number;
}

export interface AgeingBucket {
  key: AgeingBucketKey;
  label: string;
  amountPaise: number;
  count: number;
}

export interface PartyMovement {
  date: string;
  voucherId?: string;
  debitPaise: number;
  creditPaise: number;
  narration?: string;
}

export interface PartyRunningBalanceRow extends PartyMovement {
  runningBalancePaise: number;
  /** Positive = party owes company (receivable-ish); negative = company owes party. */
}

/** Aggregate posted lines into trial balance (closing only; opening optional later). */
export function trialBalance(
  lines: Array<Pick<VoucherLine, "ledgerId" | "side" | "amountPaise">>,
  natures: LedgerNatureMap,
): TrialBalanceResult {
  const map = new Map<string, { debit: number; credit: number }>();
  for (const line of lines) {
    const row = map.get(line.ledgerId) ?? { debit: 0, credit: 0 };
    if (line.side === "DEBIT") row.debit += line.amountPaise;
    else row.credit += line.amountPaise;
    map.set(line.ledgerId, row);
  }

  const rows: TrialBalanceRow[] = [];
  let totalDebitPaise = 0;
  let totalCreditPaise = 0;

  for (const [ledgerId, agg] of map) {
    const nature = natures[ledgerId];
    const net = agg.debit - agg.credit;
    let closingDebitPaise = 0;
    let closingCreditPaise = 0;
    if (net > 0) closingDebitPaise = net;
    else if (net < 0) closingCreditPaise = -net;
    // Nature hint: if zero net, leave both zero
    void nature;
    rows.push({
      ledgerId,
      debitPaise: agg.debit,
      creditPaise: agg.credit,
      closingDebitPaise,
      closingCreditPaise,
    });
    totalDebitPaise += closingDebitPaise;
    totalCreditPaise += closingCreditPaise;
  }

  rows.sort((a, b) => a.ledgerId.localeCompare(b.ledgerId));
  return {
    rows,
    totalDebitPaise,
    totalCreditPaise,
    balanced: totalDebitPaise === totalCreditPaise,
  };
}

export function profitLoss(
  lines: Array<Pick<VoucherLine, "ledgerId" | "side" | "amountPaise">>,
  natures: LedgerNatureMap,
): ProfitLossResult {
  let incomePaise = 0;
  let expensePaise = 0;
  const byLedgerMap = new Map<string, number>();

  for (const line of lines) {
    const nature = natures[line.ledgerId];
    if (nature === "INCOME") {
      const delta = line.side === "CREDIT" ? line.amountPaise : -line.amountPaise;
      incomePaise += delta;
      byLedgerMap.set(line.ledgerId, (byLedgerMap.get(line.ledgerId) ?? 0) + delta);
    } else if (nature === "EXPENSE") {
      const delta = line.side === "DEBIT" ? line.amountPaise : -line.amountPaise;
      expensePaise += delta;
      byLedgerMap.set(line.ledgerId, (byLedgerMap.get(line.ledgerId) ?? 0) + delta);
    }
  }

  const byLedger = [...byLedgerMap.entries()].map(([ledgerId, amountPaise]) => ({
    ledgerId,
    nature: natures[ledgerId],
    amountPaise,
  }));

  return {
    incomePaise,
    expensePaise,
    profitPaise: incomePaise - expensePaise,
    byLedger,
  };
}

/**
 * Derive balance sheet totals from ledger closings.
 * ASSET normal Dr; LIABILITY/EQUITY normal Cr.
 * Optionally fold current P&L into equity (retained).
 */
export function balanceSheet(
  lines: Array<Pick<VoucherLine, "ledgerId" | "side" | "amountPaise">>,
  natures: LedgerNatureMap,
  options?: { includeProfitInEquity?: boolean },
): BalanceSheetResult {
  const closings = new Map<string, number>();
  for (const line of lines) {
    const signed = line.side === "DEBIT" ? line.amountPaise : -line.amountPaise;
    closings.set(line.ledgerId, (closings.get(line.ledgerId) ?? 0) + signed);
  }

  let assetsPaise = 0;
  let liabilitiesPaise = 0;
  let equityPaise = 0;

  for (const [ledgerId, debitNet] of closings) {
    const nature = natures[ledgerId];
    if (!nature) continue;
    if (nature === "ASSET") {
      assetsPaise += debitNet;
    } else if (nature === "LIABILITY") {
      liabilitiesPaise += -debitNet; // credit balance positive liability
    } else if (nature === "EQUITY") {
      equityPaise += -debitNet;
    }
  }

  if (options?.includeProfitInEquity !== false) {
    const pl = profitLoss(lines, natures);
    equityPaise += pl.profitPaise;
  }

  const equationGapPaise = assetsPaise - (liabilitiesPaise + equityPaise);
  return {
    assetsPaise,
    liabilitiesPaise,
    equityPaise,
    balanced: equationGapPaise === 0,
    equationGapPaise,
  };
}

export const DEFAULT_AGEING_BUCKETS: Array<{ key: AgeingBucketKey; label: string; minDays: number; maxDays: number | null }> = [
  { key: "not_due", label: "Not Due", minDays: Number.NEGATIVE_INFINITY, maxDays: -1 },
  { key: "0_15", label: "0–15", minDays: 0, maxDays: 15 },
  { key: "16_30", label: "16–30", minDays: 16, maxDays: 30 },
  { key: "31_60", label: "31–60", minDays: 31, maxDays: 60 },
  { key: "61_90", label: "61–90", minDays: 61, maxDays: 90 },
  { key: "90_plus", label: "90+", minDays: 91, maxDays: null },
];

function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(fromIso.slice(0, 10));
  const b = Date.parse(toIso.slice(0, 10));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.floor((b - a) / 86_400_000);
}

/** Age bills as-of a date into default buckets (inclusive bounds). */
export function ageingBuckets(
  bills: Array<Pick<BillRef, "outstandingPaise" | "dueDate" | "status">>,
  asOfDate: string,
): AgeingBucket[] {
  const result = DEFAULT_AGEING_BUCKETS.map((b) => ({
    key: b.key,
    label: b.label,
    amountPaise: 0,
    count: 0,
  }));

  for (const bill of bills) {
    if (bill.status === "SETTLED" || bill.status === "CANCELLED") continue;
    if (bill.outstandingPaise <= 0) continue;
    const due = bill.dueDate ?? asOfDate;
    const overdueDays = daysBetween(due, asOfDate);
    const bucketDef =
      DEFAULT_AGEING_BUCKETS.find((b) => {
        if (b.key === "not_due") return overdueDays < 0;
        if (b.maxDays === null) return overdueDays >= b.minDays;
        return overdueDays >= b.minDays && overdueDays <= b.maxDays;
      }) ?? DEFAULT_AGEING_BUCKETS[DEFAULT_AGEING_BUCKETS.length - 1];
    const row = result.find((r) => r.key === bucketDef.key)!;
    row.amountPaise += bill.outstandingPaise;
    row.count += 1;
  }
  return result;
}

/**
 * Party statement running balance.
 * Convention: Debit increases "party owes you"; Credit increases "you owe party".
 * Running balance: positive → receivable wording; negative → payable wording.
 */
export function partyRunningBalance(
  movements: PartyMovement[],
  openingBalancePaise = 0,
): PartyRunningBalanceRow[] {
  let running = openingBalancePaise;
  const sorted = [...movements].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((m) => {
    running += m.debitPaise - m.creditPaise;
    return { ...m, runningBalancePaise: running };
  });
}

/** Net ledger balance as signed debit-positive. */
export function ledgerNetDebitPaise(
  lines: Array<{ side: LineSide; amountPaise: number }>,
): number {
  return sumDebit(lines) - sumCredit(lines);
}
