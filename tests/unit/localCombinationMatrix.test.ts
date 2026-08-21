import { describe, expect, it } from "vitest";
import {
  buildFinanceEventBuilderContext,
  buildLedgerForTransaction,
} from "@/services/financeEventBuilder";
import { getTransactionFormPhase6Errors } from "@/services/transactionFormRules";
import { buildTransactionPreview } from "@/services/transactionPreview";
import type {
  Account,
  Card,
  Category,
  EMIPayment,
  FinancialEffect,
  FinancialEffectComponent,
  FinancialEffectDirection,
  FinancialEffectTargetType,
  Goal,
  Loan,
  PaymentMode,
  Transaction,
  TransactionType,
  UdhariRecord,
} from "@/types";

const now = "2026-05-22T00:00:00.000Z";
const userId = "matrix_user";

const category = (id: string, kind: Category["kind"], name: string): Category => ({
  id,
  userId,
  name,
  kind,
  parentId: undefined,
  color: "#0ea5e9",
  emoji: "M",
  isCustom: 1,
  isDeleted: 0,
  createdAt: now,
  updatedAt: now,
  taxRelevant: 0,
  gstRelevant: 0,
} as Category);

const account = (id: string, name: string, openingBalancePaise: number): Account => ({
  id,
  userId,
  name,
  type: "bank",
  openingBalance: openingBalancePaise / 100,
  openingBalancePaise,
  color: "#0f172a",
  icon: "bank",
  isInactive: 0,
  isDeleted: 0,
  createdAt: now,
  updatedAt: now,
});

const card = (): Card => ({
  id: "card_hdfc",
  userId,
  nickname: "HDFC Card",
  bank: "HDFC",
  last4: "1234",
  type: "credit",
  creditLimit: 50000,
  creditLimitPaise: 5000000,
  currentOutstandingPaise: 4200000,
  color: "#111827",
  isInactive: 0,
  isDeleted: 0,
  createdAt: now,
  updatedAt: now,
});

const loan = (): Loan => ({
  id: "loan_personal",
  userId,
  lender: "Personal Loan",
  loanType: "personal",
  principal: 500000,
  principalPaise: 50000000,
  startDate: "2025-01-01T00:00:00.000Z",
  tenureMonths: 60,
  annualInterestRate: 12,
  emiDueDay: 5,
  outstandingPrincipal: 450000,
  outstandingPrincipalPaise: 45000000,
  processingFee: 0,
  insuranceCost: 0,
  prepaymentAllowed: 1,
  status: "active",
  isDeleted: 0,
  createdAt: now,
  updatedAt: now,
});

const goal = (): Goal => ({
  id: "goal_emergency",
  userId,
  title: "Emergency Fund",
  goalType: "emergency",
  targetAmount: 60000,
  targetAmountPaise: 6000000,
  targetDate: "2027-05-22T00:00:00.000Z",
  startedAt: "2026-05-22T00:00:00.000Z",
  currentSaved: 12000,
  savedAmountPaise: 1200000,
  priority: 1,
  icon: "shield",
  color: "#0ea5e9",
  status: "active",
  isDeleted: 0,
  createdAt: now,
  updatedAt: now,
});

const udhari = (id: string, personName: string, type: "receivable" | "payable"): UdhariRecord => ({
  id,
  userId,
  personName,
  type,
  amount: 1000,
  amountPaise: 100000,
  givenDate: "2026-05-01T00:00:00.000Z",
  status: "open",
  amountSettled: 0,
  amountSettledPaise: 0,
  reminderOn: 0,
  context: "friend",
  isDeleted: 0,
  createdAt: now,
  updatedAt: now,
});

const categories = [
  category("cat_food", "expense", "Food"),
  category("cat_salary", "income", "Salary"),
  category("cat_bad_debt", "expense", "Bad debt"),
  category("cat_loan_interest", "expense", "Loan interest"),
];

