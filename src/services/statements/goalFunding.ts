/**
 * Goal earmarking vs funded transfer — statement-adjacent whole-product rule (ST-16).
 * Earmarking inside an existing account does not move cash or create a new asset.
 * A funded transfer requires a real destination account and moves money between accounts.
 */

export interface GoalFundingEffect {
  kind: "earmark" | "funded_transfer";
  sourceAccountBalanceDeltaPaise: number;
  destinationAccountBalanceDeltaPaise: number;
  netWorthDeltaPaise: number;
  allocatedInsideSourceDeltaPaise: number;
  reason: string;
}

export function goalEarmarkEffect(amountPaise: number): GoalFundingEffect {
  if (amountPaise < 0) throw new Error("Earmark amount must be non-negative");
  return {
    kind: "earmark",
    sourceAccountBalanceDeltaPaise: 0,
    destinationAccountBalanceDeltaPaise: 0,
    netWorthDeltaPaise: 0,
    allocatedInsideSourceDeltaPaise: amountPaise,
    reason: "Same-account earmark changes allocation only; bank balance and net worth are unchanged",
  };
}

export function fundedGoalTransferEffect(amountPaise: number): GoalFundingEffect {
  if (amountPaise <= 0) throw new Error("Funded transfer amount must be positive");
  return {
    kind: "funded_transfer",
    sourceAccountBalanceDeltaPaise: -amountPaise,
    destinationAccountBalanceDeltaPaise: amountPaise,
    netWorthDeltaPaise: 0,
    allocatedInsideSourceDeltaPaise: 0,
    reason: "Real transfer moves cash between two accounts; net worth unchanged, both balances change",
  };
}
