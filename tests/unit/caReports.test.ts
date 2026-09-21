import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  buildCAReportBundle,
  buildReportFooter,
  reportBusinessExpense,
  reportCardLedger,
  reportCategoryLedger,
  reportAccountReconciliation,
  reportInterestPaid,
  reportMonthlyCashflow,
  reportPersonalExpense,
  reportDebtSummary,
  reportGstMissingBill,
  reportReceivablePayableSummary,
  reportTransactionMaster,
  type ReportContext,
} from "@/services/caReports";
import { buildCAWorkbook } from "@/exports/xlsxExporter";
import type {
  Account,
  Card,
  Category,
  FinancialEffect,
  FinancialEvent,
  Loan,
  Transaction,
  UdhariRecord,
} from "@/types";

const base = {
  userId: "user_abcdef123456",
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
  isDeleted: 0,
  version: 1,
  tags: [],
  notes: "",
} as const;

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    ...base,
    id: "txn_1",
    date: "2026-05-10",
    type: "expense",
    amount: 0,
    amountPaise: 100000,
    categoryId: "cat_food",
    accountId: "acc_bank",
    paymentMode: "upi",
    merchantOrPerson: "Vendor",
    description: "Office groceries",
    billAvailable: 0,
    gstApplicable: 1,
    taxFlag: 1,
    businessOrPersonal: "mixed",
    needWant: "need",
    fixedVariable: "variable",
    plannedUnplanned: "planned",
    ...overrides,
  };
}

const account: Account = {
  ...base,
  id: "acc_bank",
  name: "Bank",
  type: "bank",
  openingBalance: 0,
  openingBalancePaise: 500000,
  color: "#0ea5e9",
  icon: "bank",
  isInactive: 0,
};

const category: Category = {
  ...base,
  id: "cat_food",
  name: "Food",
  parentId: null,
  appliesTo: "expense",
  icon: "tag",
  color: "#f97316",
  budgetable: 1,
  taxRelevant: 1,
  gstRelevant: 1,
  sortOrder: 1,
  archived: 0,
};

const event: FinancialEvent = {
  id: "evt_1",
  userId: base.userId,
  sourceTransactionId: "txn_1",
  eventType: "expense_upi",
  eventDate: "2026-05-10",
  amountPaise: 100000,
  currency: "INR",
  description: "Office groceries",
  source: "transaction",
  status: "posted",
  createdAt: base.createdAt,
  updatedAt: base.updatedAt,
};

const effects: FinancialEffect[] = [
  {
    id: "fx_cash",
    eventId: "evt_1",
    userId: base.userId,
    targetType: "account",
    targetId: "acc_bank",
    effectDirection: "decrease",
    amountPaise: 100000,
    component: "cash",
    createdAt: base.createdAt,
  },
  {
    id: "fx_expense",
    eventId: "evt_1",
    userId: base.userId,
    targetType: "expense_category",
    targetId: "cat_food",
    effectDirection: "increase",
    amountPaise: 100000,
    component: "expense",
    createdAt: base.createdAt,
  },
];

function eventFor(overrides: Partial<FinancialEvent>): FinancialEvent {
  return {
    ...event,
    id: overrides.id ?? "evt_extra",
    sourceTransactionId: overrides.sourceTransactionId ?? "txn_extra",
    eventType: overrides.eventType ?? "expense_upi",
    eventDate: overrides.eventDate ?? "2026-05-10",
    amountPaise: overrides.amountPaise ?? 0,
    description: overrides.description ?? "",
    status: overrides.status ?? "posted",
    ...overrides,
  };
}

function effectFor(overrides: Partial<FinancialEffect>): FinancialEffect {
  return {
    id: overrides.id ?? "fx_extra",
    eventId: overrides.eventId ?? "evt_extra",
    userId: base.userId,
    targetType: overrides.targetType ?? "account",
    targetId: overrides.targetId ?? "acc_bank",
    effectDirection: overrides.effectDirection ?? "decrease",
    amountPaise: overrides.amountPaise ?? 0,
    component: overrides.component ?? "cash",
    createdAt: base.createdAt,
  };
}

