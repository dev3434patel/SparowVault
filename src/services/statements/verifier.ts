/**
 * Full-source statement arithmetic + completeness + monthly bank-movement analytics.
 * Bank credits/debits are movements — not income/expense.
 */
import type { StatementRow } from "./types";

export interface StatementSourceRowInput {
  id: string;
  bookingDate: string;
  debitPaise: number;
  creditPaise: number;
  balancePaise: number | null;
  /** Opening / BF / CF / summary rows are not money transactions */
  nonTransaction?: boolean;
  page?: number;
  serial?: number | null;
}

export interface ArithmeticResult {
  status: "matched" | "mismatched" | "limited" | "unknown";
  openingPaise: number | null;
  closingPaise: number | null;
  totalDebitPaise: number;
  totalCreditPaise: number;
  issues: string[];
}

export interface CompletenessResult {
  status: "complete" | "incomplete" | "unknown";
  issues: string[];
  checks: {
    pageContinuity: "pass" | "fail" | "unavailable";
    serialContinuity: "pass" | "fail" | "unavailable";
    printedDebitCount: "pass" | "fail" | "unavailable";
    printedCreditCount: "pass" | "fail" | "unavailable";
    printedGrossDebit: "pass" | "fail" | "unavailable";
    printedGrossCredit: "pass" | "fail" | "unavailable";
    offsettingOmissionGuard: "pass" | "fail" | "unavailable";
  };
}

export interface MonthlyBankMovement {
  month: string;
  debitCount: number;
  creditCount: number;
  transactionCount: number;
  debitPaise: number;
  creditPaise: number;
  netPaise: number;
  firstDate: string;
  lastDate: string;
  coverage: "partial_month" | "full_month_observed" | "unknown";
}

export interface PrintedEvidence {
  pageNumbers?: number[];
  pageTotal?: number | null;
  serials?: Array<number | null>;
  printedDebitCount?: number | null;
  printedCreditCount?: number | null;
  printedGrossDebitPaise?: number | null;
  printedGrossCreditPaise?: number | null;
  /** Independent expected row count when available (golden / printed) */
  expectedTransactionCount?: number | null;
  evidenceOrigin?: "printed_summary" | "human_provided" | "layout_required" | "unavailable";
  evidenceScope?: string;
}

function moneyRows(rows: StatementSourceRowInput[]): StatementSourceRowInput[] {
  return rows.filter((r) => !r.nonTransaction && (r.debitPaise > 0 || r.creditPaise > 0 || (r.debitPaise === 0 && r.creditPaise === 0 && r.balancePaise !== null)));
}

function transactionRows(rows: StatementSourceRowInput[]): StatementSourceRowInput[] {
  return rows.filter((r) => !r.nonTransaction && (r.debitPaise > 0 || r.creditPaise > 0));
}

/**
 * Validate the complete source sequence before import selection filters.
 */
export function validateStatementArithmetic(
  rows: StatementSourceRowInput[],
  openingPaise: number | null,
  closingPaise: number | null,
  order: "ascending" | "descending" = "ascending",
): ArithmeticResult {
  const issues: string[] = [];
  const txs = transactionRows(rows);
  const totalDebitPaise = txs.reduce((s, r) => s + r.debitPaise, 0);
  const totalCreditPaise = txs.reduce((s, r) => s + r.creditPaise, 0);

  for (const row of txs) {
    if (row.debitPaise < 0 || row.creditPaise < 0) issues.push(`Row ${row.id}: negative debit/credit`);
    if (row.debitPaise > 0 && row.creditPaise > 0) issues.push(`Row ${row.id}: both debit and credit set`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.bookingDate)) issues.push(`Row ${row.id}: invalid booking date`);
  }

  const withBalances = moneyRows(rows).filter((r) => r.balancePaise !== null);
  if (withBalances.length >= 2) {
    const seq = order === "ascending" ? withBalances : [...withBalances].reverse();
    for (let i = 1; i < seq.length; i++) {
      const prev = seq[i - 1];
      const cur = seq[i];
      if (prev.balancePaise === null || cur.balancePaise === null) continue;
      if (cur.nonTransaction) continue;
      const expected = prev.balancePaise + cur.creditPaise - cur.debitPaise;
      if (expected !== cur.balancePaise) {
        issues.push(
          `Row ${cur.id}: running balance ${cur.balancePaise} != previous ${prev.balancePaise} + credit ${cur.creditPaise} - debit ${cur.debitPaise} (expected ${expected})`,
        );
      }
    }
  }

  if (openingPaise !== null && closingPaise !== null) {
    const expectedClosing = openingPaise + totalCreditPaise - totalDebitPaise;
    if (expectedClosing !== closingPaise) {
      issues.push(
        `Opening + credits - debits = ${expectedClosing}, but closing is ${closingPaise}`,
      );
    }
  }

  let status: ArithmeticResult["status"] = "unknown";
  if (openingPaise === null && closingPaise === null && withBalances.length < 2) {
    status = "limited";
  } else if (issues.some((i) => i.includes("running balance") || i.includes("Opening + credits"))) {
    status = "mismatched";
  } else if (openingPaise !== null && closingPaise !== null) {
    status = "matched";
  } else if (withBalances.length >= 2 && !issues.some((i) => i.includes("running balance"))) {
    status = "matched";
  } else {
    status = "limited";
  }

  return { status, openingPaise, closingPaise, totalDebitPaise, totalCreditPaise, issues };
}

