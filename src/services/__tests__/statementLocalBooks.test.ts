import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SparowVaultDB } from "@/db/database";
import {
  buildReviewedCardStatement,
  persistReviewedCardStatement,
  storeConfirmedStatementImport,
  type ReviewedCardImport,
  type StatementImportCache,
} from "@/services/statements/localBooks";
import {
  applyStatementLocalCopy,
  readCommittedCardStatement,
  readStatementLocalApply,
  rememberServerCommittedStatement,
  rememberStatementCommand,
  stableCardStatementId,
} from "@/services/statements/localApply";
import {
  LEGACY_PLACEHOLDER_NOTES,
  formatCardMoneyFact,
  markLegacyPlaceholderCardFacts,
  mergeCardMoneyFact,
  normalizeCardMoneyWrite,
  readCardMoneyFact,
} from "@/services/statements/cardMoneyFact";
import { reportEconomicMonth, sourceDocumentStats } from "@/services/statements/reports";
import type { StatementDecision, StatementRow } from "@/services/statements/types";
import {
  reportBankStatementMonths,
  validateStatementArithmetic,
  validateStatementCompleteness,
  type StatementSourceRowInput,
} from "@/services/statements/verifier";
import { statementReceiptHref, statementReceiptQuery } from "@/services/statements/receiptLink";
import { resetSyncOutboxForTests } from "@/services/syncOutbox";
import type { CardStatement, ImportSource, ReconciliationMatch, Transaction } from "@/types";

function writer(table: SparowVaultDB["cardStatements"]) {
  return {
    async list(userId: string) {
      const rows = await table.where("userId").equals(userId).toArray();
      return rows.filter((row) => row.isDeleted !== 1);
    },
    async create(input: { userId: string; data: Partial<CardStatement> }) {
      const now = new Date().toISOString();
      const row = {
        ...input.data,
        id: crypto.randomUUID(),
        userId: input.userId,
        createdAt: now,
        updatedAt: now,
        isDeleted: 0,
        version: 1,
        tags: input.data.tags ?? [],
        notes: input.data.notes ?? "",
      } as CardStatement;
      await table.add(row);
      return row;
    },
    async update(id: string, patch: Partial<CardStatement>) {
      const current = await table.get(id);
      if (!current) return undefined;
      const next = { ...current, ...patch, updatedAt: new Date().toISOString(), version: (current.version ?? 1) + 1 };
      await table.put(next);
      return next;
    },
  };
}

function source(id: string, userId = "u1"): ImportSource {
  return {
    id,
    userId,
    name: "Bank statement",
    kind: "manual",
    lastImportAt: "2026-05-01T00:00:00.000Z",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    isDeleted: 0,
    version: 1,
    tags: ["statement-import"],
    notes: "",
  };
}

function match(id: string, userId = "u1"): ReconciliationMatch {
  return {
    id,
    userId,
    leftTransactionId: "txn-existing",
    status: "confirmed",
    confidence: 1,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    isDeleted: 0,
    version: 1,
    tags: ["statement-match"],
    notes: "",
  };
}

let db: SparowVaultDB;

beforeEach(() => {
  db = new SparowVaultDB(`statement-books-${crypto.randomUUID()}`);
});

afterEach(async () => {
  await db.delete();
});

