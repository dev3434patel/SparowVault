/**
 * T-126 — Full mobile purchase → EMI conversion → billing → payment lifecycle.
 * Acceptance: purchase counted once; bank unchanged until bill pay; payment is not expense.
 */
import { describe, it, expect } from "vitest";
import {
  buildFinanceEventBuilderContext,
  buildFullLedger,
} from "@/services/financeEventBuilder";
import {
  createCardEmiPlanFromPurchase,
  calculateNetFinancingCostPaise,
  totalPrincipalInSchedule,
  buildCardEmiSchedule,
} from "@/services/cardEmiEngine";
import { calculateExpenseView, calculateIncomeView } from "@/services/ledgerCalculations";
import { calculateCardOutstanding } from "@/services/cardEngine";
import type { Category, Transaction } from "@/types";

const baseTx = (over: Partial<Transaction>): Transaction =>
  ({
    id: over.id ?? "tx",
    userId: "u1",
    type: over.type ?? "expense",
    amountPaise: over.amountPaise ?? 0,
    amount: over.amount ?? 0,
    date: over.date ?? "2026-05-01",
    paymentMode: over.paymentMode ?? "credit_card",
    merchantOrPerson: "Mobile Store",
    description: "",
    billAvailable: 0,
    gstApplicable: 0,
    taxFlag: 0,
    businessOrPersonal: "personal",
    needWant: "unassigned",
    fixedVariable: "unassigned",
    plannedUnplanned: "unassigned",
    isDeleted: 0,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    version: 1,
    tags: [],
    notes: "",
    ...over,
  }) as Transaction;

const electronics: Category = {
  id: "cat_electronics",
  userId: "u1",
  name: "Electronics",
  appliesTo: "expense",
  parentId: null,
  icon: "📱",
  color: "#333",
  budgetable: 1,
  taxRelevant: 0,
  gstRelevant: 0,
  sortOrder: 0,
  archived: 0,
  isDeleted: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  version: 1,
  tags: [],
  notes: "",
};

const financeCat: Category = {
  ...electronics,
  id: "cat_finance",
  name: "Financing charges",
};

function sumComponent(
  effects: { component: string; effectDirection: string; amountPaise: number; targetType: string }[],
  component: string,
  targetType?: string,
): number {
  let s = 0;
  for (const e of effects) {
    if (e.component !== component) continue;
    if (targetType && e.targetType !== targetType) continue;
    s += e.effectDirection === "increase" ? e.amountPaise : -e.amountPaise;
  }
  return s;
}

