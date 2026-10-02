import { describe, expect, it } from "vitest";
import fixture from "../fixtures/statements/v2/synthetic-acceptance-2026-03-04.json";
import {
  validateStatementArithmetic,
  validateStatementCompleteness,
  reportBankStatementMonths,
  type StatementSourceRowInput,
} from "@/services/statements/verifier";
import { detectStatementIssuer, evaluateAccountMaskCollision } from "@/services/statements/issuer";
import { layoutScorecard, supportLabelForBank, STATEMENT_TARGET_BANK_IDS, statementEvidenceInventory } from "@/services/statements/layoutRegistry";
import { reportEconomicMonth } from "@/services/statements/reports";
import { allocateEmiFromSchedule, emiAllocationFromNarration, isCreditCardStatementHeading } from "@/services/statements/cardDocument";
import { draftMatchesFile, type StatementReviewDraft } from "@/services/statements/draft";
import { fundedGoalTransferEffect, goalEarmarkEffect } from "@/services/statements/goalFunding";
import { proposeStatementMatches } from "@/services/statements/matching";
import { buildPageCoverage, isNonTransactionNarration } from "@/services/statements/verifier";
import type { StatementDecision, StatementPage, StatementRow } from "@/services/statements/types";
import type { Transaction } from "@/types";

function fixtureRows(): StatementSourceRowInput[] {
  return fixture.rows.map((r) => ({
    id: r.id,
    bookingDate: r.bookingDate,
    debitPaise: r.debitPaise,
    creditPaise: r.creditPaise,
    balancePaise: r.balancePaise,
  }));
}

describe("statement verifier + synthetic acceptance oracle", () => {
  it("matches March/April bank movement amounts and counts exactly", () => {
    const rows = fixtureRows();
    const arithmetic = validateStatementArithmetic(rows, fixture.openingPaise, fixture.expected.closingPaise, "ascending");
    expect(arithmetic.status).toBe("matched");
    expect(arithmetic.issues).toEqual([]);
    expect(arithmetic.totalDebitPaise).toBe(2845000);
    expect(arithmetic.totalCreditPaise).toBe(5300000);

    const months = reportBankStatementMonths(rows, {
      periodStart: "2026-03-30",
      periodEnd: "2026-04-02",
    });
    expect(months).toHaveLength(2);
    const march = months.find((m) => m.month === "2026-03")!;
    const april = months.find((m) => m.month === "2026-04")!;
    expect(march).toMatchObject({
      creditCount: 1,
      creditPaise: 5000000,
      debitCount: 3,
      debitPaise: 1745000,
      coverage: "partial_month",
    });
    expect(april).toMatchObject({
      creditCount: 2,
      creditPaise: 300000,
      debitCount: 2,
      debitPaise: 1100000,
      coverage: "partial_month",
    });
    expect(march.creditPaise - march.debitPaise + fixture.openingPaise).toBe(4255000);
  });

  it("detects omitted offsetting pairs via completeness even when net still matches", () => {
    const rows = fixtureRows().filter((r) => r.id !== "r2" && r.id !== "r5");
    // Rebuild balances as if those rows never existed but closing still "looks" reconciled for remaining chain is not required —
    // the point is printed/expected counts catch omissions.
    const completeness = validateStatementCompleteness(rows, {
      expectedTransactionCount: fixture.expected.completeness.expectedTransactionCount,
      printedDebitCount: fixture.expected.completeness.printedDebitCount,
      printedCreditCount: fixture.expected.completeness.printedCreditCount,
      printedGrossDebitPaise: fixture.expected.completeness.printedGrossDebitPaise,
      printedGrossCreditPaise: fixture.expected.completeness.printedGrossCreditPaise,
    });
    expect(completeness.status).toBe("incomplete");
    expect(completeness.checks.offsettingOmissionGuard).toBe("fail");
  });

  it("fails on 1-paise tampering", () => {
    const rows = fixtureRows();
    rows[0] = { ...rows[0], creditPaise: rows[0].creditPaise + 1, balancePaise: (rows[0].balancePaise ?? 0) + 1 };
    const arithmetic = validateStatementArithmetic(rows, fixture.openingPaise, fixture.expected.closingPaise, "ascending");
    expect(arithmetic.status).toBe("mismatched");
  });

  it("passes completeness when printed evidence matches", () => {
    const completeness = validateStatementCompleteness(fixtureRows(), fixture.expected.completeness);
    expect(completeness.status).toBe("complete");
    expect(completeness.checks.offsettingOmissionGuard).toBe("pass");
  });
});

