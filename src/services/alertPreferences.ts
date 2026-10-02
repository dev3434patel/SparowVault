import type { ProfileSettings } from "@/types";

export type AlertPreferenceKey = keyof ProfileSettings["warningPreferences"];

const BUDGET = new Set([
  "budget_over",
  "budget_warn",
  "budget_projected_overrun",
  "budget_burn_high",
  "budget_smart_overrun",
]);

const DUE = new Set([
  "fixed_bill_due",
  "cc_overdue",
  "cc_due_soon",
  "cc_due_week",
  "cc_over_limit",
  "cc_util_80",
  "cc_util_50",
  "cc_util_30",
  "cc_min_due",
  "emi_overdue",
  "emi_due_soon",
]);

const SAVINGS = new Set([
  "emergency_fund_low",
  "safe_daily_spend_danger",
  "goal_shortfall",
  "negative_cashflow",
  "low_savings",
]);

export function alertPreferenceKey(kind: string): AlertPreferenceKey {
  if (BUDGET.has(kind)) return "budgetAlerts";
  if (kind.startsWith("udhari_")) return "udhariAlerts";
  if (DUE.has(kind)) return "dueAlerts";
  if (kind === "unusual_spend" || kind === "recurring_expense_spike") return "unusualSpendAlerts";
  if (kind === "duplicate_candidate") return "duplicateAlerts";
  if (SAVINGS.has(kind)) return "savingsAlerts";
  return "budgetAlerts";
}

export function alertPreferenceEnabled(
  prefs: ProfileSettings["warningPreferences"] | undefined,
  kind: string,
): boolean {
  const key = alertPreferenceKey(kind);
  if (!prefs) return true;
  return prefs[key] !== false;
}