const emi: EMIPayment = {
  id: "emi_matrix",
  userId,
  loanId: "loan_personal",
  transactionId: "tx_emi_payment",
  dueDate: "2026-05-05T00:00:00.000Z",
  amountDue: 10000,
  amountPaise: 1000000,
  amountPaid: 10000,
  amountPaidPaise: 1000000,
  principalComponent: 7000,
  principalComponentPaise: 700000,
  interestComponent: 3000,
  interestComponentPaise: 300000,
  status: "paid",
  isDeleted: 0,
  createdAt: now,
  updatedAt: now,
} as EMIPayment;

const previewContext = {
  userId,
  draftTransactionId: "draft_matrix",
  accounts: [account("acc_bank", "SBI Bank", 5000000), account("acc_cash", "Cash Wallet", 500000)],
  cards: [card()],
  loans: [loan()],
  goals: [goal()],
  investments: [],
  udhari: [udhari("udh_rahul", "Rahul", "receivable"), udhari("udh_amit", "Amit", "payable")],
  categories,
  emis: [emi],
  transactions: [] as Transaction[],
};

type ExpectedEffect = {
  targetType: FinancialEffectTargetType;
  targetId?: string;
  effectDirection: FinancialEffectDirection;
  component: FinancialEffectComponent;
  amountPaise: number;
};

type MatrixCase = {
  name: string;
  type: TransactionType;
  paymentMode: PaymentMode;
  amountPaise: number;
  fields: Partial<Transaction>;
  expectedEventType: string;
  requiredFields: string[];
  invalidWhenMissing?: string[];
  expectedEffects: ExpectedEffect[];
  forbiddenComponents?: FinancialEffectComponent[];
  forbiddenTargetTypes?: FinancialEffectTargetType[];
  previewMustContain: string[];
};