describe("financial meaning vs bank credits", () => {
  it("does not treat April refund/collection credits as income without purpose approval", () => {
    const rows: StatementRow[] = fixture.rows.map((r, index) => ({
      id: r.id,
      page: 1,
      y: index,
      date: r.bookingDate,
      description: r.narration,
      reference: "",
      debitPaise: r.debitPaise,
      creditPaise: r.creditPaise,
      balancePaise: r.balancePaise,
      issues: [],
    }));
    const decisions: Record<string, StatementDecision> = Object.fromEntries(
      fixture.rows.map((r) => [
        r.id,
        {
          include: true,
          reviewed: true,
          kind:
            r.purposeHint === "income_salary"
              ? "income"
              : r.purposeHint === "expense"
                ? "expense"
                : r.purposeHint === "refund"
                  ? "refund"
                  : r.purposeHint === "cc_payment"
                    ? "cc_payment"
                    : "",
          categoryId: r.purposeHint === "income_salary" || r.purposeHint === "expense" || r.purposeHint === "refund" ? "cat" : "",
          scope: "personal",
          counterpartId: r.purposeHint === "refund" || r.purposeHint === "cc_payment" ? "counterpart" : "",
          reason: "test",
          duplicate: null,
        } satisfies StatementDecision,
      ]),
    );
    const economic = reportEconomicMonth(rows, decisions);
    const april = economic.find((m) => m.month === "2026-04")!;
    expect(april.bankCreditPaise).toBe(300000);
    expect(april.incomePaise).toBe(0);
    expect(april.refundPaise).toBe(200000);
  });
});

describe("issuer and account identity", () => {
  it("does not treat payee bank names in narration as issuer when header is Kotak", () => {
    const pages: StatementPage[] = [
      {
        number: 1,
        width: 600,
        height: 800,
        tokens: [
          { text: "Kotak", x: 40, y: 40, width: 40, height: 10 },
          { text: "Mahindra", x: 90, y: 40, width: 50, height: 10 },
          { text: "Bank", x: 150, y: 40, width: 30, height: 10 },
          { text: "UPI", x: 40, y: 400, width: 20, height: 10 },
          { text: "to", x: 70, y: 400, width: 15, height: 10 },
          { text: "HDFC", x: 95, y: 400, width: 30, height: 10 },
          { text: "Bank", x: 130, y: 400, width: 30, height: 10 },
          { text: "Registered", x: 40, y: 760, width: 50, height: 10 },
          { text: "Office:", x: 95, y: 760, width: 40, height: 10 },
          { text: "www.kotak.com", x: 150, y: 760, width: 80, height: 10 },
        ],
      },
    ];
    const result = detectStatementIssuer(pages);
    expect(result.bankId).toBe("kotak");
    expect(result.needsConfirmation).toBe(false);
  });

  it("marks last4 collisions as ambiguous", () => {
    const result = evaluateAccountMaskCollision("1234", [
      { id: "a1", name: "Salary", last4: "1234" },
      { id: "a2", name: "Savings", last4: "1234" },
    ]);
    expect(result?.ambiguous).toBe(true);
  });
});

describe("layout registry truthfulness", () => {
  it("tracks exactly 20 target banks and never claims name-only as verified", () => {
    expect(STATEMENT_TARGET_BANK_IDS).toHaveLength(20);
    expect(new Set(STATEMENT_TARGET_BANK_IDS).size).toBe(20);
    const scorecard = layoutScorecard();
    expect(scorecard.byStatus["verified-for-scope"] ?? 0).toBe(0);
    expect(supportLabelForBank("icici")).toMatch(/needs review/i);
    expect(supportLabelForBank("hdfc")).toMatch(/synthetic/i);
    const inventory = statementEvidenceInventory();
    expect(inventory.recognized).toBe(38);
    expect(inventory.fixtureTested).toBe(5);
    expect(inventory.verifiedForScope).toBe(0);
    expect(inventory.registeredOnly).toBe(15);
    expect(inventory.noLayoutSpec).toBe(18);
  });
});

