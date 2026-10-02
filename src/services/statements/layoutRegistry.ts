import layoutRegistry from "../../../php/config/statement_layouts.json";
import { BANKS, type BankId } from "./types";
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
      return "Unsupported or unknown layout (not certified)";
  }
}

export type BankEvidenceClass = "fixture-tested" | "registered-only" | "no-layout-spec" | "verified-for-scope";

export function bestLayoutForBank(bankId: BankId | string): StatementLayoutRecord | null {
  const layouts = layoutsForBank(bankId);
  if (!layouts.length) return null;
  const status = bestLayoutStatus(bankId);
  return layouts.find((layout) => layout.status === status) ?? layouts[0];
}

/** Synthetic fixtures are not verified-for-scope. Name recognition is not a layout spec. */
export function evidenceClassForBank(bankId: BankId | string): BankEvidenceClass {
  const status = bestLayoutStatus(bankId);
  if (status === "verified-for-scope") return "verified-for-scope";
  if (status === "synthetic-tested") return "fixture-tested";
  if (status === "unknown") return "no-layout-spec";
  return "registered-only";
}

/** Blocking analyze-time notice for banks that have no fixture-tested layout spec. */
export function uncertifiedLayoutIssue(bankId: BankId | string): string | null {
  const status = bestLayoutStatus(bankId);
  if (status === "synthetic-tested" || status === "verified-for-scope") return null;
  return supportLabelForBank(bankId);
}

export function statementEvidenceInventory() {
  const banks = BANKS.map((bank) => {
    const layout = bestLayoutForBank(bank.id);
    const evidenceClass = evidenceClassForBank(bank.id);
    return {
      bankId: bank.id,
      evidenceClass,
      layoutId: layout?.layoutId ?? null,
      testName: evidenceClass === "fixture-tested" && layout ? `reconciles ${layout.layoutId}` : `${bank.id} stays ${evidenceClass}`,
    };
  });
  const count = (evidenceClass: BankEvidenceClass) => banks.filter((bank) => bank.evidenceClass === evidenceClass).length;
  return {
    recognized: banks.length,
    fixtureTested: count("fixture-tested"),
    verifiedForScope: count("verified-for-scope"),
    registeredOnly: count("registered-only"),
    noLayoutSpec: count("no-layout-spec"),
    banks,
  };
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