const cases: MatrixCase[] = [
  {
    name: "UPI expense",
    type: "expense",
    paymentMode: "upi",
    amountPaise: 45000,
    fields: { accountId: "acc_bank", categoryId: "cat_food" },
    expectedEventType: "expense",
    requiredFields: ["accountId", "categoryId"],
    invalidWhenMissing: ["accountId", "categoryId"],
    expectedEffects: [
      { targetType: "account", targetId: "acc_bank", effectDirection: "decrease", component: "cash", amountPaise: 45000 },
      { targetType: "expense_category", targetId: "cat_food", effectDirection: "increase", component: "expense", amountPaise: 45000 },
    ],
    forbiddenComponents: ["income", "liability"],
    previewMustContain: ["Cash outflow", "spending increases"],
  },
  {
    name: "cash expense",
    type: "expense",
    paymentMode: "cash",
    amountPaise: 12500,
    fields: { accountId: "acc_cash", categoryId: "cat_food" },
    expectedEventType: "expense",
    requiredFields: ["accountId", "categoryId"],
    invalidWhenMissing: ["accountId", "categoryId"],
    expectedEffects: [
      { targetType: "account", targetId: "acc_cash", effectDirection: "decrease", component: "cash", amountPaise: 12500 },
      { targetType: "expense_category", targetId: "cat_food", effectDirection: "increase", component: "expense", amountPaise: 12500 },
    ],
    forbiddenComponents: ["income", "liability"],
    previewMustContain: ["Cash outflow", "expense category expense"],
  },
  {
    name: "debit card expense",
    type: "expense",
    paymentMode: "debit_card",
    amountPaise: 9999,
    fields: { accountId: "acc_bank", categoryId: "cat_food" },
    expectedEventType: "expense",
    requiredFields: ["accountId", "categoryId"],
    invalidWhenMissing: ["accountId", "categoryId"],
    expectedEffects: [
      { targetType: "account", targetId: "acc_bank", effectDirection: "decrease", component: "cash", amountPaise: 9999 },
      { targetType: "expense_category", targetId: "cat_food", effectDirection: "increase", component: "expense", amountPaise: 9999 },
    ],
    forbiddenComponents: ["income", "liability"],
    previewMustContain: ["Cash outflow"],
  },
  {
    name: "auto debit expense",
    type: "expense",
    paymentMode: "auto_debit",
    amountPaise: 150000,
    fields: { accountId: "acc_bank", categoryId: "cat_food" },
    expectedEventType: "expense",
    requiredFields: ["accountId", "categoryId"],
    invalidWhenMissing: ["accountId", "categoryId"],
    expectedEffects: [
      { targetType: "account", targetId: "acc_bank", effectDirection: "decrease", component: "cash", amountPaise: 150000 },
      { targetType: "expense_category", targetId: "cat_food", effectDirection: "increase", component: "expense", amountPaise: 150000 },
    ],
    forbiddenComponents: ["income", "liability"],
    previewMustContain: ["Cash outflow"],
  },
  {
    name: "credit-card purchase",
    type: "expense",
    paymentMode: "credit_card",
    amountPaise: 1000000,
    fields: { linkedCardId: "card_hdfc", categoryId: "cat_food", accountId: undefined },
    expectedEventType: "credit_card_purchase",
    requiredFields: ["linkedCardId", "categoryId"],
    invalidWhenMissing: ["linkedCardId", "categoryId"],
    expectedEffects: [
      { targetType: "credit_card", targetId: "card_hdfc", effectDirection: "increase", component: "liability", amountPaise: 1000000 },
      { targetType: "expense_category", targetId: "cat_food", effectDirection: "increase", component: "expense", amountPaise: 1000000 },
    ],
    forbiddenTargetTypes: ["account"],
    forbiddenComponents: ["income"],
    previewMustContain: ["Bank balance will not change today", "Available limit"],
  },
  {
    name: "card bill payment",
    type: "cc_payment",
    paymentMode: "bank_transfer",
    amountPaise: 700000,
    fields: { accountId: "acc_bank", linkedCardId: "card_hdfc" },
    expectedEventType: "credit_card_payment",
    requiredFields: ["accountId", "linkedCardId"],
    invalidWhenMissing: ["accountId", "linkedCardId"],
    expectedEffects: [
      { targetType: "account", targetId: "acc_bank", effectDirection: "decrease", component: "cash", amountPaise: 700000 },
      { targetType: "credit_card", targetId: "card_hdfc", effectDirection: "decrease", component: "liability", amountPaise: 700000 },
    ],
    forbiddenComponents: ["expense", "income"],
    previewMustContain: ["not a new expense", "card liability decreases"],
  },
  {
    name: "card refund",
    type: "refund",
    paymentMode: "credit_card",
    amountPaise: 200000,
    fields: { linkedCardId: "card_hdfc", categoryId: "cat_food", accountId: undefined },
    expectedEventType: "refund",
    requiredFields: ["linkedCardId", "categoryId"],
    invalidWhenMissing: ["linkedCardId", "categoryId"],
    expectedEffects: [
      { targetType: "credit_card", targetId: "card_hdfc", effectDirection: "decrease", component: "liability", amountPaise: 200000 },
      { targetType: "expense_category", targetId: "cat_food", effectDirection: "decrease", component: "expense", amountPaise: 200000 },
    ],
    forbiddenComponents: ["income", "cash"],
    previewMustContain: ["card liability: -", "expense category expense: -"],
  },
  {
    name: "bank refund",
    type: "refund",
    paymentMode: "upi",
    amountPaise: 15000,
    fields: { accountId: "acc_bank", categoryId: "cat_food" },
    expectedEventType: "refund",
    requiredFields: ["accountId", "categoryId"],
    invalidWhenMissing: ["accountId", "categoryId"],
    expectedEffects: [
      { targetType: "account", targetId: "acc_bank", effectDirection: "increase", component: "cash", amountPaise: 15000 },
      { targetType: "expense_category", targetId: "cat_food", effectDirection: "decrease", component: "expense", amountPaise: 15000 },
    ],
    forbiddenComponents: ["income", "liability"],
    previewMustContain: ["account cash: +", "expense category expense: -"],
  },
  {
    name: "salary income",
    type: "income",
    paymentMode: "bank_transfer",
    amountPaise: 7500000,
    fields: { accountId: "acc_bank", categoryId: "cat_salary" },
    expectedEventType: "income",
    requiredFields: ["accountId", "categoryId"],
    invalidWhenMissing: ["accountId", "categoryId"],
    expectedEffects: [
      { targetType: "account", targetId: "acc_bank", effectDirection: "increase", component: "cash", amountPaise: 7500000 },
      { targetType: "income_category", targetId: "cat_salary", effectDirection: "increase", component: "income", amountPaise: 7500000 },
    ],
    forbiddenComponents: ["expense", "liability"],
    previewMustContain: ["account cash: +", "income category income: +"],
  },
  {
    name: "EMI payment",
    type: "emi_payment",
    paymentMode: "bank_transfer",
    amountPaise: 1000000,
    fields: { id: "tx_emi_payment", accountId: "acc_bank", linkedLoanId: "loan_personal", categoryId: "cat_loan_interest" },
    expectedEventType: "emi_payment",
    requiredFields: ["accountId", "linkedLoanId"],
    invalidWhenMissing: ["accountId", "linkedLoanId"],
    expectedEffects: [
      { targetType: "account", targetId: "acc_bank", effectDirection: "decrease", component: "cash", amountPaise: 1000000 },
      { targetType: "loan", targetId: "loan_personal", effectDirection: "decrease", component: "principal", amountPaise: 700000 },
      { targetType: "expense_category", targetId: "cat_loan_interest", effectDirection: "increase", component: "interest", amountPaise: 300000 },
    ],
    forbiddenComponents: ["income"],
    previewMustContain: ["principal", "interest", "Remaining loan principal"],
  },
  {
    name: "loan prepayment",
    type: "loan_prepayment",
    paymentMode: "bank_transfer",
    amountPaise: 2000000,
    fields: { accountId: "acc_bank", linkedLoanId: "loan_personal" },
    expectedEventType: "loan_prepayment",
    requiredFields: ["accountId", "linkedLoanId"],
    invalidWhenMissing: ["accountId", "linkedLoanId"],
    expectedEffects: [
      { targetType: "account", targetId: "acc_bank", effectDirection: "decrease", component: "cash", amountPaise: 2000000 },
      { targetType: "loan", targetId: "loan_personal", effectDirection: "decrease", component: "principal", amountPaise: 2000000 },
    ],
    forbiddenComponents: ["expense", "income"],
    previewMustContain: ["loan principal: -"],
  },
  {
    name: "loan disbursement",
    type: "loan_disbursement",
    paymentMode: "bank_transfer",
    amountPaise: 50000000,
    fields: { accountId: "acc_bank", linkedLoanId: "loan_personal" },
    expectedEventType: "loan_disbursement",
    requiredFields: ["accountId", "linkedLoanId"],
    invalidWhenMissing: ["accountId", "linkedLoanId"],
    expectedEffects: [
      { targetType: "account", targetId: "acc_bank", effectDirection: "increase", component: "cash", amountPaise: 50000000 },
      { targetType: "loan", targetId: "loan_personal", effectDirection: "increase", component: "principal", amountPaise: 50000000 },
    ],
    forbiddenComponents: ["expense", "income"],
    previewMustContain: ["Loan liability also increases"],
  },
  {
    name: "udhari given",
    type: "udhari_given",
    paymentMode: "upi",
    amountPaise: 100000,
    fields: { accountId: "acc_bank", linkedUdhariId: "udh_rahul", merchantOrPerson: "Rahul" },
    expectedEventType: "udhari_given",
    requiredFields: ["accountId", "linkedUdhariId", "merchantOrPerson"],
    invalidWhenMissing: ["accountId", "linkedUdhariId", "merchantOrPerson"],
    expectedEffects: [
      { targetType: "account", targetId: "acc_bank", effectDirection: "decrease", component: "cash", amountPaise: 100000 },
      { targetType: "udhari_person", targetId: "udh_rahul", effectDirection: "increase", component: "receivable", amountPaise: 100000 },
    ],
    forbiddenComponents: ["expense", "income", "payable"],
    previewMustContain: ["Receivable increases", "not an expense"],
  },
  {
    name: "udhari received",
    type: "udhari_received",
    paymentMode: "upi",
    amountPaise: 100000,
    fields: { accountId: "acc_bank", linkedUdhariId: "udh_amit", merchantOrPerson: "Amit" },
    expectedEventType: "udhari_received",
    requiredFields: ["accountId", "linkedUdhariId", "merchantOrPerson"],
    invalidWhenMissing: ["accountId", "linkedUdhariId", "merchantOrPerson"],
    expectedEffects: [
      { targetType: "account", targetId: "acc_bank", effectDirection: "increase", component: "cash", amountPaise: 100000 },
      { targetType: "udhari_person", targetId: "udh_amit", effectDirection: "increase", component: "payable", amountPaise: 100000 },
    ],
    forbiddenComponents: ["expense", "income", "receivable"],
    previewMustContain: ["Payable increases", "not income"],
  },
  {
    name: "udhari collect",
    type: "udhari_collect",
    paymentMode: "upi",
    amountPaise: 40000,
    fields: { accountId: "acc_bank", linkedUdhariId: "udh_rahul", merchantOrPerson: "Rahul" },
    expectedEventType: "udhari_settlement",
    requiredFields: ["accountId", "linkedUdhariId", "merchantOrPerson"],
    invalidWhenMissing: ["accountId", "linkedUdhariId", "merchantOrPerson"],
    expectedEffects: [
      { targetType: "account", targetId: "acc_bank", effectDirection: "increase", component: "cash", amountPaise: 40000 },
      { targetType: "udhari_person", targetId: "udh_rahul", effectDirection: "decrease", component: "receivable", amountPaise: 40000 },
    ],
    forbiddenComponents: ["expense", "income", "payable"],
    previewMustContain: ["receivable: -", "account cash: +"],
  },
  {
    name: "udhari repay",
    type: "udhari_repay",
    paymentMode: "upi",
    amountPaise: 100000,
    fields: { accountId: "acc_bank", linkedUdhariId: "udh_amit", merchantOrPerson: "Amit" },
    expectedEventType: "udhari_settlement",
    requiredFields: ["accountId", "linkedUdhariId", "merchantOrPerson"],
    invalidWhenMissing: ["accountId", "linkedUdhariId", "merchantOrPerson"],
    expectedEffects: [
      { targetType: "account", targetId: "acc_bank", effectDirection: "decrease", component: "cash", amountPaise: 100000 },
      { targetType: "udhari_person", targetId: "udh_amit", effectDirection: "decrease", component: "payable", amountPaise: 100000 },
    ],
    forbiddenComponents: ["expense", "income", "receivable"],
    previewMustContain: ["payable: -", "account cash: -"],
  },
  {
    name: "udhari write-off",
    type: "udhari_write_off",
    paymentMode: "other",
    amountPaise: 60000,
    fields: { linkedUdhariId: "udh_rahul", categoryId: "cat_bad_debt", description: "reason: unrecoverable" },
    expectedEventType: "udhari_write_off",
    requiredFields: ["linkedUdhariId", "categoryId"],
    invalidWhenMissing: ["linkedUdhariId", "categoryId"],
    expectedEffects: [
      { targetType: "udhari_person", targetId: "udh_rahul", effectDirection: "decrease", component: "receivable", amountPaise: 60000 },
      { targetType: "expense_category", targetId: "cat_bad_debt", effectDirection: "increase", component: "expense", amountPaise: 60000 },
    ],
    forbiddenComponents: ["income", "cash"],
    previewMustContain: ["receivable: -", "expense category expense: +"],
  },
  {
    name: "goal contribution",
    type: "savings_contribution",
    paymentMode: "bank_transfer",
    amountPaise: 200000,
    fields: { accountId: "acc_bank", linkedGoalId: "goal_emergency" },
    expectedEventType: "goal_contribution",
    requiredFields: ["accountId", "linkedGoalId"],
    invalidWhenMissing: ["accountId", "linkedGoalId"],
    expectedEffects: [
      { targetType: "account", targetId: "acc_bank", effectDirection: "decrease", component: "cash", amountPaise: 200000 },
      { targetType: "goal", targetId: "goal_emergency", effectDirection: "increase", component: "asset", amountPaise: 200000 },
    ],
    forbiddenComponents: ["expense", "income"],
    previewMustContain: ["Goal progress after contribution"],
  },
  {
    name: "goal withdrawal",
    type: "goal_withdrawal",
    paymentMode: "bank_transfer",
    amountPaise: 100000,
    fields: { accountId: "acc_bank", linkedGoalId: "goal_emergency" },
    expectedEventType: "goal_withdrawal",
    requiredFields: ["accountId", "linkedGoalId"],
    invalidWhenMissing: ["accountId", "linkedGoalId"],
    expectedEffects: [
      { targetType: "goal", targetId: "goal_emergency", effectDirection: "decrease", component: "asset", amountPaise: 100000 },
      { targetType: "account", targetId: "acc_bank", effectDirection: "increase", component: "cash", amountPaise: 100000 },
    ],
    forbiddenComponents: ["expense", "income"],
    previewMustContain: ["goal asset: -", "account cash: +"],
  },
  {
    name: "investment buy",
    type: "investment_contribution",
    paymentMode: "bank_transfer",
    amountPaise: 150000,
    fields: { accountId: "acc_bank", linkedSavingsId: "inv_index" },
    expectedEventType: "investment_buy",
    requiredFields: ["accountId", "linkedSavingsId"],
    invalidWhenMissing: ["accountId", "linkedSavingsId"],
    expectedEffects: [
      { targetType: "account", targetId: "acc_bank", effectDirection: "decrease", component: "cash", amountPaise: 150000 },
      { targetType: "investment", targetId: "inv_index", effectDirection: "increase", component: "asset", amountPaise: 150000 },
    ],
    forbiddenComponents: ["expense", "income"],
    previewMustContain: ["investment asset: +"],
  },
  {
    name: "investment sell",
    type: "investment_sell",
    paymentMode: "bank_transfer",
    amountPaise: 160000,
    fields: { accountId: "acc_bank", linkedSavingsId: "inv_index" },
    expectedEventType: "investment_sell",
    requiredFields: ["accountId", "linkedSavingsId"],
    invalidWhenMissing: ["accountId", "linkedSavingsId"],
    expectedEffects: [
      { targetType: "investment", targetId: "inv_index", effectDirection: "decrease", component: "asset", amountPaise: 160000 },
      { targetType: "account", targetId: "acc_bank", effectDirection: "increase", component: "cash", amountPaise: 160000 },
    ],
    forbiddenComponents: ["expense", "income"],
    previewMustContain: ["investment asset: -", "account cash: +"],
  },
  {
    name: "transfer",
    type: "transfer",
    paymentMode: "bank_transfer",
    amountPaise: 500000,
    fields: { accountId: "acc_bank", toAccountId: "acc_cash" },
    expectedEventType: "transfer",
    requiredFields: ["accountId", "toAccountId"],
    invalidWhenMissing: ["accountId", "toAccountId"],
    expectedEffects: [
      { targetType: "account", targetId: "acc_bank", effectDirection: "decrease", component: "cash", amountPaise: 500000 },
      { targetType: "account", targetId: "acc_cash", effectDirection: "increase", component: "cash", amountPaise: 500000 },
    ],
    forbiddenComponents: ["expense", "income", "liability"],
    previewMustContain: ["Transfer", "not income or expense"],
  },
];

