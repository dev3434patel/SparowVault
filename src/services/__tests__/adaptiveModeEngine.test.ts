import { describe, it, expect } from "vitest";
import {
  recommendAdaptiveMode,
  calculateFreeCashUntilIncome,
} from "@/services/adaptiveModeEngine";

describe("adaptiveModeEngine", () => {
  it("recommends essential for cash-heavy simple profiles", () => {
    const r = recommendAdaptiveMode({
      activeCardCount: 0,
      activeLoanCount: 0,
      activeEmiPlanCount: 0,
      accountCount: 2,
      investmentCount: 0,
      householdSize: 1,
      cashTransactionRatio: 0.6,
      debtServiceRatio: 0.1,
      emergencyMonths: 1,
    });
    expect(r.mode).toBe("essential");
  });

  it("recommends family for multi-card households", () => {
    const r = recommendAdaptiveMode({
      activeCardCount: 4,
      activeLoanCount: 2,
      activeEmiPlanCount: 2,
      accountCount: 4,
      investmentCount: 1,
      householdSize: 3,
      cashTransactionRatio: 0.2,
      debtServiceRatio: 0.25,
      emergencyMonths: 4,
    });
    expect(r.mode).toBe("family");
  });

  it("computes safe daily spend from free cash", () => {
    const r = calculateFreeCashUntilIncome({
      liquidAvailablePaise: 42_000_00,
      reliableExpectedIncomePaise: 75_000_00,
      committedOutflowsPaise: 64_500_00,
      safetyBufferPaise: 10_000_00,
      daysUntilHorizon: 30,
    });
    expect(r.freeCashPaise).toBe(42_500_00);
    expect(r.safeDailySpendPaise).toBe(Math.floor(42_500_00 / 30));
  });
});
