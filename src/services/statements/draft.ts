/**
 * Optional on-device review draft — never stores PDF bytes or passwords.
 */
const DRAFT_PREFIX = "sparowvault_statement_draft_v1:";

export interface StatementReviewDraft {
  version: 1;
  userId: string;
  documentHash: string;
  fileName: string;
  bank: string | null;
  accountId: string;
  parserVersion: string;
  savedAt: string;
  expiresAt: string;
  openingText: string;
  closingText: string;
  decisions: Record<string, unknown>;
  currencyConfirmed: boolean;
  ocrSourceConfirmed: boolean;
}

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function key(userId: string): string {
  return `${DRAFT_PREFIX}${userId}`;
}

export function saveStatementDraft(draft: Omit<StatementReviewDraft, "version" | "savedAt" | "expiresAt">): void {
  if (typeof localStorage === "undefined") return;
  const now = Date.now();
  const payload: StatementReviewDraft = {
    ...draft,
    version: 1,
    savedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + MAX_AGE_MS).toISOString(),
  };
  localStorage.setItem(key(draft.userId), JSON.stringify(payload));
}

export function loadStatementDraft(userId: string): StatementReviewDraft | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(key(userId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StatementReviewDraft;
    if (parsed.version !== 1 || parsed.userId !== userId) {
      clearStatementDraft(userId);
      return null;
    }
    if (Date.parse(parsed.expiresAt) < Date.now()) {
      clearStatementDraft(userId);
      return null;
    }
    return parsed;
  } catch {
    clearStatementDraft(userId);
    return null;
  }
}

export function clearStatementDraft(userId: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(key(userId));
}

/** Resume requires the same file hash; password must be re-entered separately for viewing. */
export function draftMatchesFile(draft: StatementReviewDraft, documentHash: string, userId: string): boolean {
  return draft.userId === userId && draft.documentHash === documentHash;
}