function txFor(c: MatrixCase): Transaction {
  return {
    id: c.fields.id ?? `tx_${c.type}_${c.paymentMode}`,
    userId,
    date: "2026-05-22",
    type: c.type,
    amount: c.amountPaise / 100,
    amountPaise: c.amountPaise,
    categoryId: "",
    accountId: "",
    toAccountId: "",
    linkedCardId: "",
    linkedLoanId: "",
    linkedGoalId: "",
    linkedUdhariId: "",
    linkedSavingsId: "",
    paymentMode: c.paymentMode,
    merchantOrPerson: "Matrix",
    description: "",
    billAvailable: 0,
    gstApplicable: 0,
    taxFlag: 0,
    businessOrPersonal: "personal",
    needWant: "unassigned",
    fixedVariable: "unassigned",
    plannedUnplanned: "unassigned",
    isDeleted: 0,
    createdAt: now,
    updatedAt: now,
    ...c.fields,
  } as Transaction;
}

function formStateFor(c: MatrixCase) {
  const t = txFor(c);
  return {
    date: t.date,
    type: t.type,
    amount: t.amount,
    categoryId: t.categoryId ?? "",
    accountId: t.accountId ?? "",
    toAccountId: t.toAccountId ?? "",
    linkedCardId: t.linkedCardId ?? "",
    linkedLoanId: t.linkedLoanId ?? "",
    linkedGoalId: t.linkedGoalId ?? "",
    linkedUdhariId: t.linkedUdhariId ?? "",
    linkedSavingsId: t.linkedSavingsId ?? "",
    paymentMode: t.paymentMode,
    merchantOrPerson: t.merchantOrPerson,
    description: t.description,
    notes: "",
    tags: [],
    billAvailable: t.billAvailable,
    gstApplicable: t.gstApplicable,
    taxFlag: t.taxFlag,
    businessOrPersonal: t.businessOrPersonal,
    needWant: t.needWant,
    fixedVariable: t.fixedVariable,
    plannedUnplanned: t.plannedUnplanned,
  };
}

