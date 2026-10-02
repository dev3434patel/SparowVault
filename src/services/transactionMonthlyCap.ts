import { format } from "date-fns";
import type { Transaction } from "@/types";
import type { UserPlanSnapshot } from "@/services/planFeatureGate";
import { snapshotFromEffectiveFeatures } from "@/services/modulePolicy";

export const MONTHLY_TRANSACTION_CAP_MESSAGE =
  "You have reached your plan's monthly transaction limit. Upgrade or wait until next month to add more.";

/** null = no numeric cap (unlimited). */
export function monthlyTransactionLimit(snapshot: UserPlanSnapshot | null): number | null {
  const feature = snapshot?.features.max_transactions_per_month;
  if (!feature) return null;
  if (!feature.isEnabled) return 0;
  if (feature.limitValue === undefined || feature.limitValue === null) return null;
  return feature.limitValue;
}

export function countTransactionsInCurrentCalendarMonth(
  transactions: readonly Transaction[],
  userId: string,
): number {
  const month = format(new Date(), "yyyy-MM");
  let count = 0;
  for (const tx of transactions) {
    if (tx.userId !== userId || tx.isDeleted) continue;
    if (!tx.date.startsWith(month)) continue;
    count++;
  }
  return count;
}

export function transactionCreateBlockedByMonthlyCap(
  snapshot: UserPlanSnapshot | null,
  transactions: readonly Transaction[],
  userId: string,
): string | null {
  const limit = monthlyTransactionLimit(snapshot);
  if (limit === null) return null;
  const used = countTransactionsInCurrentCalendarMonth(transactions, userId);
  if (used < limit) return null;
  return MONTHLY_TRANSACTION_CAP_MESSAGE;
}

export function assertTransactionCreateAllowed(
  effectiveFeatures: Record<string, boolean | number | undefined>,
  transactions: readonly Transaction[],
  userId: string,
): void {
  const snapshot = snapshotFromEffectiveFeatures(effectiveFeatures);
  const blocked = transactionCreateBlockedByMonthlyCap(snapshot, transactions, userId);
  if (blocked) throw new Error(blocked);
}
