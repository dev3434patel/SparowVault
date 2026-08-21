/**
 * Phase 5 — financial event/effect correctness for the 8 core scenarios.
 *
 * Each test feeds a minimal Transaction (cast to the wide Transaction type)
 * into buildLedgerForTransaction() and asserts the resulting event type +
 * effect shape. We assert ABOUT the effects (target type / component /
 * direction / amount) rather than the exact effect ids so the tests stay
 * resilient to internal ordering.
 */
import { describe, it, expect } from "vitest";
import {
  buildFinanceEventBuilderContext,
  buildLedgerForTransaction,
} from "@/services/financeEventBuilder";
import type {
  Category,
  EMIPayment,
  FinancialEffect,
  Transaction,
  TransactionType,
} from "@/types";

const cat = (id: string, kind: Category["kind"], name = id): Category => ({
  id,
  userId: "u1",
  name,
  kind,
  parentId: undefined,
  color: "#888",
  emoji: "💸",
  isCustom: 1,
  isDeleted: 0,
  createdAt: "2026-05-13T00:00:00.000Z",
  updatedAt: "2026-05-13T00:00:00.000Z",
  taxRelevant: 0,
  gstRelevant: 0,
} as Category);

let _seq = 1;
const tx = (over: Partial<Transaction> & { type: TransactionType }): Transaction => ({
  id: over.id ?? `tx_${_seq++}`,
  userId: over.userId ?? "u1",
  amount: over.amount ?? 0,
  amountPaise: over.amountPaise ?? 0,
  date: over.date ?? "2026-05-13",
  paymentMode: over.paymentMode ?? "upi",
  merchantOrPerson: over.merchantOrPerson ?? "Test",
  description: over.description ?? "",
  billAvailable: 0,
  gstApplicable: 0,
  taxFlag: 0,
  businessOrPersonal: "personal",
  needWant: "unassigned",
  fixedVariable: "unassigned",
  plannedUnplanned: "unassigned",
  isDeleted: 0,
  createdAt: "2026-05-13T00:00:00.000Z",
  updatedAt: "2026-05-13T00:00:00.000Z",
  ...over,
}) as Transaction;

const ctx = (categories: Category[] = [], emis: EMIPayment[] = []) =>
  buildFinanceEventBuilderContext(categories, emis);

const has = (
  effects: FinancialEffect[],
  match: Partial<FinancialEffect> & { component: FinancialEffect["component"] },
) =>
  effects.some(
    (e) =>
      e.component === match.component &&
      (match.targetType ? e.targetType === match.targetType : true) &&
      (match.effectDirection ? e.effectDirection === match.effectDirection : true) &&
      (match.amountPaise !== undefined ? e.amountPaise === match.amountPaise : true) &&
      (match.targetId ? e.targetId === match.targetId : true),
  );

