import layoutRegistry from "../../../php/config/statement_layouts.json";
import type { BankId } from "./types";
import type { LayoutSupportStatus } from "./observations";

export type StatementLayoutRecord = (typeof layoutRegistry.layouts)[number];

export const STATEMENT_LAYOUTS = layoutRegistry.layouts as StatementLayoutRecord[];
export const STATEMENT_TARGET_BANK_IDS = layoutRegistry.targetBankIds as BankId[];

export function layoutsForBank(bankId: BankId | string): StatementLayoutRecord[] {
  return STATEMENT_LAYOUTS.filter((l) => l.bankId === bankId);
}

export function bestLayoutStatus(bankId: BankId | string): LayoutSupportStatus | "unknown" {
  const layouts = layoutsForBank(bankId);
  if (!layouts.length) return "unknown";
  const order: LayoutSupportStatus[] = [
    "verified-for-scope",
    "real-corpus-tested",
    "synthetic-tested",
    "registered",
    "disabled",
  ];
  for (const status of order) {
    if (layouts.some((l) => l.status === status)) return status;
  }
  return "registered";
}

/** User-facing support label — never claim name-only banks as fully supported. */
export function supportLabelForBank(bankId: BankId | string): string {
  const status = bestLayoutStatus(bankId);
  switch (status) {
    case "verified-for-scope":
      return "Money fields verified for the certified layout scope";
    case "real-corpus-tested":
      return "Real-corpus tested; confirm layout before posting";
    case "synthetic-tested":
      return "Bank recognized; synthetic layout tested — real-bank accuracy not certified";
    case "disabled":
      return "Layout disabled for auto-import";
    case "registered":
      return "Bank recognized; layout needs review (not certified)";
    default:
      return "Unsupported or unknown layout";
  }
}

export function isAutoPostAllowed(bankId: BankId | string): boolean {
  const status = bestLayoutStatus(bankId);
  return status === "verified-for-scope" || status === "synthetic-tested";
}

export function layoutScorecard() {
  const byStatus: Record<string, number> = {};
  for (const layout of STATEMENT_LAYOUTS) {
    byStatus[layout.status] = (byStatus[layout.status] ?? 0) + 1;
  }
  return {
    version: layoutRegistry.version,
    layoutCount: STATEMENT_LAYOUTS.length,
    targetBankCount: STATEMENT_TARGET_BANK_IDS.length,
    byStatus,
    layouts: STATEMENT_LAYOUTS.map((l) => ({
      layoutId: l.layoutId,
      bankId: l.bankId,
      status: l.status,
      limitations: l.limitations,
    })),
  };
}
