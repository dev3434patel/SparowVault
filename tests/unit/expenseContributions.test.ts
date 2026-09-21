import { describe, it, expect } from "vitest";
import type { Transaction, Budget } from "@/types";
import { contributionError, expenseRecovery } from "@/services/expenseContributions";
import { buildFullLedger, buildFinanceEventBuilderContext } from "@/services/financeEventBuilder";
import { sumExpense, sumIncome, categoryBreakdown, budgetStatuses, expenseReportTransactions } from "@/services/calculations";
import { splitTransaction } from "@/services/businessPersonalSplit";

const expense = { id: "meal", userId: "u", date: "2026-09-01", type: "expense", amount: 400, amountPaise: 40000, categoryId: "food", accountId: "bank", paymentMode: "upi", businessOrPersonal: "personal", isDeleted: 0, tags: [] } as unknown as Transaction;
const contribution = { ...expense, id: "friend", date: "2026-09-02", type: "refund", transactionIntent: "expense_contribution", linkedOriginalTransactionId: "meal", amount: 200, amountPaise: 20000 } as Transaction;

describe("shared expense contribution returns", () => {
  it("400 paid and 200 returned gives zero income and 200 net expense in helpers and ledger", () => {
    const transactions = [expense, contribution];
    expect(sumIncome(transactions)).toBe(0);
    expect(sumExpense(transactions)).toBe(20000);
    const { effects } = buildFullLedger("u", transactions, buildFinanceEventBuilderContext([], []));
    const total = (target: string) => effects.filter(e => e.targetType === target).reduce((s, e) => s + e.amountPaise * (e.effectDirection === "increase" ? 1 : -1), 0);
    expect(total("account")).toBe(-20000);
    expect(total("income_category")).toBe(0);
    expect(total("expense_category")).toBe(20000);
    expect(contributionError(contribution, transactions)).toBeNull();
  });
  it("counts refunds together with contributions but omits deleted and foreign records", () => {
    const refund = { ...contribution, id: "refund", transactionIntent: "purchase_refund", amountPaise: 5000 } as Transaction;
    expect(expenseRecovery(expense, [contribution, refund, { ...refund, id: "deleted", isDeleted: 1 }, { ...refund, id: "foreign", userId: "other" }])).toEqual({ grossPaise: 40000, contributionPaise: 20000, refundPaise: 5000, recoveredPaise: 25000, remainingPaise: 15000 });
  });
  it.each([
    [{ amountPaise: 40001 }, "exceeds"], [{ date: "2026-08-31" }, "precede"], [{ linkedOriginalTransactionId: "missing" }, "original"], [{ categoryId: "salary" }, "category"], [{ businessOrPersonal: "business" }, "scope"], [{ paymentMode: "credit_card" }, "cash"], [{ type: "income" }, "cash"],
  ])("blocks invalid contribution %j", (patch, message) => expect(contributionError({ ...contribution, ...patch } as Transaction, [expense])).toContain(message));
  it("does not count reimbursement settlement as income", () => expect(sumIncome([{ ...contribution, type: "income", transactionIntent: "reimbursement" }])).toBe(0));
  it("category and fallback budget summaries use the same 200 net expense", () => {
    const txs = [expense, contribution];
    expect(categoryBreakdown(txs, [])[0].amountPaise).toBe(20000);
    const budget = { id: "b", userId: "u", categoryId: "food", period: "monthly", year: 2026, month: 9, limitPaise: 100000, amountPaise: 100000 } as unknown as Budget;
    expect(budgetStatuses([budget], txs, new Date(2026, 8, 10))[0].spentPaise).toBe(20000);
  });
  it("recovery reports inherit cost dimensions while retaining actual credit date and amount", () => {
    const original = { ...expense, merchantOrPerson: "Restaurant", needWant: "want", fixedVariable: "variable" } as Transaction;
    const credit = { ...contribution, merchantOrPerson: "Friend", paymentMode: "bank_transfer", date: "2026-10-01" } as Transaction;
    expect(expenseReportTransactions([credit], [original, credit])[0]).toMatchObject({ merchantOrPerson: "Restaurant", paymentMode: "upi", date: "2026-10-01", amountPaise: 20000 });
    expect(credit.merchantOrPerson).toBe("Friend");
    expect(sumExpense([credit])).toBe(-20000);
  });
  it("deleting a return restores the full expense and edit omits itself", () => {
    expect(sumExpense([expense, { ...contribution, isDeleted: 1 }])).toBe(40000);
    expect(contributionError({ ...contribution, amountPaise: 40000 }, [expense, contribution])).toBeNull();
  });
  it("never derives a negative business allocation from oversized personal split", () => {
    expect(splitTransaction({ ...expense, businessOrPersonal: "mixed", splitPersonalPaise: 50000 })).toEqual({ businessPaise: 0, personalPaise: 40000, totalPaise: 40000 });
  });
});