describe("card EMI allocation rules", () => {
  it("uses lender schedule example P=300000@12% payment=10000 => interest 3000 principal 7000", () => {
    const split = allocateEmiFromSchedule({
      openingPrincipalPaise: 30_000_000,
      annualRatePercent: 12,
      paymentPaise: 1_000_000,
    });
    expect(split).toEqual({ interestPaise: 300_000, principalPaise: 700_000, source: "lender_schedule" });
  });

  it("refuses narration-only EMI splits", () => {
    expect(emiAllocationFromNarration("EMI HOME LOAN XYZ BANK").status).toBe("unavailable");
  });

  it("detects credit-card statement headings", () => {
    expect(isCreditCardStatementHeading("Credit Card Statement Minimum Amount Due")).toBe(true);
  });
});

describe("secure draft resume", () => {
  it("requires matching user and document hash", () => {
    const draft: StatementReviewDraft = {
      version: 1,
      userId: "u1",
      documentHash: "abc",
      fileName: "x.pdf",
      bank: "hdfc",
      accountId: "a1",
      parserVersion: "statement-text-v2",
      savedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 1000).toISOString(),
      openingText: "0",
      closingText: "0",
      decisions: {},
      currencyConfirmed: false,
      ocrSourceConfirmed: false,
    };
    expect(draftMatchesFile(draft, "abc", "u1")).toBe(true);
    expect(draftMatchesFile(draft, "zzz", "u1")).toBe(false);
    expect(draftMatchesFile(draft, "abc", "u2")).toBe(false);
  });
});

describe("goal earmark vs funded transfer", () => {
  it("earmarking 2000 rupees leaves bank balance and net worth unchanged", () => {
    const effect = goalEarmarkEffect(200_000);
    expect(effect.sourceAccountBalanceDeltaPaise).toBe(0);
    expect(effect.destinationAccountBalanceDeltaPaise).toBe(0);
    expect(effect.netWorthDeltaPaise).toBe(0);
    expect(effect.allocatedInsideSourceDeltaPaise).toBe(200_000);
  });

  it("funded 2000 transfer changes two accounts, not consumption", () => {
    const effect = fundedGoalTransferEffect(200_000);
    expect(effect.sourceAccountBalanceDeltaPaise).toBe(-200_000);
    expect(effect.destinationAccountBalanceDeltaPaise).toBe(200_000);
    expect(effect.netWorthDeltaPaise).toBe(0);
  });
});

describe("page coverage and match proposals", () => {
  it("fails completeness when a page is empty", () => {
    const result = buildPageCoverage(
      [
        { number: 1, tokenCount: 100 },
        { number: 2, tokenCount: 5 },
      ],
      [{ page: 1 }],
    );
    expect(result.complete).toBe(false);
    expect(result.coverage[1].status).toBe("empty");
  });

  it("classifies BF/CF narrations as non-transactions", () => {
    expect(isNonTransactionNarration("Brought Forward")).toBe(true);
    expect(isNonTransactionNarration("UPI MERCHANT")).toBe(false);
  });

  it("keeps fuzzy duplicates as suggestions only", () => {
    const proposals = proposeStatementMatches(
      [
        {
          id: "1",
          page: 1,
          y: 1,
          date: "2026-04-01",
          description: "RENT",
          reference: "",
          debitPaise: 10000,
          creditPaise: 0,
          balancePaise: 0,
          issues: [],
        },
      ],
      "acct",
      [
        {
          id: "tx1",
          userId: "u",
          date: "2026-04-01",
          type: "expense",
          amount: 100,
          amountPaise: 10000,
          accountId: "acct",
          description: "OTHER RENT",
          merchantOrPerson: "",
          paymentMode: "bank_transfer",
          businessOrPersonal: "personal",
          createdAt: "",
          updatedAt: "",
          version: 1,
          isDeleted: false,
          tags: [],
          notes: "",
          billAvailable: 0,
          gstApplicable: 0,
          taxFlag: 0,
          needWant: "unassigned",
          fixedVariable: "unassigned",
          plannedUnplanned: "unassigned",
        } as Transaction,
      ],
    );
    expect(proposals[0].status).toBe("suggested");
    expect(proposals[0].confidence).toBeLessThan(0.9);
    expect(proposals[0].existingTransactionId).toBeNull();
  });
});