function ctx(overrides: Partial<ReportContext> = {}): ReportContext {
  return {
    txs: [tx({ splitBusinessPaise: 70000 } as Partial<Transaction>)],
    events: [event],
    effects,
    accounts: [account],
    cards: [],
    loans: [],
    goals: [],
    udharis: [],
    categories: [category],
    ...overrides,
  };
}

describe("Phase 12 CA reports and micro-business mode", () => {
  it("contribution returns reduce personal report and exported cost summaries without income", () => {
    const meal = tx({ id: "meal", amount: 400, amountPaise: 40000, businessOrPersonal: "personal" });
    const returned = tx({ id: "returned", type: "refund", transactionIntent: "expense_contribution", linkedOriginalTransactionId: meal.id, amount: 200, amountPaise: 20000, businessOrPersonal: "personal", paymentMode: "bank_transfer", merchantOrPerson: "Friend" });
    const transactions = [meal, returned];
    expect(reportPersonalExpense(ctx({ txs: transactions })).totalPaise).toBe(20000);
    expect(reportBusinessExpense(ctx({ txs: transactions })).totalPaise).toBe(0);
    const { buffer } = buildCAWorkbook({ transactions, categories: [category], accounts: [account], cards: [], budgets: [], goals: [], goalContribs: [], loans: [], emis: [], udhari: [], investments: [], savingsContribs: [] }, "contribution-report");
    const workbook = XLSX.read(buffer, { type: "array" });
    expect(XLSX.utils.sheet_to_json(workbook.Sheets.Expense_By_Payment_Mode)).toEqual([{ PaymentMode: "UPI", Amount: 200 }]);
    expect(XLSX.utils.sheet_to_json(workbook.Sheets.Business_Personal_Split)).toEqual([{ Month: "2026-05", Business: 0, Personal: 200, Mixed: 0 }]);
  });
  it("builds transaction master rows with CA audit, tax/GST, split, and ledger references", () => {
    const rows = reportTransactionMaster(ctx());
    expect(rows[0]).toMatchObject({
      localDate: "2026-05-10",
      transactionId: "txn_1",
      eventId: "evt_1",
      voucherReferenceId: "txn_1",
      category: "Food",
      account: "Bank",
      merchantOrPerson: "Vendor",
      taxFlag: 1,
      gstFlag: 1,
      billAvailable: 0,
      businessOrPersonal: "mixed",
      splitBusinessPaise: 70000,
      splitPersonalPaise: 30000,
      reversedStatus: "posted",
    });
  });

  it("reports GST/tax rows missing bills", () => {
    const rows = reportGstMissingBill(ctx());
    expect(rows).toHaveLength(1);
    expect(rows[0].amountPaise).toBe(100000);
  });

  it("keeps business, personal, and mixed expense reports separated", () => {
    const reportCtx = ctx({
      txs: [
        tx({ id: "txn_business", amountPaise: 10000, businessOrPersonal: "business", taxFlag: 0, gstApplicable: 0 }),
        tx({ id: "txn_personal", amountPaise: 20000, businessOrPersonal: "personal", taxFlag: 0, gstApplicable: 0 }),
        tx({ id: "txn_mixed", amountPaise: 30000, businessOrPersonal: "mixed", splitBusinessPaise: 12000 } as Partial<Transaction>),
      ],
    });
    expect(reportBusinessExpense(reportCtx)).toMatchObject({ totalPaise: 22000, txs: 2 });
    expect(reportPersonalExpense(reportCtx)).toMatchObject({ totalPaise: 38000, txs: 2 });
  });

  it("keeps credit-card purchase in expense/card ledger and card payment out of expense", () => {
    const reportCtx = ctx({
      txs: [
        tx({
          id: "txn_card_buy",
          amountPaise: 45000,
          paymentMode: "credit_card",
          linkedCardId: "card_1",
          businessOrPersonal: "personal",
          taxFlag: 0,
          gstApplicable: 0,
        }),
        tx({
          id: "txn_card_pay",
          type: "cc_payment",
          amountPaise: 45000,
          paymentMode: "bank_transfer",
          accountId: "acc_bank",
          linkedCardId: "card_1",
          categoryId: undefined,
          businessOrPersonal: "personal",
          taxFlag: 0,
          gstApplicable: 0,
        }),
      ],
      events: [
        eventFor({ id: "evt_card_buy", sourceTransactionId: "txn_card_buy", eventType: "credit_card_purchase", amountPaise: 45000 }),
        eventFor({ id: "evt_card_pay", sourceTransactionId: "txn_card_pay", eventType: "credit_card_payment", amountPaise: 45000 }),
      ],
      effects: [
        effectFor({ id: "fx_card_expense", eventId: "evt_card_buy", targetType: "expense_category", targetId: "cat_food", effectDirection: "increase", component: "expense", amountPaise: 45000 }),
        effectFor({ id: "fx_card_liability", eventId: "evt_card_buy", targetType: "credit_card", targetId: "card_1", effectDirection: "increase", component: "liability", amountPaise: 45000 }),
        effectFor({ id: "fx_card_bank", eventId: "evt_card_pay", targetType: "account", targetId: "acc_bank", effectDirection: "decrease", component: "cash", amountPaise: 45000 }),
        effectFor({ id: "fx_card_payment", eventId: "evt_card_pay", targetType: "credit_card", targetId: "card_1", effectDirection: "decrease", component: "liability", amountPaise: 45000 }),
      ],
    });
    expect(reportCategoryLedger(reportCtx)[0]).toMatchObject({ totalExpensePaise: 45000, txCount: 1 });
    expect(reportCardLedger(reportCtx)[0]).toMatchObject({
      purchasesPaise: 45000,
      paymentsPaise: 45000,
      netOutstandingChangePaise: 0,
    });
    expect(reportMonthlyCashflow(reportCtx)[0]).toMatchObject({ outflowsPaise: 45000 });
  });

  it("reports EMI interest separately and principal as loan reduction, not expense", () => {
    const reportCtx = ctx({
      txs: [
        tx({
          id: "txn_emi",
          type: "emi_payment",
          amountPaise: 1000000,
          accountId: "acc_bank",
          linkedLoanId: "loan_1",
          categoryId: undefined,
          businessOrPersonal: "personal",
          taxFlag: 0,
          gstApplicable: 0,
        }),
      ],
      events: [
        eventFor({ id: "evt_emi", sourceTransactionId: "txn_emi", eventType: "emi_payment", amountPaise: 1000000 }),
      ],
      effects: [
        effectFor({ id: "fx_emi_cash", eventId: "evt_emi", targetType: "account", targetId: "acc_bank", effectDirection: "decrease", component: "cash", amountPaise: 1000000 }),
        effectFor({ id: "fx_emi_principal", eventId: "evt_emi", targetType: "loan", targetId: "loan_1", effectDirection: "decrease", component: "principal", amountPaise: 700000 }),
        effectFor({ id: "fx_emi_interest", eventId: "evt_emi", targetType: "expense_category", targetId: "loan_1", effectDirection: "increase", component: "interest", amountPaise: 300000 }),
      ],
    });
    expect(reportInterestPaid(reportCtx)[0]).toMatchObject({
      loanId: "loan_1",
      totalInterestPaise: 300000,
      totalPrincipalPaise: 700000,
    });
    expect(reportCategoryLedger(reportCtx)[0]).toMatchObject({
      categoryId: "loan_1",
      totalExpensePaise: 300000,
      txCount: 1,
    });
  });

  it("puts udhari given into receivable summary", () => {
    const udhari = {
      ...base,
      id: "udh_recv",
      personName: "Rahul",
      type: "receivable",
      amount: 0,
      amountPaise: 100000,
      amountSettled: 0,
      amountSettledPaise: 40000,
      givenDate: "2026-05-01",
      status: "partial",
      reminderOn: 1,
      context: "friend",
    } as UdhariRecord;
    expect(reportReceivablePayableSummary(ctx({ udharis: [udhari] }))).toMatchObject({
      receivablePaise: 60000,
      payablePaise: 0,
      netReceivablePaise: 60000,
    });
  });

  it("reconciles account opening plus ledger inflows/outflows to closing balance", () => {
    const rows = reportAccountReconciliation(ctx());
    expect(rows[0]).toMatchObject({
      openingBalancePaise: 500000,
      inflowsPaise: 0,
      outflowsPaise: 100000,
      calculatedClosingBalancePaise: 400000,
      reportedClosingBalancePaise: 400000,
      mismatchPaise: 0,
      status: "matched",
    });
  });

  it("summarizes cards, loans, and udhari debt plus receivable/payable", () => {
    const card = {
      ...base,
      id: "card_1",
      nickname: "HDFC",
      bank: "HDFC",
      last4: "1234",
      type: "credit",
      creditLimit: 0,
      creditLimitPaise: 5000000,
      color: "#111827",
      isInactive: 0,
      outstandingPaise: 250000,
    } as Card & { outstandingPaise: number };
    const loan = {
      ...base,
      id: "loan_1",
      lender: "Bank",
      loanType: "personal",
      principal: 0,
      principalPaise: 1000000,
      outstandingPrincipalPaise: 800000,
      startDate: "2026-01-01",
      tenureMonths: 12,
      annualInterestRate: 12,
      emiDueDay: 5,
      processingFee: 0,
      insuranceCost: 0,
      prepaymentAllowed: 1,
      status: "active",
    } as Loan;
    const udhari = {
      ...base,
      id: "udh_1",
      personName: "Amit",
      type: "payable",
      amount: 0,
      amountPaise: 100000,
      amountSettled: 0,
      amountSettledPaise: 25000,
      givenDate: "2026-05-01",
      status: "partial",
      reminderOn: 1,
      context: "friend",
    } as UdhariRecord;
    const reportCtx = ctx({ cards: [card], loans: [loan], udharis: [udhari] });
    expect(reportDebtSummary(reportCtx).totalDebtPaise).toBe(1125000);
    expect(reportReceivablePayableSummary(reportCtx)).toMatchObject({
      receivablePaise: 0,
      payablePaise: 75000,
      netReceivablePaise: -75000,
    });
  });

  it("builds the full CA report bundle with all required report sections and footer", () => {
    const reportCtx = ctx();
    const footer = buildReportFooter({
      ctx: reportCtx,
      userId: base.userId,
      generatedAt: "2026-05-14T00:00:00.000Z",
      reportPeriod: "2026-05",
      appVersion: "test",
    });
    const bundle = buildCAReportBundle(reportCtx, footer);
    expect(Object.keys(bundle)).toEqual(
      expect.arrayContaining([
        "transactionMaster",
        "monthlyCashflow",
        "categoryLedger",
        "accountLedger",
        "creditCardLedger",
        "loanAmortization",
        "interestPaidSummary",
        "udhariAgeing",
        "businessExpense",
        "personalExpense",
        "gstMissingBill",
        "taxFlag",
        "netWorth",
        "debtSummary",
        "receivablePayableSummary",
        "accountReconciliation",
        "footer",
      ]),
    );
    expect(bundle.footer).toMatchObject({
      reportPeriod: "2026-05",
      maskedUserId: "user***3456",
      dataSource: "ledger/effects",
      reconciliationStatus: "matched",
    });
  });

  it("exports CA workbook with reconciliation and export footer sheets", () => {
    const { buffer } = buildCAWorkbook(
      {
        transactions: ctx().txs,
        categories: [category],
        accounts: [account],
        cards: [],
        budgets: [],
        goals: [],
        goalContribs: [],
        loans: [],
        emis: [],
        udhari: [],
        investments: [],
        savingsContribs: [],
        events: [event],
        effects,
        userId: base.userId,
        reportPeriod: "2026-05",
      },
      "test_ca",
    );
    const workbook = XLSX.read(buffer, { type: "array" });
    expect(workbook.SheetNames).toContain("Account_Reconciliation");
    expect(workbook.SheetNames).toContain("Export_Footer");
  });
});
