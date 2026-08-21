import { describe, it, expect } from "vitest";
import { getTransactionFormPhase6Errors } from "@/services/transactionFormRules";
import type { TransactionFormRuleState } from "@/services/transactionFormRules";

const base = (): TransactionFormRuleState => ({
  date: "2026-05-12",
  type: "expense",
  amount: 100,
  categoryId: "cat1",
  accountId: "a1",
  toAccountId: "",
  linkedCardId: "",
  linkedLoanId: "",
  linkedGoalId: "",
  linkedUdhariId: "",
  linkedSavingsId: "",
  paymentMode: "upi",
  merchantOrPerson: "",
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

describe("transactionFormRules", () => {
  it("requires account for expense + UPI", () => {
    const s = base();
    s.accountId = "";
    const e = getTransactionFormPhase6Errors(s);
    expect(e.accountId).toBe("Select the account this money left from.");
  });

  it("requires linked card for expense + credit_card, not account", () => {
    const s = base();
    s.paymentMode = "credit_card";
    s.linkedCardId = "";
    s.accountId = "";
    const e = getTransactionFormPhase6Errors(s);
    expect(e.linkedCardId).toBe("Select the credit card used for this expense.");
    expect(e.accountId).toBeUndefined();
  });

  it("requires linked card for credit-card refund, not receiving account", () => {
    const s = base();
    s.type = "refund";
    s.paymentMode = "credit_card";
    s.linkedCardId = "";
    s.accountId = "";
    const e = getTransactionFormPhase6Errors(s);
    expect(e.linkedCardId).toBe("Select the credit card receiving this refund.");
    expect(e.accountId).toBeUndefined();
  });

  it("rejects transfer to same account", () => {
    const s = base();
    s.type = "transfer";
    s.accountId = "x";
    s.toAccountId = "x";
    const e = getTransactionFormPhase6Errors(s);
    expect(e.toAccountId).toBe("You cannot transfer to the same account.");
  });

  it("requires credit-card payment card and bank account", () => {
    const s = base();
    s.type = "cc_payment";
    s.linkedCardId = "";
    s.accountId = "";
    const e = getTransactionFormPhase6Errors(s);
    expect(e.linkedCardId).toBe("Select the credit card bill you are paying.");
    expect(e.accountId).toBe("Select the bank account used for this card payment.");
  });

  it("requires loan and account for EMI payment", () => {
    const s = base();
    s.type = "emi_payment";
    s.linkedLoanId = "";
    s.accountId = "";
    const e = getTransactionFormPhase6Errors(s);
    expect(e.linkedLoanId).toBe("Select the loan for this EMI payment.");
    expect(e.accountId).toBe("Select the payment account for this EMI.");
  });

  it("requires loan and receiving account for loan disbursement", () => {
    const s = base();
    s.type = "loan_disbursement";
    s.linkedLoanId = "";
    s.accountId = "";
    const e = getTransactionFormPhase6Errors(s);
    expect(e.linkedLoanId).toBe("Select the loan");
    expect(e.accountId).toBe("Select the account receiving funds");
  });

  it("requires goal and source account for goal contribution", () => {
    const s = base();
    s.type = "savings_contribution";
    s.linkedGoalId = "";
    s.accountId = "";
    const e = getTransactionFormPhase6Errors(s);
    expect(e.linkedGoalId).toBe("Select the goal for this contribution.");
    expect(e.accountId).toBe("Select the source account for this goal contribution.");
  });

  it("requires udhari settlement person and account", () => {
    const s = base();
    s.type = "udhari_collect";
    s.linkedUdhariId = "";
    s.accountId = "";
    s.merchantOrPerson = "Rahul";
    const e = getTransactionFormPhase6Errors(s);
    expect(e.linkedUdhariId).toBe("Select the udhari person being settled.");
    expect(e.accountId).toBe("Select the account receiving repayment");
  });

  it("requires udhari person label", () => {
    const s = base();
    s.type = "udhari_given";
    s.linkedUdhariId = "u1";
    s.accountId = "a1";
    s.merchantOrPerson = "  ";
    const e = getTransactionFormPhase6Errors(s);
    expect(e.merchantOrPerson).toBeDefined();
  });
});
