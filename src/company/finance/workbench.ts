export type GstState = "draft" | "validated" | "exported";
export type BridgeState = "proposed" | "company_posted" | "personal_applied" | "completed" | "retry";

export function nextGstState(current: GstState): GstState | "blocked" {
  if (current === "draft") return "validated";
  if (current === "validated") return "exported";
  return "blocked";
}

export function gstExportIsFiled(): false {
  return false;
}

export function nextBridgeState(current: BridgeState, step: "post_company" | "apply_personal" | "complete" | "fail"): BridgeState {
  if (step === "fail") return "retry";
  if (current === "proposed" && step === "post_company") return "company_posted";
  if (current === "company_posted" && step === "apply_personal") return "personal_applied";
  if (current === "personal_applied" && step === "complete") return "completed";
  if (current === "retry" && step === "post_company") return "company_posted";
  return current;
}

export function reimbursementPair(amountPaise: number) {
  return {
    companyPayablePaise: amountPaise,
    personalReceivablePaise: amountPaise,
    sameDatabaseTransaction: false as const,
  };
}

export function groupManagementTotal(pairs: Array<{ leftPaise: number; rightPaise: number; matched: boolean }>) {
  let total = 0;
  for (const pair of pairs) {
    total += pair.leftPaise;
    if (!pair.matched) total += pair.rightPaise;
  }
  return { totalPaise: total, statutoryConsolidation: false as const };
}

export function recurringStartsAsDraft(): "draft" {
  return "draft";
}