describe("statement import local books", () => {
  it("stores confirmed matches locally after a simulated import result", async () => {
    const cache: StatementImportCache = {
      putImportSource: async (row) => { await db.importSources.put(row); },
      putReconciliationMatches: async (rows) => { await db.reconciliationMatches.bulkPut(rows); },
    };
    const stored = await storeConfirmedStatementImport({
      userId: "u1",
      activeUserId: () => "u1",
      result: { importSourceId: "src-1", matchIds: ["match-1", "match-2"], imported: 1, duplicates: 0, skipped: 1, transactionIds: ["txn-new"] },
      loadImportSource: async () => source("src-1"),
      loadReconciliationMatches: async () => [match("match-1"), match("match-2"), match("match-other")],
      cache,
    });
    expect(stored).toEqual({ wrote: true, sourceStored: true, matchCount: 2 });
    const matches = await db.reconciliationMatches.where("userId").equals("u1").toArray();
    expect(matches.map((row) => row.id).sort()).toEqual(["match-1", "match-2"]);
    expect(matches.every((row) => row.status === "confirmed")).toBe(true);
    expect((await db.importSources.get("src-1"))?.userId).toBe("u1");
    expect(await db.transactions.count()).toBe(0);
  });

  it("does not write local books when the signed-in user changed", async () => {
    let reads = 0;
    let writes = 0;
    const cache: StatementImportCache = {
      putImportSource: async () => { writes += 1; },
      putReconciliationMatches: async () => { writes += 1; },
    };
    const changedDuringLoad = await storeConfirmedStatementImport({
      userId: "u1",
      activeUserId: () => (reads === 0 ? "u1" : "u2"),
      result: { importSourceId: "src-1", matchIds: ["match-1"], imported: 0, duplicates: 0, skipped: 0, transactionIds: [] },
      loadImportSource: async () => { reads += 1; return source("src-1"); },
      loadReconciliationMatches: async () => [match("match-1")],
      cache,
    });
    expect(changedDuringLoad.wrote).toBe(false);
    expect(writes).toBe(0);
    const signedOut = await storeConfirmedStatementImport({
      userId: "u1",
      activeUserId: () => undefined,
      result: { importSourceId: "src-1", matchIds: ["match-1"], imported: 0, duplicates: 0, skipped: 0, transactionIds: [] },
      loadImportSource: async () => { throw new Error("should not fetch"); },
      loadReconciliationMatches: async () => { throw new Error("should not fetch"); },
      cache,
    });
    expect(signedOut.wrote).toBe(false);
    expect(await db.importSources.count()).toBe(0);
    expect(await db.reconciliationMatches.count()).toBe(0);
  });

  it("saves one card statement whose closing balance is the reviewed closing figure", async () => {
    const reviewedClosing = 62000;
    const input = {
      cardId: "card-1",
      openingBalancePaise: 100000,
      closingBalancePaise: reviewedClosing,
      statementDate: "2026-05-01",
      cycleStartDate: "2026-04-01",
      cycleEndDate: "2026-04-30",
      rows: [
        { amountPaise: 50000, direction: "debit" as const, kindHint: "purchase" },
        { amountPaise: 80000, direction: "credit" as const, kindHint: "payment" },
        { amountPaise: 10000, direction: "credit" as const, kindHint: "refund" },
      ],
    };
    const statements = writer(db.cardStatements);
    const saved = await persistReviewedCardStatement("u1", input, statements);
    expect(saved.closingBalancePaise).toBe(reviewedClosing);
    expect(saved.openingBalancePaise).toBe(100000);
    expect(saved.paymentsPaise).toBe(80000);
    expect(saved.creditsPaise).toBe(10000);
    expect(saved.interestPaise).toBeNull();
    expect(saved.feesPaise).toBeNull();
    expect(saved.minimumDuePaise).toBeNull();
    expect(saved.interestEvidence).toBe("not_observed");
    expect(saved.feesEvidence).toBe("not_observed");
    expect(saved.minimumDueEvidence).toBe("not_observed");
    expect(saved.notes).not.toMatch(/Interest is 0/);
    expect(saved.notes).toMatch(/not posted again/);
    const again = await persistReviewedCardStatement("u1", input, statements);
    expect(again.id).toBe(saved.id);
    expect(again.closingBalancePaise).toBe(reviewedClosing);
    expect(await db.cardStatements.count()).toBe(1);
    expect(await db.transactions.count()).toBe(0);
  });

  it("keeps a printed zero and leaves a missing figure unknown", () => {
    const printed = buildReviewedCardStatement({
      cardId: "card-1",
      openingBalancePaise: 0,
      closingBalancePaise: 0,
      statementDate: "2026-05-01",
      cycleStartDate: "2026-04-01",
      cycleEndDate: "2026-04-30",
      rows: [
        { amountPaise: 0, direction: "debit", kindHint: "interest" },
        { amountPaise: 0, direction: "debit", kindHint: "fee" },
      ],
      minimumDue: { valuePaise: 0, evidence: "source_observed" },
    });
    expect(printed.interestPaise).toBe(0);
    expect(printed.interestEvidence).toBe("source_observed");
    expect(printed.feesPaise).toBe(0);
    expect(printed.feesEvidence).toBe("source_observed");
    expect(printed.minimumDuePaise).toBe(0);
    expect(printed.minimumDueEvidence).toBe("source_observed");
    const absent = buildReviewedCardStatement({
      cardId: "card-1",
      openingBalancePaise: 100,
      closingBalancePaise: 100,
      statementDate: "2026-05-01",
      cycleStartDate: "2026-04-01",
      cycleEndDate: "2026-04-30",
      rows: [{ amountPaise: 100, direction: "debit", kindHint: "purchase" }],
    });
    expect(absent.interestPaise).toBeNull();
    expect(absent.feesPaise).toBeNull();
    expect(absent.minimumDuePaise).toBeNull();
    expect(readCardMoneyFact(absent as CardStatement, "minimumDue").evidence).toBe("not_observed");
    expect(mergeCardMoneyFact(
      { valuePaise: 0, evidence: "source_observed", needsReview: false },
      { valuePaise: 500, evidence: "estimated", needsReview: false },
    )).toMatchObject({ valuePaise: 0, evidence: "source_observed" });
  });

  it("marks legacy placeholder zeros as not observed without inventing a charge", () => {
    const posted = { id: "txn-posted", amountPaise: 50000 };
    const legacy = {
      id: "st-legacy",
      userId: "u1",
      cardId: "card-1",
      cycleStartDate: "2026-04-01",
      cycleEndDate: "2026-04-30",
      statementDate: "2026-05-01",
      openingBalancePaise: 0,
      closingBalancePaise: 50000,
      minimumDuePaise: 0,
      retailSpendPaise: 50000,
      feesPaise: 0,
      interestPaise: 0,
      paymentsPaise: 0,
      creditsPaise: 0,
      status: "closed",
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z",
      isDeleted: 0,
      version: 1,
      tags: [],
      notes: `${LEGACY_PLACEHOLDER_NOTES.interest} ${LEGACY_PLACEHOLDER_NOTES.fees} ${LEGACY_PLACEHOLDER_NOTES.minimumDue}`,
    } as CardStatement;
    const marked = markLegacyPlaceholderCardFacts(legacy);
    expect(marked.changed).toBe(true);
    expect(marked.statement.interestPaise).toBeNull();
    expect(marked.statement.feesPaise).toBeNull();
    expect(marked.statement.minimumDuePaise).toBeNull();
    expect(marked.statement.interestEvidence).toBe("not_observed");
    expect(marked.statement.retailSpendPaise).toBe(50000);
    expect(posted.amountPaise).toBe(50000);
    const ambiguous = { ...legacy, notes: "" };
    expect(markLegacyPlaceholderCardFacts(ambiguous).changed).toBe(false);
    expect(readCardMoneyFact(ambiguous, "interest")).toMatchObject({ valuePaise: null, evidence: "not_observed" });
  });

  it("resumes local apply after a Dexie abort without a second financial post", async () => {
    resetSyncOutboxForTests();
    await db.transactions.add({
      id: "txn-posted",
      userId: "u1",
      date: "2026-04-15",
      type: "expense",
      amount: 500,
      amountPaise: 50000,
      description: "Already posted",
      merchantOrPerson: "",
      paymentMode: "credit_card",
      businessOrPersonal: "personal",
      billAvailable: 0,
      gstApplicable: 0,
      taxFlag: 0,
      needWant: "unassigned",
      fixedVariable: "unassigned",
      plannedUnplanned: "unassigned",
      createdAt: "2026-04-15T00:00:00.000Z",
      updatedAt: "2026-04-15T00:00:00.000Z",
      isDeleted: 0,
      version: 1,
      tags: [],
      notes: "",
    } as Transaction);
    const card: ReviewedCardImport = {
      cardId: "card-1",
      openingBalancePaise: 100000,
      closingBalancePaise: 62000,
      statementDate: "2026-05-01",
      cycleStartDate: "2026-04-01",
      cycleEndDate: "2026-04-30",
      rows: [{ amountPaise: 50000, direction: "debit", kindHint: "purchase" }],
    };
    const mutationId = "statement-card:retry";
    expect(rememberServerCommittedStatement({
      mutationId,
      userId: "u1",
      result: { importSourceId: "src-1", matchIds: ["match-1"], imported: 1, duplicates: 0, skipped: 0, transactionIds: ["txn-posted"] },
      card,
    }).state).toBe("SERVER_COMMITTED");
    let attempts = 0;
    const remote = new Map<string, CardStatement>();
    const run = () => applyStatementLocalCopy({
      mutationId,
      activeUserId: () => "u1",
      db,
      loadImportSource: async () => source("src-1"),
      loadReconciliationMatches: async () => [match("match-1")],
      publishStatement: async (row) => { remote.set(row.id, row); },
      runLocal: async (database, rows) => {
        attempts += 1;
        await database.transaction("rw", [database.importSources, database.reconciliationMatches, database.cardStatements], async () => {
          if (rows.source) await database.importSources.put(rows.source);
          if (rows.matches.length) await database.reconciliationMatches.bulkPut(rows.matches);
          if (rows.statement) await database.cardStatements.put(rows.statement);
          if (attempts === 1) throw new Error("dexie abort");
        });
      },
    });
    await expect(run()).rejects.toThrow(/dexie abort/);
    expect(readStatementLocalApply(mutationId)?.state).toBe("LOCAL_APPLY_PENDING");
    expect(await db.importSources.count()).toBe(0);
    expect(await db.cardStatements.count()).toBe(0);
    expect(await db.transactions.count()).toBe(1);
    const applied = await run();
    expect(applied.state).toBe("LOCAL_APPLIED");
    expect(applied.statementId).toBe(stableCardStatementId("u1", card));
    expect(attempts).toBe(2);
    expect(await db.transactions.count()).toBe(1);
    expect((await db.transactions.get("txn-posted"))?.amountPaise).toBe(50000);
    expect(await db.importSources.count()).toBe(1);
    expect(await db.reconciliationMatches.count()).toBe(1);
    expect(await db.cardStatements.count()).toBe(1);
    const seen = await readCommittedCardStatement({
      userId: "u1",
      statementId: applied.statementId ?? "",
      loadRemote: async (id) => remote.get(id),
    });
    expect(seen?.closingBalancePaise).toBe(62000);
    expect(JSON.stringify(seen)).not.toMatch(/pdf|password/i);
    const href = statementReceiptHref("transactions", { transactionIds: ["txn-posted"] });
    expect(statementReceiptQuery(href.slice(href.indexOf("?"))).transactionIds).toEqual(["txn-posted"]);
    const longIds = Array.from({ length: 41 }, (_, index) => `txn-${index}`);
    const sourceHref = statementReceiptHref("transactions", { transactionIds: longIds, importSourceId: "stmtsrc_batch" });
    expect(sourceHref).toContain("statementSource=stmtsrc_batch");
    expect(sourceHref).not.toContain("txn-40");
    expect(statementReceiptQuery(sourceHref.slice(sourceHref.indexOf("?"))).importSourceId).toBe("stmtsrc_batch");
    expect(statementReceiptHref("reconciliation", { matchIds: ["match-1"] })).toContain("statementMatch=");
    expect(statementReceiptHref("cards", { cardId: "card-1" })).toContain("statementCard=card-1");
    const replay = await applyStatementLocalCopy({
      mutationId,
      activeUserId: () => "u1",
      db,
      publishStatement: async () => { throw new Error("should not publish again"); },
    });
    expect(replay.state).toBe("LOCAL_APPLIED");
    expect(await db.transactions.count()).toBe(1);
  });

  it("stores the import command before a response exists and refuses another user's record", () => {
    resetSyncOutboxForTests();
    const stored = rememberStatementCommand({
      mutationId: "statement:abc",
      userId: "u1",
      endpoint: "/api/import/statement.php",
      body: "{\"mutationId\":\"statement:abc\"}",
      card: null,
    });
    expect(stored.state).toBe("DELIVERY_UNKNOWN");
    expect(readStatementLocalApply("statement:abc")?.requestBody).toContain("statement:abc");
    expect(() => rememberStatementCommand({
      mutationId: "statement:abc",
      userId: "u2",
      endpoint: "/api/import/statement.php",
      body: "{\"mutationId\":\"statement:abc\"}",
      card: null,
    })).toThrow(/original account/);
  });
});