/**
 * Completeness is independent of net arithmetic.
 * Omitting debit 100 + credit 100 can still leave balances matching.
 */
export function validateStatementCompleteness(
  rows: StatementSourceRowInput[],
  evidence: PrintedEvidence = {},
): CompletenessResult {
  const issues: string[] = [];
  const checks: CompletenessResult["checks"] = {
    pageContinuity: "unavailable",
    serialContinuity: "unavailable",
    printedDebitCount: "unavailable",
    printedCreditCount: "unavailable",
    printedGrossDebit: "unavailable",
    printedGrossCredit: "unavailable",
    offsettingOmissionGuard: "unavailable",
  };

  const txs = transactionRows(rows);
  const debitCount = txs.filter((r) => r.debitPaise > 0).length;
  const creditCount = txs.filter((r) => r.creditPaise > 0).length;
  const totalDebit = txs.reduce((s, r) => s + r.debitPaise, 0);
  const totalCredit = txs.reduce((s, r) => s + r.creditPaise, 0);

  if (evidence.pageNumbers && evidence.pageNumbers.length && evidence.pageTotal != null) {
    const unique = [...new Set(evidence.pageNumbers)].sort((a, b) => a - b);
    const expected = Array.from({ length: evidence.pageTotal }, (_, i) => i + 1);
    const missing = expected.filter((p) => !unique.includes(p));
    const dupes = evidence.pageNumbers.filter((p, i, arr) => arr.indexOf(p) !== i);
    if (missing.length || dupes.length || unique[0] !== 1 || unique[unique.length - 1] !== evidence.pageTotal) {
      checks.pageContinuity = "fail";
      if (missing.length) issues.push(`Missing pages: ${missing.join(", ")}`);
      if (dupes.length) issues.push(`Duplicate pages: ${[...new Set(dupes)].join(", ")}`);
    } else {
      checks.pageContinuity = "pass";
    }
  }

  const serials = (evidence.serials ?? rows.map((r) => r.serial ?? null)).filter((s): s is number => s != null);
  if (serials.length >= 2) {
    const sorted = [...serials].sort((a, b) => a - b);
    let ok = true;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] !== sorted[i - 1] + 1) {
        ok = false;
        issues.push(`Serial gap between ${sorted[i - 1]} and ${sorted[i]}`);
      }
    }
    checks.serialContinuity = ok ? "pass" : "fail";
  }

  if (evidence.printedDebitCount != null) {
    checks.printedDebitCount = evidence.printedDebitCount === debitCount ? "pass" : "fail";
    if (checks.printedDebitCount === "fail") {
      issues.push(`Printed debit count ${evidence.printedDebitCount} != extracted ${debitCount}`);
    }
  }
  if (evidence.printedCreditCount != null) {
    checks.printedCreditCount = evidence.printedCreditCount === creditCount ? "pass" : "fail";
    if (checks.printedCreditCount === "fail") {
      issues.push(`Printed credit count ${evidence.printedCreditCount} != extracted ${creditCount}`);
    }
  }
  if (evidence.printedGrossDebitPaise != null) {
    checks.printedGrossDebit = evidence.printedGrossDebitPaise === totalDebit ? "pass" : "fail";
    if (checks.printedGrossDebit === "fail") {
      issues.push(`Printed gross debit ${evidence.printedGrossDebitPaise} != extracted ${totalDebit}`);
    }
  }
  if (evidence.printedGrossCreditPaise != null) {
    checks.printedGrossCredit = evidence.printedGrossCreditPaise === totalCredit ? "pass" : "fail";
    if (checks.printedGrossCredit === "fail") {
      issues.push(`Printed gross credit ${evidence.printedGrossCreditPaise} != extracted ${totalCredit}`);
    }
  }

  if (evidence.expectedTransactionCount != null) {
    checks.offsettingOmissionGuard =
      evidence.expectedTransactionCount === txs.length ? "pass" : "fail";
    if (checks.offsettingOmissionGuard === "fail") {
      issues.push(
        `Expected ${evidence.expectedTransactionCount} transactions but extracted ${txs.length} (offsetting omissions can preserve net balance)`,
      );
    }
  }

  const failed = Object.values(checks).some((c) => c === "fail");
  const anyAvailable = Object.values(checks).some((c) => c !== "unavailable");
  return {
    status: failed ? "incomplete" : anyAvailable ? "complete" : "unknown",
    issues,
    checks,
  };
}

