export type MatchStatus = "suggested" | "confirmed" | "rejected";

export function nextReconciliationStatus(
  action: "confirm" | "reject" | "unmatch",
): MatchStatus {
  if (action === "confirm") return "confirmed";
  if (action === "reject") return "rejected";
  return "suggested";
}