describe("R4 account-month overlap + R6 card fixture", () => {
  it("keeps per-document stats intact while union avoids double-counting resolved overlaps", async () => {
    const { accountMonthUnionFromDocuments, sourceDocumentStats } = await import("@/services/statements/reports");
    const docA = {
      documentId: "pdf-a",
      rows: [
        { occurrenceId: "a1", bookingDate: "2026-04-01", debitPaise: 5000, creditPaise: 0, fingerprint: "same-april", resolvedObservationId: "obs-april-1" },
        { occurrenceId: "a2", bookingDate: "2026-04-02", debitPaise: 0, creditPaise: 100000, fingerprint: "credit-april" },
      ],
    };
    const docB = {
      documentId: "pdf-b",
      rows: [
        { occurrenceId: "b1", bookingDate: "2026-04-01", debitPaise: 5000, creditPaise: 0, fingerprint: "same-april", resolvedObservationId: "obs-april-1" },
      ],
    };
    const statsA = sourceDocumentStats("pdf-a", docA.rows);
    const statsB = sourceDocumentStats("pdf-b", docB.rows);
    expect(statsA).toMatchObject({ debitCount: 1, creditCount: 1, debitPaise: 5000, creditPaise: 100000 });
    expect(statsB).toMatchObject({ debitCount: 1, creditCount: 0, debitPaise: 5000 });
    const union = accountMonthUnionFromDocuments([docA, docB]);
    expect(union).toHaveLength(1);
    expect(union[0]).toMatchObject({
      month: "2026-04",
      debitCount: 1,
      creditCount: 1,
      debitPaise: 5000,
      creditPaise: 100000,
      unresolvedOverlapCount: 0,
    });
  });

  it("flags unresolved fingerprint overlaps without inventing a merge", async () => {
    const { accountMonthUnionFromDocuments } = await import("@/services/statements/reports");
    const union = accountMonthUnionFromDocuments([
      {
        documentId: "a",
        rows: [{ occurrenceId: "1", bookingDate: "2026-04-01", debitPaise: 5000, creditPaise: 0, fingerprint: "ambig" }],
      },
      {
        documentId: "b",
        rows: [{ occurrenceId: "2", bookingDate: "2026-04-01", debitPaise: 5000, creditPaise: 0, fingerprint: "ambig" }],
      },
    ]);
    expect(union[0].debitCount).toBe(1);
    expect(union[0].unresolvedOverlapCount).toBe(1);
  });

  it("computes synthetic card closing liability without inventing running balances", async () => {
    const { parseSyntheticCardFixture } = await import("@/services/statements/cardDocument");
    const doc = parseSyntheticCardFixture({
      previousBalancePaise: 100000,
      rows: [
        { id: "p1", bookingDate: "2026-04-01", narration: "PURCHASE", amountPaise: 50000, direction: "debit", kindHint: "purchase" },
        { id: "i1", bookingDate: "2026-04-02", narration: "INTEREST", amountPaise: 2000, direction: "debit", kindHint: "interest" },
        { id: "pay", bookingDate: "2026-04-03", narration: "PAYMENT", amountPaise: 80000, direction: "credit", kindHint: "payment" },
        { id: "rf", bookingDate: "2026-04-04", narration: "REFUND", amountPaise: 10000, direction: "credit", kindHint: "refund" },
      ],
    });
    expect(doc.documentClass).toBe("credit_card");
    expect(doc.closingLiabilityPaise).toBe(62000);
  });

  it("invalidates approval digest on one-paise or cross-month date correction", async () => {
    const { approvalInvalidatedByCorrection, applyFieldCorrection, nextReviewState } = await import("@/services/statements/reviewState");
    const row = {
      id: "r1", page: 1, y: 10, date: "2026-03-31", description: "X", reference: "", debitPaise: 10000, creditPaise: 0, balancePaise: 990000, issues: [],
    };
    const base = {
      bank: "hdfc",
      parserVersion: "statement-text-v2",
      accountId: "acct",
      currency: "INR",
      rows: [row],
      evidence: {},
      decisions: { r1: { include: true, kind: "expense" as const, categoryId: "c", scope: "personal" as const, counterpartId: "" } },
      reviewRevision: 0,
    };
    const paise = {
      ...base,
      reviewRevision: 1,
      rows: [applyFieldCorrection(row, { amountPaise: 10001 })],
      corrections: { r1: { amountPaise: 10001, reason: "one paise" } },
    };
    const dated = {
      ...base,
      reviewRevision: 1,
      rows: [applyFieldCorrection(row, { date: "2026-04-01" })],
      corrections: { r1: { date: "2026-04-01", reason: "month move" } },
    };
    expect(approvalInvalidatedByCorrection(base, paise)).toBe(true);
    expect(approvalInvalidatedByCorrection(base, dated)).toBe(true);
    expect(nextReviewState("validated", "correct")).toBe("dirty");
  });
});
