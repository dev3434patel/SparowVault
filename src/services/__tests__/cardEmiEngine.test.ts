import { describe, it, expect } from "vitest";
import {
  buildCardEmiSchedule,
  createCardEmiPlanFromPurchase,
  totalPrincipalInSchedule,
  CARD_EMI_CALCULATION_VERSION,
} from "@/services/cardEmiEngine";
import { calculateEMI } from "@/utils/money";

describe("cardEmiEngine", () => {
  /** T-127 golden: ₹60,000 @ 15% × 12 → ~₹5,415.50/mo, sum principal exact */
  it("T-127 golden EMI schedule", () => {
    const principalPaise = 6_000_000;
    const emi = calculateEMI(principalPaise, 15, 12);
    expect(emi).toBeGreaterThanOrEqual(541_500);
    expect(emi).toBeLessThanOrEqual(541_600);

    const rows = buildCardEmiSchedule({
      planId: "plan_t127",
      userId: "u1",
      principalPaise,
      annualRateBps: 1500,
      tenureMonths: 12,
      startDate: "2026-05-01",
    });
    expect(rows).toHaveLength(12);
    expect(rows[0].emiPaise).toBe(emi);
    expect(totalPrincipalInSchedule(rows)).toBe(principalPaise);
    expect(rows[11].closingPrincipalPaise).toBe(0);
  });

  it("T-130 no-cost EMI splits principal evenly with zero interest", () => {
    const rows = buildCardEmiSchedule({
      planId: "plan_nc",
      userId: "u1",
      principalPaise: 1_200_000,
      annualRateBps: 1500,
      tenureMonths: 6,
      startDate: "2026-05-01",
      noCostEmi: true,
    });
    expect(rows.every((r) => r.interestPaise === 0)).toBe(true);
    expect(rows[0].emiPaise).toBe(200_000);
    expect(totalPrincipalInSchedule(rows)).toBe(1_200_000);
  });

  it("createCardEmiPlanFromPurchase sets calculationVersion", () => {
    const { plan, installments } = createCardEmiPlanFromPurchase({
      id: "emi_plan_1",
      userId: "u1",
      cardId: "card_b",
      purchaseTransactionIds: ["tx_mobile"],
      principalPaise: 6_000_000,
      annualRateBps: 1500,
      tenureMonths: 12,
      startDate: "2026-05-01",
    });
    expect(plan.calculationVersion).toBe(CARD_EMI_CALCULATION_VERSION);
    expect(installments).toHaveLength(12);
  });
});
