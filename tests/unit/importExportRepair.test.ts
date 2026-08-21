import { describe, expect, it } from "vitest";
import {
  buildDataRepairQueue,
  buildImportPreview,
  buildImportRollbackPlan,
  createImportBatchRecord,
} from "@/services/importExportRepair";
import { buildUserOwnedFullExportPayload } from "@/services/exportSafety";
import type { Account, Card, Category, FinancialEffect, FinancialEvent, Loan, Transaction, UdhariRecord, User } from "@/types";

const base = {
  userId: "u1",
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
  isDeleted: 0,
  version: 1,
  tags: [],
  notes: "",
} as const;

const account: Account = { ...base, id: "acc1", name: "Bank", type: "bank", openingBalance: 0, color: "#111", icon: "bank", isInactive: 0 };
const category: Category = { ...base, id: "cat1", name: "Food", parentId: null, appliesTo: "expense", icon: "tag", color: "#f00", budgetable: 1, taxRelevant: 0, gstRelevant: 0, sortOrder: 1, archived: 0 };
const card: Card = { ...base, id: "card1", nickname: "HDFC", bank: "HDFC", last4: "1234", type: "credit", color: "#222", isInactive: 0 };
const loan: Loan = { ...base, id: "loan1", lender: "LoanCo", loanType: "personal", principal: 1000, startDate: "2026-01-01", tenureMonths: 12, annualInterestRate: 10, emiDueDay: 5, processingFee: 0, insuranceCost: 0, prepaymentAllowed: 1, status: "active" };
const udhari: UdhariRecord = { ...base, id: "udh1", personName: "Rahul", type: "receivable", amount: 100, amountSettled: 0, givenDate: "2026-05-01", status: "open", reminderOn: 1, context: "friend" };

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    ...base,
    id: "txn_existing",
    date: "2026-05-10T00:00:00.000Z",
    type: "expense",
    amount: 100,
    amountPaise: 10000,
    categoryId: "cat1",
    accountId: "acc1",
    paymentMode: "upi",
    merchantOrPerson: "Store",
    description: "",
    billAvailable: 0,
    gstApplicable: 0,
    taxFlag: 0,
    businessOrPersonal: "personal",
    needWant: "unassigned",
    fixedVariable: "unassigned",
    plannedUnplanned: "unassigned",
    ...overrides,
  };
}