describe("Phase 5 — ledger scenarios", () => {
  // -------------------------------------------------------------------
  it("1. Cash expense: account cash decreases, expense category increases", () => {
    const food = cat("cat_food", "expense", "Food");
    const t = tx({
      type: "expense",
      paymentMode: "upi",
      accountId: "acc_bank_1",
      categoryId: "cat_food",
      amountPaise: 45000,
      amount: 450,
    });
    const { event, effects } = buildLedgerForTransaction(t, ctx([food]));
    expect(event?.eventType).toBe("expense");
    expect(has(effects, { component: "cash", targetType: "account", effectDirection: "decrease", amountPaise: 45000, targetId: "acc_bank_1" })).toBe(true);
    expect(has(effects, { component: "expense", targetType: "expense_category", effectDirection: "increase", amountPaise: 45000, targetId: "cat_food" })).toBe(true);
  });

  // -------------------------------------------------------------------
  it("2. Credit-card purchase: expense increases, card liability increases, bank unchanged", () => {
    const food = cat("cat_food", "expense", "Food");
    const t = tx({
      type: "expense",
      paymentMode: "credit_card",
      linkedCardId: "card_hdfc",
      categoryId: "cat_food",
      amountPaise: 45000,
      amount: 450,
    });
    const { event, effects } = buildLedgerForTransaction(t, ctx([food]));
    expect(event?.eventType).toBe("credit_card_purchase");
    expect(has(effects, { component: "expense", targetType: "expense_category", effectDirection: "increase", amountPaise: 45000, targetId: "cat_food" })).toBe(true);
    expect(has(effects, { component: "liability", targetType: "credit_card", effectDirection: "increase", amountPaise: 45000, targetId: "card_hdfc" })).toBe(true);
    // NEGATIVE assertion: no bank/cash decrease
    const bankCashDecrease = effects.some((e) => e.component === "cash" && e.effectDirection === "decrease" && e.targetType === "account");
    expect(bankCashDecrease).toBe(false);
  });

  // -------------------------------------------------------------------
  it("3. Credit-card bill payment: bank decreases, card liability decreases, no expense", () => {
    const t = tx({
      type: "cc_payment",
      paymentMode: "bank_transfer",
      accountId: "acc_bank_1",
      linkedCardId: "card_hdfc",
      amountPaise: 1200000,
      amount: 12000,
    });
    const { event, effects } = buildLedgerForTransaction(t, ctx());
    expect(event?.eventType).toBe("credit_card_payment");
    expect(has(effects, { component: "cash", targetType: "account", effectDirection: "decrease", amountPaise: 1200000, targetId: "acc_bank_1" })).toBe(true);
    expect(has(effects, { component: "liability", targetType: "credit_card", effectDirection: "decrease", amountPaise: 1200000, targetId: "card_hdfc" })).toBe(true);
    // NEGATIVE: no expense effect generated
    const expenseEffect = effects.some((e) => e.component === "expense");
    expect(expenseEffect).toBe(false);
  });

  it("3b. Credit-card refund: card liability decreases and expense category is reversed, no income", () => {
    const food = cat("cat_food", "expense", "Food");
    const t = tx({
      type: "refund",
      paymentMode: "credit_card",
      linkedCardId: "card_hdfc",
      categoryId: "cat_food",
      amountPaise: 25000,
      amount: 250,
    });
    const { event, effects } = buildLedgerForTransaction(t, ctx([food]));
    expect(event?.eventType).toBe("refund");
    expect(has(effects, { component: "liability", targetType: "credit_card", effectDirection: "decrease", amountPaise: 25000, targetId: "card_hdfc" })).toBe(true);
    expect(has(effects, { component: "expense", targetType: "expense_category", effectDirection: "decrease", amountPaise: 25000, targetId: "cat_food" })).toBe(true);
    expect(effects.some((e) => e.component === "income" || e.targetType === "income_category")).toBe(false);
    expect(effects.some((e) => e.component === "cash" && e.targetType === "account")).toBe(false);
  });

  // -------------------------------------------------------------------
  it("3c. Bank/cash refund: account increases, expense category decreases, no income", () => {
    const food = cat("cat_food", "expense", "Food");
    const t = tx({
      type: "refund",
      paymentMode: "upi",
      accountId: "acc_bank_1",
      categoryId: "cat_food",
      amountPaise: 25000,
      amount: 250,
    });
    const { event, effects } = buildLedgerForTransaction(t, ctx([food]));
    expect(event?.eventType).toBe("refund");
    expect(has(effects, { component: "cash", targetType: "account", effectDirection: "increase", amountPaise: 25000, targetId: "acc_bank_1" })).toBe(true);
    expect(has(effects, { component: "expense", targetType: "expense_category", effectDirection: "decrease", amountPaise: 25000, targetId: "cat_food" })).toBe(true);
    expect(effects.some((e) => e.component === "income" || e.targetType === "income_category")).toBe(false);
  });

  // -------------------------------------------------------------------
  it("4. EMI payment: bank decreases full EMI, loan principal decreases principal-only, interest expense increases interest-only", () => {
    const emi: EMIPayment = {
      id: "emi_1",
      userId: "u1",
      loanId: "loan_hdfc",
      transactionId: "tx_emi_1",
      // Canonical paise fields (Phase 3) — the engine reads these via
      // emiPaymentPrincipalPaidPaise / emiPaymentInterestPaise helpers in
      // src/utils/money.ts.
      principalComponent: 7000,
      principalComponentPaise: 700000,
      interestComponent: 3000,
      interestComponentPaise: 300000,
      amountDue: 10000,
      amountPaise: 1000000,
      amountPaid: 10000,
      amountPaidPaise: 1000000,
      dueDate: "2026-05-05",
      paidDate: "2026-05-05",
      status: "paid",
      isDeleted: 0,
      createdAt: "2026-05-05T00:00:00.000Z",
      updatedAt: "2026-05-05T00:00:00.000Z",
    } as EMIPayment;
    const t = tx({
      id: "tx_emi_1",
      type: "emi_payment",
      paymentMode: "bank_transfer",
      accountId: "acc_bank_1",
      linkedLoanId: "loan_hdfc",
      amountPaise: 1000000,
      amount: 10000,
    });
    const { event, effects } = buildLedgerForTransaction(t, ctx([], [emi]));
    expect(event?.eventType).toBe("emi_payment");
    expect(has(effects, { component: "cash",      targetType: "account", effectDirection: "decrease", amountPaise: 1000000, targetId: "acc_bank_1" })).toBe(true);
    expect(has(effects, { component: "principal", targetType: "loan",    effectDirection: "decrease", amountPaise: 700000,  targetId: "loan_hdfc"  })).toBe(true);
    expect(has(effects, { component: "interest",                          effectDirection: "increase", amountPaise: 300000                          })).toBe(true);
  });

  it("4b. EMI payment: penalty and fee post as expense-category effects", () => {
    const catLoan = cat("cat_loan", "expense", "Loan costs");
    const emi: EMIPayment = {
      id: "emi_charge_1",
      userId: "u1",
      loanId: "loan_hdfc",
      transactionId: "tx_emi_charge_1",
      principalComponentPaise: 700000,
      interestComponentPaise: 200000,
      penaltyPaise: 50000,
      feePaise: 50000,
      amountPaise: 1000000,
      dueDate: "2026-05-05",
      status: "paid",
      isDeleted: 0,
      createdAt: "2026-05-05T00:00:00.000Z",
      updatedAt: "2026-05-05T00:00:00.000Z",
    } as EMIPayment;
    const t = tx({
      id: "tx_emi_charge_1",
      type: "emi_payment",
      paymentMode: "bank_transfer",
      accountId: "acc_bank_1",
      linkedLoanId: "loan_hdfc",
      categoryId: "cat_loan",
      amountPaise: 1000000,
      amount: 10000,
    });
    const { event, effects } = buildLedgerForTransaction(t, ctx([catLoan], [emi]));
    expect(event?.eventType).toBe("emi_payment");
    expect(has(effects, { component: "principal", targetType: "loan", effectDirection: "decrease", amountPaise: 700000, targetId: "loan_hdfc" })).toBe(true);
    expect(has(effects, { component: "interest", targetType: "expense_category", effectDirection: "increase", amountPaise: 200000, targetId: "cat_loan" })).toBe(true);
    expect(has(effects, { component: "penalty", targetType: "expense_category", effectDirection: "increase", amountPaise: 50000, targetId: "cat_loan" })).toBe(true);
    expect(has(effects, { component: "fee", targetType: "expense_category", effectDirection: "increase", amountPaise: 50000, targetId: "cat_loan" })).toBe(true);
  });

  it("4c. Loan disbursement: account cash increases and loan principal liability increases", () => {
    const t = tx({
      type: "loan_disbursement",
      paymentMode: "bank_transfer",
      accountId: "acc_bank_1",
      linkedLoanId: "loan_hdfc",
      amountPaise: 50000000,
      amount: 500000,
    });
    const { event, effects } = buildLedgerForTransaction(t, ctx());
    expect(event?.eventType).toBe("loan_disbursement");
    expect(has(effects, { component: "cash", targetType: "account", effectDirection: "increase", amountPaise: 50000000, targetId: "acc_bank_1" })).toBe(true);
    expect(has(effects, { component: "principal", targetType: "loan", effectDirection: "increase", amountPaise: 50000000, targetId: "loan_hdfc" })).toBe(true);
  });

  it("4d. Loan prepayment: account cash decreases and loan principal decreases", () => {
    const t = tx({
      type: "loan_prepayment",
      paymentMode: "bank_transfer",
      accountId: "acc_bank_1",
      linkedLoanId: "loan_hdfc",
      amountPaise: 2500000,
      amount: 25000,
    });
    const { event, effects } = buildLedgerForTransaction(t, ctx());
    expect(event?.eventType).toBe("loan_prepayment");
    expect(has(effects, { component: "cash", targetType: "account", effectDirection: "decrease", amountPaise: 2500000, targetId: "acc_bank_1" })).toBe(true);
    expect(has(effects, { component: "principal", targetType: "loan", effectDirection: "decrease", amountPaise: 2500000, targetId: "loan_hdfc" })).toBe(true);
  });

  // -------------------------------------------------------------------
  it("5. Udhari given: account decreases, receivable increases, NO expense", () => {
    const t = tx({
      type: "udhari_given",
      paymentMode: "upi",
      accountId: "acc_bank_1",
      linkedUdhariId: "udh_rahul",
      amountPaise: 100000,
      amount: 1000,
    });
    const { event, effects } = buildLedgerForTransaction(t, ctx());
    expect(event?.eventType).toBe("udhari_given");
    expect(has(effects, { component: "cash",        targetType: "account",        effectDirection: "decrease", amountPaise: 100000, targetId: "acc_bank_1" })).toBe(true);
    expect(has(effects, { component: "receivable",  targetType: "udhari_person",  effectDirection: "increase", amountPaise: 100000 })).toBe(true);
    expect(effects.some((e) => e.component === "expense")).toBe(false);
  });

  // -------------------------------------------------------------------
  it("6. Udhari received: account increases, payable increases, NO income", () => {
    const t = tx({
      type: "udhari_received",
      paymentMode: "upi",
      accountId: "acc_bank_1",
      linkedUdhariId: "udh_amit",
      amountPaise: 100000,
      amount: 1000,
    });
    const { event, effects } = buildLedgerForTransaction(t, ctx());
    expect(event?.eventType).toBe("udhari_received");
    expect(has(effects, { component: "cash",     targetType: "account",       effectDirection: "increase", amountPaise: 100000, targetId: "acc_bank_1" })).toBe(true);
    expect(has(effects, { component: "payable",  targetType: "udhari_person", effectDirection: "increase", amountPaise: 100000 })).toBe(true);
    expect(effects.some((e) => e.component === "income")).toBe(false);
  });

  // -------------------------------------------------------------------
  it("7. Transfer: from-account decreases, to-account increases, no expense/income", () => {
    const t = tx({
      type: "transfer",
      paymentMode: "bank_transfer",
      accountId: "acc_a",
      toAccountId: "acc_b",
      amountPaise: 500000,
      amount: 5000,
    });
    const { event, effects } = buildLedgerForTransaction(t, ctx());
    expect(event?.eventType).toBe("transfer");
    expect(has(effects, { component: "cash", targetType: "account", effectDirection: "decrease", amountPaise: 500000, targetId: "acc_a" })).toBe(true);
    expect(has(effects, { component: "cash", targetType: "account", effectDirection: "increase", amountPaise: 500000, targetId: "acc_b" })).toBe(true);
    expect(effects.some((e) => e.component === "expense" || e.component === "income")).toBe(false);
  });

  it("7b. Udhari settlement received: account increases, receivable decreases", () => {
    const t = tx({
      type: "udhari_collect",
      paymentMode: "upi",
      accountId: "acc_bank_1",
      linkedUdhariId: "udh_rahul",
      amountPaise: 100000,
      amount: 1000,
    });
    const { event, effects } = buildLedgerForTransaction(t, ctx());
    expect(event?.eventType).toBe("udhari_settlement");
    expect(has(effects, { component: "cash", targetType: "account", effectDirection: "increase", amountPaise: 100000, targetId: "acc_bank_1" })).toBe(true);
    expect(has(effects, { component: "receivable", targetType: "udhari_person", effectDirection: "decrease", amountPaise: 100000, targetId: "udh_rahul" })).toBe(true);
  });

  it("7c. Udhari settlement paid: account decreases, payable decreases", () => {
    const t = tx({
      type: "udhari_repay",
      paymentMode: "upi",
      accountId: "acc_bank_1",
      linkedUdhariId: "udh_amit",
      amountPaise: 100000,
      amount: 1000,
    });
    const { event, effects } = buildLedgerForTransaction(t, ctx());
    expect(event?.eventType).toBe("udhari_settlement");
    expect(has(effects, { component: "cash", targetType: "account", effectDirection: "decrease", amountPaise: 100000, targetId: "acc_bank_1" })).toBe(true);
    expect(has(effects, { component: "payable", targetType: "udhari_person", effectDirection: "decrease", amountPaise: 100000, targetId: "udh_amit" })).toBe(true);
  });

  it("7c-2. Udhari write-off: receivable decreases and bad-debt expense increases", () => {
    const badDebt = cat("cat_bad_debt", "expense", "Bad debt");
    const t = tx({
      type: "udhari_write_off",
      paymentMode: "other",
      linkedUdhariId: "udh_rahul",
      categoryId: "cat_bad_debt",
      amountPaise: 75000,
      amount: 750,
      description: "Write-off reason: unrecoverable",
    });
    const { event, effects } = buildLedgerForTransaction(t, ctx([badDebt]));
    expect(event?.eventType).toBe("udhari_write_off");
    expect(has(effects, { component: "receivable", targetType: "udhari_person", effectDirection: "decrease", amountPaise: 75000, targetId: "udh_rahul" })).toBe(true);
    expect(has(effects, { component: "expense", targetType: "expense_category", effectDirection: "increase", amountPaise: 75000, targetId: "cat_bad_debt" })).toBe(true);
    expect(effects.some((e) => e.component === "cash" && e.targetType === "account")).toBe(false);
  });

  it("7d. Goal contribution: account decreases and goal asset increases", () => {
    const t = tx({
      type: "savings_contribution",
      paymentMode: "bank_transfer",
      accountId: "acc_bank_1",
      linkedGoalId: "goal_car",
      amountPaise: 1000000,
      amount: 10000,
    });
    const { event, effects } = buildLedgerForTransaction(t, ctx());
    expect(event?.eventType).toBe("goal_contribution");
    expect(has(effects, { component: "cash", targetType: "account", effectDirection: "decrease", amountPaise: 1000000, targetId: "acc_bank_1" })).toBe(true);
    expect(has(effects, { component: "asset", targetType: "goal", effectDirection: "increase", amountPaise: 1000000, targetId: "goal_car" })).toBe(true);
  });

  it("7e. Goal withdrawal: goal asset decreases and account increases", () => {
    const t = tx({
      type: "goal_withdrawal",
      paymentMode: "bank_transfer",
      accountId: "acc_bank_1",
      linkedGoalId: "goal_car",
      amountPaise: 1000000,
      amount: 10000,
    });
    const { event, effects } = buildLedgerForTransaction(t, ctx());
    expect(event?.eventType).toBe("goal_withdrawal");
    expect(has(effects, { component: "asset", targetType: "goal", effectDirection: "decrease", amountPaise: 1000000, targetId: "goal_car" })).toBe(true);
    expect(has(effects, { component: "cash", targetType: "account", effectDirection: "increase", amountPaise: 1000000, targetId: "acc_bank_1" })).toBe(true);
  });

  it("7f. Investment buy: account decreases and investment asset increases", () => {
    const t = tx({
      type: "investment_contribution",
      paymentMode: "bank_transfer",
      accountId: "acc_bank_1",
      linkedSavingsId: "inv_index",
      amountPaise: 1500000,
      amount: 15000,
    });
    const { event, effects } = buildLedgerForTransaction(t, ctx());
    expect(event?.eventType).toBe("investment_buy");
    expect(has(effects, { component: "cash", targetType: "account", effectDirection: "decrease", amountPaise: 1500000, targetId: "acc_bank_1" })).toBe(true);
    expect(has(effects, { component: "asset", targetType: "investment", effectDirection: "increase", amountPaise: 1500000, targetId: "inv_index" })).toBe(true);
  });

  it("7g. Investment sell: investment asset decreases and account increases", () => {
    const t = tx({
      type: "investment_sell",
      paymentMode: "bank_transfer",
      accountId: "acc_bank_1",
      linkedSavingsId: "inv_index",
      amountPaise: 1500000,
      amount: 15000,
    });
    const { event, effects } = buildLedgerForTransaction(t, ctx());
    expect(event?.eventType).toBe("investment_sell");
    expect(has(effects, { component: "asset", targetType: "investment", effectDirection: "decrease", amountPaise: 1500000, targetId: "inv_index" })).toBe(true);
    expect(has(effects, { component: "cash", targetType: "account", effectDirection: "increase", amountPaise: 1500000, targetId: "acc_bank_1" })).toBe(true);
  });

  // -------------------------------------------------------------------
  it("8. Income/refund: account increases, income category increases", () => {
    const salary = cat("cat_salary", "income", "Salary");
    const t = tx({
      type: "income",
      paymentMode: "bank_transfer",
      accountId: "acc_bank_1",
      categoryId: "cat_salary",
      amountPaise: 7500000,
      amount: 75000,
    });
    const { event, effects } = buildLedgerForTransaction(t, ctx([salary]));
    expect(event?.eventType).toBe("income");
    expect(has(effects, { component: "cash", targetType: "account", effectDirection: "increase", amountPaise: 7500000, targetId: "acc_bank_1" })).toBe(true);
    expect(has(effects, { component: "income", targetType: "income_category", effectDirection: "increase", amountPaise: 7500000, targetId: "cat_salary" })).toBe(true);
  });

  // -------------------------------------------------------------------
  it("isDeleted=1 transactions produce no event", () => {
    const t = tx({ type: "expense", isDeleted: 1, amountPaise: 100, amount: 1 });
    const { event, effects } = buildLedgerForTransaction(t, ctx());
    expect(event).toBeNull();
    expect(effects).toHaveLength(0);
  });
});
