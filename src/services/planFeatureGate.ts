/**
 * Phase 14 — client-side plan feature gate.
 *
 * The server is the source of truth (php/helpers/billing.php). This module
 * exists so React components can render an "upgrade required" affordance
 * without making a round-trip per check.
 */

export type PlanFeatureKey =
  | "exports"
  | "advanced_reports"
  | "ca_reports"
  | "ai_suggestions"
  | "advanced_reports_enabled"
  | "ca_reports_enabled"
  | "ai_suggestions_per_day"
  | "max_accounts"
  | "max_cards"
  | "max_loans"
  | "max_goals"
  | "max_transactions_per_month"
  | "max_exports_per_month"
  | "max_ai_suggestions_per_day"
  | "attachment_storage_mb";

export interface PlanFeature {
  isEnabled: boolean;
  limitValue?: number;
  limitUnit?: string | null;
}

export interface UserPlanSnapshot {
  planId: number | null;
  planCode: string | null;
  status: "active" | "trial" | "past_due" | "cancelled" | "pending" | "expired" | "none";
  features: Partial<Record<PlanFeatureKey, PlanFeature>>;
}

/** Is the boolean feature unlocked? */
export function isFeatureUnlocked(snapshot: UserPlanSnapshot, key: PlanFeatureKey): boolean {
  const f = snapshot.features[key];
  if (!f) return false;
  return f.isEnabled === true;
}

/**
 * Remaining quota under a numeric limit.
 * Returns:
 *   - Infinity if the plan has no limit set (= unlimited)
 *   - 0+ integer for the remaining count
 *   - 0 if the feature is locked entirely
 */
export function remainingQuota(
  snapshot: UserPlanSnapshot,
  key: PlanFeatureKey,
  usedInWindow: number,
): number {
  const f = snapshot.features[key];
  if (!f) return 0;
  if (!f.isEnabled) return 0;
  if (f.limitValue === undefined || f.limitValue === null) return Number.POSITIVE_INFINITY;
  const remaining = f.limitValue - Math.max(0, usedInWindow);
  return Math.max(0, remaining);
}

/**
 * Human-friendly upgrade copy. Keep this generic — UI overlays can localise.
 */
export function lockReason(snapshot: UserPlanSnapshot, key: PlanFeatureKey): string {
  if (snapshot.status === "none" || snapshot.status === "expired" || snapshot.status === "cancelled") {
    return `This is a paid feature. Activate a plan to unlock ${humanLabel(key)}.`;
  }
  return `${humanLabel(key)} is not available on your current plan. Upgrade to unlock it.`;
}

export function humanLabel(key: PlanFeatureKey): string {
  switch (key) {
    case "advanced_reports_enabled": return "Advanced reports";
    case "advanced_reports": return "Advanced reports";
    case "ca_reports_enabled":       return "CA-grade reports";
    case "ca_reports":       return "CA-grade reports";
    case "exports": return "Exports";
    case "ai_suggestions": return "AI suggestions";
    case "ai_suggestions_per_day":   return "AI suggestions";
    case "max_ai_suggestions_per_day": return "More AI suggestions";
    case "max_accounts":             return "More accounts";
    case "max_cards":                return "More cards";
    case "max_loans":                return "More loans";
    case "max_goals":                return "More goals";
    case "max_transactions_per_month": return "Unlimited transactions";
    case "max_exports_per_month":    return "More exports";
    case "attachment_storage_mb":    return "More attachment storage";
    default: return key;
  }
}