function hasEffect(effects: FinancialEffect[], expected: ExpectedEffect): boolean {
  return effects.some(
    (e) =>
      e.targetType === expected.targetType &&
      e.effectDirection === expected.effectDirection &&
      e.component === expected.component &&
      e.amountPaise === expected.amountPaise &&
      (expected.targetId ? e.targetId === expected.targetId : true),
  );
}

describe("Local combination matrix QA", () => {
  it.each(cases)("$name: required fields, preview, and ledger effects are consistent", (c) => {
    const state = formStateFor(c);
    expect(getTransactionFormPhase6Errors(state)).toEqual({});

    for (const field of c.invalidWhenMissing ?? []) {
      const invalid = { ...state, [field]: "" };
      const errors = getTransactionFormPhase6Errors(invalid);
      expect(errors, `${c.name} should require ${field}`).toHaveProperty(field);
    }

    const ledger = buildLedgerForTransaction(txFor(c), buildFinanceEventBuilderContext(categories, [emi]));
    expect(ledger.event?.eventType).toBe(c.expectedEventType);
    expect(ledger.event?.status).toBe("posted");
    expect(ledger.excluded).toEqual([]);
    for (const expected of c.expectedEffects) {
      expect(hasEffect(ledger.effects, expected), `${c.name} missing ${JSON.stringify(expected)}`).toBe(true);
    }
    for (const component of c.forbiddenComponents ?? []) {
      expect(ledger.effects.some((effect) => effect.component === component), `${c.name} has forbidden ${component}`).toBe(false);
    }
    for (const targetType of c.forbiddenTargetTypes ?? []) {
      expect(ledger.effects.some((effect) => effect.targetType === targetType), `${c.name} has forbidden target ${targetType}`).toBe(false);
    }

    const preview = buildTransactionPreview(state, previewContext);
    const previewText = preview?.lines.join("\n") ?? "";
    for (const phrase of c.previewMustContain) {
      expect(previewText, `${c.name} preview missing ${phrase}`).toContain(phrase);
    }
  });

  it("blocks same-account transfer before ledger posting", () => {
    const transfer = cases.find((c) => c.name === "transfer");
    expect(transfer).toBeDefined();
    const state = { ...formStateFor(transfer!), accountId: "acc_bank", toAccountId: "acc_bank" };
    expect(getTransactionFormPhase6Errors(state).toAccountId).toBe("You cannot transfer to the same account.");
  });

  it("deleted transactions produce no ledger event in every covered type", () => {
    for (const c of cases) {
      const ledger = buildLedgerForTransaction(
        { ...txFor(c), isDeleted: 1 },
        buildFinanceEventBuilderContext(categories, [emi]),
      );
      expect(ledger.event, c.name).toBeNull();
      expect(ledger.effects, c.name).toHaveLength(0);
    }
  });
});
