/**
 * Issuer schedule precedence — ACTUAL > user-confirmed issuer > estimate.
 */
export type ScheduleSource = "issuer_actual" | "user_confirmed" | "estimated" | "projected";

export interface ScheduleAmountCandidate {
  source: ScheduleSource;
  amountPaise: number;
  label?: string;
}

const RANK: Record<ScheduleSource, number> = {
  issuer_actual: 100,
  user_confirmed: 80,
  estimated: 40,
  projected: 20,
};

/** Higher rank wins. Ties keep the first seen. */
export function pickAuthoritativeScheduleAmount(
  candidates: ScheduleAmountCandidate[],
): ScheduleAmountCandidate | null {
  if (candidates.length === 0) return null;
  let best = candidates[0]!;
  for (const c of candidates.slice(1)) {
    if (RANK[c.source] > RANK[best.source]) best = c;
  }
  return best;
}

export function scheduleSourceRank(source: ScheduleSource): number {
  return RANK[source];
}

/**
 * Reporting / cash obligation must use actual when present, never overwrite projection.
 */
export function resolveEmiObligationPaise(input: {
  projectedPaise: number;
  issuerActualPaise?: number | null;
  userConfirmedPaise?: number | null;
}): { amountPaise: number; source: ScheduleSource; projectedPreservedPaise: number } {
  const projectedPreservedPaise = input.projectedPaise;
  if (input.issuerActualPaise != null && input.issuerActualPaise > 0) {
    return {
      amountPaise: input.issuerActualPaise,
      source: "issuer_actual",
      projectedPreservedPaise,
    };
  }
  if (input.userConfirmedPaise != null && input.userConfirmedPaise > 0) {
    return {
      amountPaise: input.userConfirmedPaise,
      source: "user_confirmed",
      projectedPreservedPaise,
    };
  }
  return {
    amountPaise: input.projectedPaise,
    source: "estimated",
    projectedPreservedPaise,
  };
}
