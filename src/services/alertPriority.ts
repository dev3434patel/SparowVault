/**
 * Alert priority ranks P0–P6 (consequence order). Higher urgency = lower number.
 */
export type AlertPriorityRank = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export function alertPriorityFromSeverity(
  severity: "info" | "warning" | "danger" | "success",
  kind?: string,
): AlertPriorityRank {
  if (kind?.includes("integrity") || kind?.includes("sync_fail")) return 0;
  if (severity === "danger") {
    if (kind?.includes("overdue") || kind?.includes("due")) return 1;
    if (kind?.includes("cashflow") || kind?.includes("liquidity")) return 2;
    return 2;
  }
  if (severity === "warning") {
    if (kind?.includes("interest") || kind?.includes("financing")) return 3;
    if (kind?.includes("budget")) return 4;
    return 4;
  }
  if (severity === "success") return 6;
  return 5;
}
