import { describe, expect, it } from "vitest";
import {
  buildTransactionPreview,
  type TransactionPreviewContext,
} from "@/services/transactionPreview";
import type {
  Account,
  Card,
  Category,
  EMIPayment,
  Goal,
  Loan,
  Transaction,
  UdhariRecord,
} from "@/types";
import type { TransactionFormRuleState } from "@/services/transactionFormRules";

const now = "2026-05-14T00:00:00.000Z";

const account = (id: string, name: string, openingBalancePaise: number): Account => ({
  id,
  userId: "u1",
  name,
  type: "bank",
  openingBalance: openingBalancePaise / 100,
  openingBalancePaise,
  color: "#111",
  icon: "bank",
  isInactive: 0,
  isDeleted: 0,
  createdAt: now,
  updatedAt: now,
});

const category = (id: string, name: string): Category => ({
  id,
  userId: "u1",
  name,
  parentId: null,
  appliesTo: "expense",
  icon: "bag",
  color: "#111",
  budgetable: 1,
  taxRelevant: 0,
  gstRelevant: 0,
  sortOrder: 1,
  archived: 0,
  isDeleted: 0,
  createdAt: now,
  updatedAt: now,
});

const card = (): Card => ({
  id: "card1",
  userId: "u1",
  nickname: "HDFC Credit Card",
  bank: "HDFC",
  last4: "1234",
  type: "credit",
  creditLimit: 10000,
  creditLimitPaise: 1000000,
  color: "#111",
  isInactive: 0,
  isDeleted: 0,
  createdAt: now,
  updatedAt: now,
});

const loan = (): Loan => ({
  id: "loan1",
  userId: "u1",
  lender: "HDFC Loan",
  loanType: "personal",
  principal: 100000,
  principalPaise: 10000000,
  startDate: "2026-01-01T00:00:00.000Z",
  tenureMonths: 12,
  annualInterestRate: 12,
  emiDueDay: 5,
  outstandingPrincipal: 100000,
  outstandingPrincipalPaise: 10000000,
  processingFee: 0,
  insuranceCost: 0,
  prepaymentAllowed: 1,
  status: "active",
  isDeleted: 0,
  createdAt: now,
  updatedAt: now,
});

const emi = (): EMIPayment => ({
  id: "emi1",
  userId: "u1",
  loanId: "loan1",
  transactionId: "tx_emi",
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
});

const goal = (): Goal => ({
  id: "goal1",
  userId: "u1",
  title: "Car",
  goalType: "car",
  targetAmount: 100000,
  targetAmountPaise: 10000000,
  targetDate: "2026-12-31T00:00:00.000Z",
  startedAt: "2026-01-01T00:00:00.000Z",
  currentSaved: 10000,
  savedAmountPaise: 1000000,
  priority: 3,
  icon: "car",
  color: "#111",
  status: "active",
  isDeleted: 0,
  createdAt: now,
  updatedAt: now,
});

const udhari = (type: "receivable" | "payable"): UdhariRecord => ({
  id: "udh1",
  userId: "u1",
  personName: "Rahul",
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

const baseState = (): TransactionFormRuleState => ({
  date: "2026-05-14",
  type: "expense",
  amount: 450,
  categoryId: "cat1",
  accountId: "acc1",
  toAccountId: "",
  linkedCardId: "",
  linkedLoanId: "",
  linkedGoalId: "",
  linkedUdhariId: "",
  linkedSavingsId: "",
  paymentMode: "upi",
  merchantOrPerson: "Test",
  description: "",
  notes: "",
  tags: [],
  billAvailable: 0,
  gstApplicable: 0,
  taxFlag: 0,
  businessOrPersonal: "personal",
  needWant: "unassigned",
  fixedVariable: "unassigned",
  plannedUnplanned: "unassigned",
});

const ctx = (transactions: Transaction[] = []): TransactionPreviewContext => ({
  userId: "u1",
  draftTransactionId: "draft_tx",
  categories: [category("cat1", "Food")],
  emis: [emi()],
  accounts: [account("acc1", "Dev Bank", 1000000), account("acc2", "Savings", 200000)],
  cards: [card()],
  loans: [loan()],
  goals: [goal()],
  investments: [],
  udhari: [udhari("receivable"), { ...udhari("payable"), id: "udh2" }],
  transactions,
});

function lines(state: TransactionFormRuleState, c = ctx()): string {
  return buildTransactionPreview(state, c)?.lines.join("\n") ?? "";
}

describe("transactionPreview", () => {
  it("previews UPI expense with account decrease and expense effect", () => {
    const text = lines(baseState());
    expect(text).toContain("Cash outflow");
    expect(text).toContain("Food spending increases");
    expect(text).toContain("account cash: -");
    expect(text).toContain("expense category expense: +");
  });

  it("previews credit-card expense without bank movement", () => {
    const state = { ...baseState(), paymentMode: "credit_card" as const, linkedCardId: "card1", accountId: "" };
    const text = lines(state);
    expect(text).toContain("HDFC Credit Card");
    expect(text).toContain("Available limit");
    expect(text).toContain("Utilization after transaction");
    expect(text).toContain("Bank balance will not change today");
  });

  it("previews card bill payment as liability reduction, not expense", () => {
    const state = { ...baseState(), type: "cc_payment" as const, linkedCardId: "card1", accountId: "acc1" };
    const text = lines(state);
    expect(text).toContain("card liability decreases");
    expect(text).toContain("not a new expense");
  });

  it("previews EMI principal/interest split and remaining principal", () => {
    const state = { ...baseState(), type: "emi_payment" as const, amount: 10000, linkedLoanId: "loan1", accountId: "acc1" };
    const text = lines(state);
    expect(text).toContain("principal");
    expect(text).toContain("interest");
    expect(text).toContain("Remaining loan principal");
  });

  it("previews udhari given and received without income/expense misunderstanding", () => {
    const given = lines({ ...baseState(), type: "udhari_given" as const, amount: 1000, linkedUdhariId: "udh1", merchantOrPerson: "Rahul" });
    const received = lines({ ...baseState(), type: "udhari_received" as const, amount: 1000, linkedUdhariId: "udh2", merchantOrPerson: "Rahul" });
    expect(given).toContain("Receivable increases");
    expect(given).toContain("not an expense");
    expect(received).toContain("Payable increases");
    expect(received).toContain("not income");
  });

  it("previews transfer with both balances and no income/expense", () => {
    const state = { ...baseState(), type: "transfer" as const, amount: 2000, accountId: "acc1", toAccountId: "acc2", paymentMode: "bank_transfer" as const };
    const text = lines(state);
    expect(text).toContain("Transfer");
    expect(text).toContain("Dev Bank");
    expect(text).toContain("Savings");
    expect(text).toContain("not income or expense");
  });

  it("previews loan disbursement and goal contribution", () => {
    const loanText = lines({ ...baseState(), type: "loan_disbursement" as const, amount: 50000, linkedLoanId: "loan1", accountId: "acc1" });
    const goalText = lines({ ...baseState(), type: "savings_contribution" as const, amount: 10000, linkedGoalId: "goal1", accountId: "acc1" });
    expect(loanText).toContain("Loan liability also increases");
    expect(goalText).toContain("Goal progress after contribution");
  });
});