function reviewedDecision(kind: StatementDecision["kind"]): StatementDecision {
  return {
    include: true,
    reviewed: true,
    kind,
    categoryId: "cat",
    scope: "personal",
    counterpartId: "",
    reason: "oracle",
    duplicate: null,
  };
}

function statementRow(id: string, date: string, debitPaise: number, creditPaise: number, balancePaise: number, description: string): StatementRow {
  return {
    id,
    page: 1,
    y: 0,
    date,
    description,
    reference: "",
    debitPaise,
    creditPaise,
    balancePaise,
    issues: [],
  };
}

describe("independent synthetic oracles A–C", () => {
  it("counts the bank import reference without treating every credit as income", () => {
    const openingBankPaise = 1_000_000;
    const openingCardLiabilityPaise = 100_000;
    const openingReceivablePaise = 40_000;
    const rows = [
      statementRow("b1", "2026-09-29", 0, 500_000, 1_500_000, "confirmed_salary"),
      statementRow("b2", "2026-09-29", 45_000, 0, 1_455_000, "grocery_expense"),
      statementRow("b3", "2026-09-30", 100_000, 0, 1_355_000, "card_repayment"),
      statementRow("b4", "2026-09-30", 0, 40_000, 1_395_000, "receivable_collection"),
    ];
    const source = sourceDocumentStats("bank-import-reference", rows);
    expect(source.transactionCount).toBe(4);
    expect(source.creditCount).toBe(2);
    expect(source.debitCount).toBe(2);
    expect(source.creditPaise).toBe(540_000);
    expect(source.debitPaise).toBe(145_000);

    const verifierRows: StatementSourceRowInput[] = rows.map((row) => ({
      id: row.id,
      bookingDate: row.date,
      debitPaise: row.debitPaise,
      creditPaise: row.creditPaise,
      balancePaise: row.balancePaise,
    }));
    const arithmetic = validateStatementArithmetic(verifierRows, openingBankPaise, 1_395_000);
    expect(arithmetic.status).toBe("matched");
    expect(arithmetic.closingPaise).toBe(1_395_000);
    expect(arithmetic.totalCreditPaise).toBe(540_000);
    expect(arithmetic.totalDebitPaise).toBe(145_000);

    const movement = reportBankStatementMonths(verifierRows, { periodStart: "2026-09-29", periodEnd: "2026-09-30" });
    expect(movement).toHaveLength(1);
    expect(movement[0]?.coverage).toBe("partial_month");
    expect(movement[0]?.creditCount).toBe(2);
    expect(movement[0]?.debitCount).toBe(2);

    const meaning = reportEconomicMonth(rows, {
      b1: reviewedDecision("income"),
      b2: reviewedDecision("expense"),
      b3: reviewedDecision("cc_payment"),
      b4: reviewedDecision("transfer"),
    });
    expect(meaning).toHaveLength(1);
    expect(meaning[0]?.incomePaise).toBe(500_000);
    expect(meaning[0]?.expensePaise).toBe(45_000);
    expect(meaning[0]?.ccPaymentPaise).toBe(100_000);
    expect(meaning[0]?.transferPaise).toBe(40_000);
    expect(meaning[0]?.bankCreditPaise).toBe(540_000);
    expect(meaning[0]?.bankDebitPaise).toBe(145_000);

    const closingCardLiabilityPaise = openingCardLiabilityPaise - (meaning[0]?.ccPaymentPaise ?? 0);
    const closingReceivablePaise = openingReceivablePaise - (meaning[0]?.transferPaise ?? 0);
    expect(closingCardLiabilityPaise).toBe(0);
    expect(closingReceivablePaise).toBe(0);
    const openingNetPaise = openingBankPaise - openingCardLiabilityPaise + openingReceivablePaise;
    const closingNetPaise = (arithmetic.closingPaise ?? 0) - closingCardLiabilityPaise + closingReceivablePaise;
    expect(closingNetPaise - openingNetPaise).toBe(455_000);
    expect((meaning[0]?.incomePaise ?? 0) - (meaning[0]?.expensePaise ?? 0)).toBe(455_000);
  });

  it("keeps unobserved card interest null and distinct from a printed zero", () => {
    const previousBalancePaise = 200_000;
    const purchasesPaise = 300_000;
    const paymentsPaise = 100_000;
    const refundsPaise = 50_000;
    const expectedClosingPaise = previousBalancePaise + purchasesPaise - paymentsPaise - refundsPaise;
    expect(expectedClosingPaise).toBe(350_000);
    const built = buildReviewedCardStatement({
      cardId: "card-oracle",
      openingBalancePaise: previousBalancePaise,
      closingBalancePaise: expectedClosingPaise,
      statementDate: "2026-10-01",
      cycleStartDate: "2026-09-01",
      cycleEndDate: "2026-09-30",
      rows: [
        { amountPaise: purchasesPaise, direction: "debit", kindHint: "purchase" },
        { amountPaise: paymentsPaise, direction: "credit", kindHint: "payment" },
        { amountPaise: refundsPaise, direction: "credit", kindHint: "refund" },
      ],
    });
    expect(built.closingBalancePaise).toBe(350_000);
    expect(built.retailSpendPaise).toBe(purchasesPaise);
    expect(built.paymentsPaise).toBe(paymentsPaise);
    expect(built.creditsPaise).toBe(refundsPaise);
    expect(built.interestPaise).toBeNull();
    expect(built.interestEvidence).toBe("not_observed");
    expect(built.feesPaise).toBeNull();
    expect(built.feesEvidence).toBe("not_observed");
    expect(built.minimumDuePaise).toBeNull();
    expect(built.minimumDueEvidence).toBe("not_observed");
    const interest = readCardMoneyFact(built as CardStatement, "interest");
    expect(interest).toMatchObject({ valuePaise: null, evidence: "not_observed" });
    expect(formatCardMoneyFact(interest, (paise) => String(paise))).toBe("Unknown");
    expect(normalizeCardMoneyWrite(0, "source_observed", "interest")).toEqual({
      valuePaise: 0,
      evidence: "source_observed",
    });
    expect(normalizeCardMoneyWrite(null, "not_observed", "interest")).toEqual({
      valuePaise: null,
      evidence: "not_observed",
    });
  });

  it("rejects an omitted offsetting pair even when the closing balance still matches", () => {
    const openingPaise = 1_000_000;
    const closingPaise = 1_095_000;
    const rows: StatementSourceRowInput[] = [
      { id: "o1", bookingDate: "2026-09-29", debitPaise: 10_000, creditPaise: 0, balancePaise: 990_000 },
      { id: "o2", bookingDate: "2026-09-29", debitPaise: 0, creditPaise: 10_000, balancePaise: 1_000_000 },
      { id: "o3", bookingDate: "2026-09-30", debitPaise: 5_000, creditPaise: 0, balancePaise: 995_000 },
      { id: "o4", bookingDate: "2026-09-30", debitPaise: 0, creditPaise: 100_000, balancePaise: closingPaise },
    ];
    const evidence = {
      printedDebitCount: 2,
      printedCreditCount: 2,
      printedGrossDebitPaise: 15_000,
      printedGrossCreditPaise: 110_000,
      expectedTransactionCount: 4,
    };
    expect(validateStatementCompleteness(rows, evidence).status).toBe("complete");
    expect(validateStatementArithmetic(rows, openingPaise, closingPaise).status).toBe("matched");

    const omitted = rows.filter((row) => row.id !== "o1" && row.id !== "o2");
    const arithmetic = validateStatementArithmetic(omitted, openingPaise, closingPaise);
    expect(arithmetic.status).toBe("matched");
    expect(arithmetic.closingPaise).toBe(closingPaise);
    expect(arithmetic.totalDebitPaise).toBe(5_000);
    expect(arithmetic.totalCreditPaise).toBe(100_000);

    const completeness = validateStatementCompleteness(omitted, evidence);
    expect(completeness.status).toBe("incomplete");
    expect(completeness.checks.printedDebitCount).toBe("fail");
    expect(completeness.checks.printedCreditCount).toBe("fail");
    expect(completeness.checks.printedGrossDebit).toBe("fail");
    expect(completeness.checks.printedGrossCredit).toBe("fail");
    expect(completeness.checks.offsettingOmissionGuard).toBe("fail");
  });
});
