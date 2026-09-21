/**
 * Shared review digest material (TS ↔ PHP must stay aligned).
 * Binds revision to financial payload — not bank authenticity.
 */
import type { ReviewManifestInput } from "./reviewState";
import { buildReviewManifest } from "./reviewState";

export function reviewDigestHexFromManifest(manifestJson: string): string {
  // Synchronous hex for Node/tests; browser uses async subtle in UI.
  // Prefer importing node:crypto only from test/scripts; in Vite we use subtle.
  return manifestJson;
}

export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function buildReviewDigest(input: ReviewManifestInput): Promise<string> {
  return sha256Hex(buildReviewManifest(input));
}

/** Material shape mirrored by php/helpers/statement_review_digest.php */
export function buildServerAlignedDigestMaterial(input: {
  accountId: string;
  bank: string | null;
  documentHash: string;
  parserVersion: string;
  openingPaise: number;
  closingPaise: number;
  order: string;
  rows: Array<{
    id: string;
    date: string;
    debitPaise: number;
    creditPaise: number;
    balancePaise: number | null;
    description: string;
    reference: string;
    decision: {
      include: boolean;
      reviewed: boolean;
      kind: string;
      categoryId: string;
      scope: string;
      counterpartId: string;
      matchTransactionId?: string;
    };
  }>;
  sourceEvidence: Record<string, unknown>;
  reviewRevision: number | null;
}): string {
  return JSON.stringify({
    accountId: input.accountId,
    bank: input.bank,
    documentHash: input.documentHash,
    parserVersion: input.parserVersion,
    openingPaise: input.openingPaise,
    closingPaise: input.closingPaise,
    order: input.order,
    rows: input.rows.map((r) => ({
      id: r.id,
      date: r.date,
      debitPaise: r.debitPaise,
      creditPaise: r.creditPaise,
      balancePaise: r.balancePaise,
      description: r.description,
      reference: r.reference,
      decision: {
        include: r.decision.include,
        reviewed: r.decision.reviewed,
        kind: r.decision.kind,
        categoryId: r.decision.categoryId,
        scope: r.decision.scope,
        counterpartId: r.decision.counterpartId,
        matchTransactionId: r.decision.matchTransactionId ?? null,
      },
    })),
    sourceEvidence: input.sourceEvidence ?? {},
    reviewRevision: input.reviewRevision,
  });
}