/**
 * Monthly bank-movement report (not financial-meaning / income-expense).
 */
export function reportBankStatementMonths(
  rows: StatementSourceRowInput[],
  options: { periodStart?: string | null; periodEnd?: string | null } = {},
): MonthlyBankMovement[] {
  const txs = transactionRows(rows);
  const byMonth = new Map<string, StatementSourceRowInput[]>();
  for (const row of txs) {
    const month = row.bookingDate.slice(0, 7);
    const list = byMonth.get(month) ?? [];
    list.push(row);
    byMonth.set(month, list);
  }

  const months = [...byMonth.keys()].sort();
  return months.map((month) => {
    const list = byMonth.get(month)!;
    const debitRows = list.filter((r) => r.debitPaise > 0);
    const creditRows = list.filter((r) => r.creditPaise > 0);
    const dates = list.map((r) => r.bookingDate).sort();
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];
    const daysInMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
    const coversFull =
      firstDate === `${month}-01` && lastDate === `${month}-${String(daysInMonth).padStart(2, "0")}`;
    let coverage: MonthlyBankMovement["coverage"] = "partial_month";
    if (coversFull) coverage = "full_month_observed";
    // Statement period may still be partial even if observed dates span the month endpoints.
    if (options.periodStart && options.periodStart.slice(0, 7) === month && options.periodStart > `${month}-01`) {
      coverage = "partial_month";
    }
    if (options.periodEnd && options.periodEnd.slice(0, 7) === month) {
      const dim = String(daysInMonth).padStart(2, "0");
      if (options.periodEnd < `${month}-${dim}`) coverage = "partial_month";
    }
    const debitPaise = debitRows.reduce((s, r) => s + r.debitPaise, 0);
    const creditPaise = creditRows.reduce((s, r) => s + r.creditPaise, 0);
    return {
      month,
      debitCount: debitRows.length,
      creditCount: creditRows.length,
      transactionCount: list.length,
      debitPaise,
      creditPaise,
      netPaise: creditPaise - debitPaise,
      firstDate,
      lastDate,
      coverage,
    };
  });
}

export function toVerifierRows(rows: StatementRow[]): StatementSourceRowInput[] {
  return rows.map((r, index) => ({
    id: r.id,
    bookingDate: r.date,
    debitPaise: r.debitPaise,
    creditPaise: r.creditPaise,
    balancePaise: r.balancePaise,
    page: r.page,
    serial: null,
    nonTransaction: false,
    sourceOrdinal: index,
  }));
}

export interface PageCoverageEntry {
  page: number;
  status: "ok" | "empty" | "failed" | "ocr";
  tokenCount: number;
  transactionRows: number;
}

/**
 * A document cannot be marked complete if any page is empty/failed.
 */
export function buildPageCoverage(
  pages: Array<{ number: number; tokenCount: number; extraction?: "ocr"; failed?: boolean }>,
  rows: Array<{ page: number }>,
): { coverage: PageCoverageEntry[]; complete: boolean; issues: string[] } {
  const rowCountByPage = new Map<number, number>();
  for (const row of rows) {
    rowCountByPage.set(row.page, (rowCountByPage.get(row.page) ?? 0) + 1);
  }
  const issues: string[] = [];
  const coverage = pages.map((page) => {
    let status: PageCoverageEntry["status"] = "ok";
    if (page.failed) status = "failed";
    else if (page.tokenCount < 20) status = "empty";
    else if (page.extraction === "ocr") status = "ocr";
    if (status === "empty" || status === "failed") {
      issues.push(`Page ${page.number} coverage is ${status}; document is not complete for auto-import`);
    }
    return {
      page: page.number,
      status,
      tokenCount: page.tokenCount,
      transactionRows: rowCountByPage.get(page.number) ?? 0,
    };
  });
  const expected = pages.map((p) => p.number).sort((a, b) => a - b);
  for (let i = 0; i < expected.length; i++) {
    if (expected[i] !== i + 1) {
      issues.push(`Page coverage sequence gap near page ${expected[i]}`);
    }
  }
  return { coverage, complete: issues.length === 0, issues };
}

/** Brought-forward / carried-forward / opening-closing table rows are not postable transactions. */
export function isNonTransactionNarration(narration: string): boolean {
  return /^(?:opening|closing)\s+balance$|brought\s+forward|carried\s+forward|\bb\/?\s*f\b|\bc\/?\s*f\b/i.test(
    narration.trim(),
  );
}