describe("T-126 mobile purchase → EMI lifecycle", () => {
  const PRINCIPAL = 6_000_000; // ₹60,000
  const CARD = "card_b";
  const BANK = "acc_hdfc";

  it("counts purchase once; conversion restructures liability; payment is not expense", () => {
    const purchase = baseTx({
      id: "tx_mobile",
      type: "expense",
      paymentMode: "credit_card",
      linkedCardId: CARD,
      categoryId: "cat_electronics",
      amountPaise: PRINCIPAL,
      amount: 60_000,
      date: "2026-05-01",
    });

    const { plan, installments } = createCardEmiPlanFromPurchase({
      id: "emi_mobile_12",
      userId: "u1",
      cardId: CARD,
      purchaseTransactionIds: ["tx_mobile"],
      principalPaise: PRINCIPAL,
      annualRateBps: 1500,
      tenureMonths: 12,
      startDate: "2026-06-01",
    });
    expect(installments).toHaveLength(12);
    expect(totalPrincipalInSchedule(buildCardEmiSchedule({
      planId: plan.id,
      userId: "u1",
      principalPaise: PRINCIPAL,
      annualRateBps: 1500,
      tenureMonths: 12,
      startDate: "2026-06-01",
    }))).toBe(PRINCIPAL);

    const processingFee = 999_00; // ₹999
    const gstOnFee = Math.round(processingFee * 0.18);

    const conversion = baseTx({
      id: "tx_emi_convert",
      type: "card_emi_conversion",
      linkedCardId: CARD,
      linkedCardEmiPlanId: plan.id,
      categoryId: "cat_finance",
      amountPaise: PRINCIPAL,
      amount: 60_000,
      feePaise: processingFee,
      taxPaise: gstOnFee,
      date: "2026-05-05",
      merchantOrPerson: "EMI conversion",
    });

    const first = installments[0];
    const charge = baseTx({
      id: "tx_emi_bill_1",
      type: "card_emi_charge",
      linkedCardId: CARD,
      linkedCardEmiPlanId: plan.id,
      categoryId: "cat_finance",
      amountPaise: first.emiPaise,
      amount: first.emiPaise / 100,
      principalComponentPaise: first.principalPaise,
      interestPaise: first.interestPaise,
      feePaise: 0,
      taxPaise: 0,
      date: first.dueDate,
      merchantOrPerson: "EMI installment 1",
    });

    const statementDue = first.emiPaise + processingFee + gstOnFee;
    const payment = baseTx({
      id: "tx_cc_pay",
      type: "cc_payment",
      paymentMode: "bank_transfer",
      accountId: BANK,
      linkedCardId: CARD,
      amountPaise: statementDue,
      amount: statementDue / 100,
      date: "2026-06-20",
      merchantOrPerson: "Card bill pay",
    });

    const txs = [purchase, conversion, charge, payment];
    const ctx = buildFinanceEventBuilderContext([electronics, financeCat], []);
    const { events, effects } = buildFullLedger("u1", txs, ctx);

    // 1–5: purchase once as expense; bank untouched by purchase
    const expensePurchase = effects.filter(
      (e) =>
        e.targetType === "expense_category" &&
        e.targetId === "cat_electronics" &&
        e.component === "expense",
    );
    expect(expensePurchase).toHaveLength(1);
    expect(expensePurchase[0].amountPaise).toBe(PRINCIPAL);
    expect(
      effects.some(
        (e) =>
          e.eventId === `fevt_${purchase.id}` &&
          e.targetType === "account" &&
          e.effectDirection === "decrease",
      ),
    ).toBe(false);

    // 6–8: conversion does not change consumption expense for electronics
    const expenseAfterConversion = calculateExpenseView(events, effects, 2026, 5);
    // May 2026: purchase + fee + tax (charge is June)
    expect(expenseAfterConversion).toBe(PRINCIPAL + processingFee + gstOnFee);

    const emiPrincipal = sumComponent(effects, "principal", "card_emi_plan");
    // After conversion + first billing: principal on plan = PRINCIPAL - first.principal
    expect(emiPrincipal).toBe(PRINCIPAL - first.principalPaise);

    // Conversion net card liability before fees: 0 change from restructure
    const conversionEffects = effects.filter((e) => e.eventId === `fevt_${conversion.id}`);
    const retailDown = conversionEffects.find(
      (e) => e.targetType === "credit_card" && e.effectDirection === "decrease" && e.component === "liability",
    );
    const emiUp = conversionEffects.find(
      (e) => e.targetType === "card_emi_plan" && e.effectDirection === "increase",
    );
    expect(retailDown?.amountPaise).toBe(PRINCIPAL);
    expect(emiUp?.amountPaise).toBe(PRINCIPAL);

    // 10–13: processing fee + GST posted as financing expense + liability
    expect(
      conversionEffects.some((e) => e.component === "fee" && e.amountPaise === processingFee),
    ).toBe(true);
    expect(
      conversionEffects.some((e) => e.component === "tax" && e.amountPaise === gstOnFee),
    ).toBe(true);

    // 14–17: payment reduces bank + liability; no new consumption expense
    const payEffects = effects.filter((e) => e.eventId === `fevt_${payment.id}`);
    expect(payEffects.some((e) => e.targetType === "account" && e.effectDirection === "decrease")).toBe(
      true,
    );
    expect(payEffects.some((e) => e.component === "expense")).toBe(false);
    expect(calculateIncomeView(events, effects, 2026, 6)).toBe(0);

    // Electronics purchase still exactly once across all months
    const allElec = effects.filter(
      (e) => e.targetType === "expense_category" && e.targetId === "cat_electronics",
    );
    expect(allElec).toHaveLength(1);

    // After paying first statement (EMI + conversion fee/tax), retail card liability may be 0;
    // remaining EMI principal stays on the plan sub-ledger.
    const remainingEmiPrincipal = sumComponent(effects, "principal", "card_emi_plan");
    expect(remainingEmiPrincipal).toBe(PRINCIPAL - first.principalPaise);
    expect(remainingEmiPrincipal).toBeGreaterThan(0);
    expect(calculateCardOutstanding(CARD, effects, "u1")).toBe(0);

    // Net financing cost includes fee+tax+interest (first installment interest)
    const fin = calculateNetFinancingCostPaise({
      totalInterestPaise: first.interestPaise,
      totalFeePaise: processingFee,
      totalTaxPaise: gstOnFee,
    });
    expect(fin.netFinancingCostPaise).toBe(first.interestPaise + processingFee + gstOnFee);
  });
});

describe("Card EMI edge cases T-128/T-130/T-131", () => {
  it("T-130 no-cost EMI: net financing cost can still be non-zero after fees", () => {
    const rows = buildCardEmiSchedule({
      planId: "nc",
      userId: "u1",
      principalPaise: 1_200_000,
      annualRateBps: 1500,
      tenureMonths: 6,
      startDate: "2026-05-01",
      noCostEmi: true,
      merchantSubsidyPaise: 50_000,
    });
    expect(rows.every((r) => r.interestPaise === 0)).toBe(true);
    const fin = calculateNetFinancingCostPaise({
      totalInterestPaise: 0,
      totalFeePaise: 10_000,
      totalTaxPaise: 1_800,
      merchantSubsidyPaise: 50_000,
    });
    expect(fin.grossFinancingCostPaise).toBe(11_800);
    expect(fin.netFinancingCostPaise).toBe(0);
  });

  it("T-131 refund during EMI does not create income", () => {
    const food: Category = {
      ...electronics,
      id: "cat_food",
      name: "Food",
    };
    const txs = [
      baseTx({
        id: "buy",
        type: "expense",
        linkedCardId: "card_b",
        categoryId: "cat_food",
        amountPaise: 2_000_000,
        amount: 20_000,
      }),
      baseTx({
        id: "convert",
        type: "card_emi_conversion",
        linkedCardId: "card_b",
        linkedCardEmiPlanId: "plan_r",
        amountPaise: 2_000_000,
        amount: 20_000,
        categoryId: "cat_finance",
      }),
      baseTx({
        id: "refund_partial",
        type: "refund",
        paymentMode: "credit_card",
        linkedCardId: "card_b",
        categoryId: "cat_food",
        amountPaise: 500_000,
        amount: 5_000,
      }),
    ];
    const { effects } = buildFullLedger(
      "u1",
      txs,
      buildFinanceEventBuilderContext([food, financeCat], []),
    );
    expect(effects.some((e) => e.component === "income")).toBe(false);
    expect(
      effects.some(
        (e) =>
          e.targetType === "expense_category" &&
          e.targetId === "cat_food" &&
          e.effectDirection === "decrease" &&
          e.amountPaise === 500_000,
      ),
    ).toBe(true);
  });
});
