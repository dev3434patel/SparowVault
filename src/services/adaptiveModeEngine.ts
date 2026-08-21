/**
 * vNext Phase J — recommend Essential / Family / Wealth adaptive mode from signals.
 */

export type AdaptiveFinanceMode = "essential" | "family" | "wealth";

export interface AdaptiveModeSignals {
  activeCardCount: number;
  activeLoanCount: number;
  activeEmiPlanCount: number;
  accountCount: number;
  investmentCount: number;
  householdSize: number;
  cashTransactionRatio: number; // 0–1
  debtServiceRatio: number; // EMI+card dues / income
  emergencyMonths: number;
}

export function recommendAdaptiveMode(signals: AdaptiveModeSignals): {
  mode: AdaptiveFinanceMode;
  reasons: string[];
} {
  const reasons: string[] = [];
  let wealthScore = 0;
  let familyScore = 0;
  let essentialScore = 0;

  if (signals.investmentCount >= 3 || signals.accountCount >= 8) {
    wealthScore += 2;
    reasons.push("Multiple investments or accounts");
  }
  if (signals.activeCardCount >= 3 || signals.activeEmiPlanCount >= 2 || signals.activeLoanCount >= 2) {
    familyScore += 2;
    reasons.push("Multiple cards/loans/EMIs");
  }
  if (signals.householdSize >= 2) {
    familyScore += 1;
    reasons.push("Household size ≥ 2");
  }
  if (signals.cashTransactionRatio >= 0.45 || signals.debtServiceRatio >= 0.4 || signals.emergencyMonths < 2) {
    essentialScore += 2;
    reasons.push("Cash-heavy or tight liquidity signals");
  }
  if (signals.activeCardCount <= 1 && signals.investmentCount === 0) {
    essentialScore += 1;
  }

  if (wealthScore >= familyScore && wealthScore >= essentialScore && wealthScore > 0) {
    return { mode: "wealth", reasons };
  }
  if (familyScore >= essentialScore && familyScore > 0) {
    return { mode: "family", reasons };
  }
  return { mode: "essential", reasons: reasons.length ? reasons : ["Default essential cashflow mode"] };
}

/** Payday-to-payday free cash planning (liquidity, not savings). */
export function calculateFreeCashUntilIncome(input: {
  liquidAvailablePaise: number;
  reliableExpectedIncomePaise: number;
  committedOutflowsPaise: number;
  safetyBufferPaise: number;
  daysUntilHorizon: number;
}): {
  freeCashPaise: number;
  safeDailySpendPaise: number;
} {
  const freeCashPaise =
    input.liquidAvailablePaise +
    input.reliableExpectedIncomePaise -
    input.committedOutflowsPaise -
    input.safetyBufferPaise;
  const days = Math.max(1, Math.round(input.daysUntilHorizon));
  return {
    freeCashPaise,
    safeDailySpendPaise: Math.max(0, Math.floor(freeCashPaise / days)),
  };
}