describe("Phase 13 import/export repair", () => {
  it("builds import preview with counts, duplicates, missing refs, and estimated effects", () => {
    const preview = buildImportPreview(
      [
        { Date: "10/05/2026", Type: "expense", Amount: "100.00", Category: "Food", Account: "Bank", Merchant: "Store", PaymentMode: "UPI" },
        { Date: "11/05/2026", Type: "expense", Amount: "450", Category: "Food", Card: "HDFC", Merchant: "HDFC", PaymentMode: "Credit Card" },
        { Date: "12/05/2026", Type: "emi payment", Amount: "1000", Account: "Bank", Loan: "Missing", PaymentMode: "Bank" },
        { Date: "", Type: "expense", Amount: "abc", Category: "Food", Account: "Bank" },
      ],
      { date: "Date", type: "Type", amount: "Amount", category: "Category", account: "Account", card: "Card", loan: "Loan", merchantOrPerson: "Merchant", paymentMode: "PaymentMode" },
      {
        existingTransactions: [tx({})],
        categories: [category],
        accounts: [account],
        cards: [card],
        loans: [loan],
        udhari: [udhari],
      },
    );
    expect(preview.totalRows).toBe(4);
    expect(preview.validRows).toBe(2);
    expect(preview.invalidRows).toBe(2);
    expect(preview.duplicateCandidates).toBe(1);
    expect(preview.missingLoans).toEqual(["Missing"]);
    expect(preview.estimatedExpensePaise).toBe(55000);
    expect(preview.estimatedCardLiabilityChangePaise).toBe(45000);
    expect(preview.estimatedCashflowEffectPaise).toBe(-10000);
  });

  it("creates import batch records and rollback plans", () => {
    const preview = buildImportPreview(
      [{ Date: "2026-05-10", Type: "income", Amount: "100", Account: "Bank", PaymentMode: "Bank" }],
      { date: "Date", type: "Type", amount: "Amount", account: "Account", paymentMode: "PaymentMode" },
      { existingTransactions: [], categories: [category], accounts: [account], cards: [], loans: [], udhari: [] },
    );
    const batch = createImportBatchRecord({
      importBatchId: "imp_1",
      preview,
      importedRowIds: ["txn_1"],
      createdEventIds: ["evt_1"],
      createdEffectIds: ["fx_1"],
      auditLogId: "aud_1",
      createdAt: "2026-05-14T00:00:00.000Z",
    });
    expect(batch).toMatchObject({ importBatchId: "imp_1", rowCount: 1, importedRowIds: ["txn_1"] });
    expect(buildImportRollbackPlan(batch)).toEqual({
      importBatchId: "imp_1",
      transactionIdsToSoftDelete: ["txn_1"],
      eventIdsToReverse: ["evt_1"],
      effectIdsToMarkReversed: ["fx_1"],
      auditAction: "import_rollback",
    });
  });

  it("builds repair queues for ledger gaps and legacy data", () => {
    const event: FinancialEvent = {
      id: "evt_orphan",
      userId: "u1",
      sourceTransactionId: "txn_missing",
      eventType: "expense",
      eventDate: "2026-05-10",
      amountPaise: 100,
      currency: "INR",
      description: "",
      source: "transaction",
      status: "posted",
      createdAt: base.createdAt,
      updatedAt: base.updatedAt,
    };
    const effect: FinancialEffect = {
      id: "fx_bad",
      eventId: "evt_orphan",
      userId: "u1",
      targetType: "account",
      targetId: "missing_acc",
      effectDirection: "decrease",
      amountPaise: 100,
      component: "cash",
      createdAt: base.createdAt,
    };
    const queue = buildDataRepairQueue({
      userId: "u1",
      transactions: [
        tx({ id: "txn_no_event" }),
        tx({ id: "txn_card_no_card", paymentMode: "credit_card", linkedCardId: undefined }),
        tx({ id: "txn_emi_no_loan", type: "emi_payment", linkedLoanId: undefined }),
        tx({ id: "txn_udhari_no_person", type: "udhari_given", linkedUdhariId: undefined }),
        tx({ id: "txn_legacy", amountPaise: undefined }),
      ],
      events: [event],
      effects: [effect],
      accounts: [account],
      cards: [card],
      loans: [loan],
      goals: [],
      investments: [],
      udhari: [udhari],
      categories: [
        category,
        { ...category, id: "cat2", name: "Food" },
        { ...category, id: "cat3", name: "No Color", color: "" },
      ],
    });
    expect(queue.transactionsWithoutLedgerEvent).toEqual(expect.arrayContaining(["txn_no_event"]));
    expect(queue.creditCardTransactionsWithoutCard).toEqual(["txn_card_no_card"]);
    expect(queue.emiTransactionsWithoutLoan).toEqual(["txn_emi_no_loan"]);
    expect(queue.udhariEntriesWithoutPerson).toEqual(["txn_udhari_no_person"]);
    expect(queue.legacyAmountWithoutAmountPaise).toEqual(["txn_legacy"]);
    expect(queue.categoriesMissingColor).toEqual(["cat3"]);
    expect(queue.duplicateCategories[0]).toMatchObject({ normalizedName: "food", ids: ["cat1", "cat2"] });
  });

  it("builds full export payload with current user-owned rows only", () => {
    const user = {
      id: "u1",
      username: "devpatel",
      displayName: "Dev Patel",
    } as Pick<User, "id" | "username" | "displayName">;
    const otherAccount = { ...account, id: "acc_other", userId: "u2", name: "Other Bank" };
    const otherTx = tx({ id: "txn_other", userId: "u2", accountId: "acc_other" });
    const payload = buildUserOwnedFullExportPayload(
      user,
      {
        settings: {},
        accounts: [account, otherAccount],
        cards: [card],
        categories: [category],
        transactions: [tx({ id: "txn_own" }), otherTx],
        budgets: [],
        goals: [],
        goalContribs: [],
        loans: [loan],
        emis: [],
        udhari: [udhari],
        udhariSettlements: [],
        investments: [],
        savingsContribs: [],
        reminders: [],
        recurringRules: [],
      },
      "2026-05-15T00:00:00.000Z",
    );
    expect(payload.user.username).toBe("devpatel");
    expect(payload.collections.accounts.map((row) => row.id)).toEqual(["acc1"]);
    expect(payload.collections.transactions.map((row) => row.id)).toEqual(["txn_own"]);
  });
});
