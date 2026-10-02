import { getDB } from "@/db/database";
import { cloudRepoGet, cloudRepoList } from "@/lib/cloud/repoClient";
import { cardStatementRepo } from "@/repositories";
import { saveCardStatement } from "@/services/personalBookWorkflows";
import type { CardMoneyEvidence, CardStatement, ImportSource, ReconciliationMatch } from "@/types";
import { type CardMoneyFactInput, mergeCardMoneyFact } from "./cardMoneyFact";
import type { StatementImportResult } from "./types";

/** Reviewed card lines. Interest and fees are counted only when a row says so. */
export type ReviewedCardKind = "purchase" | "payment" | "interest" | "fee" | "refund" | "tax" | "other";

export interface ReviewedCardImportRow {
  amountPaise: number;
  direction: "debit" | "credit";
  kindHint: ReviewedCardKind | string;
}

export interface ReviewedCardImport {
  cardId: string;
  openingBalancePaise: number;
  closingBalancePaise: number;
  statementDate: string;
  cycleStartDate: string;
  cycleEndDate: string;
  rows: ReviewedCardImportRow[];
  /** Absent means the statement did not show this figure. */
  minimumDue?: CardMoneyFactInput;
  interest?: CardMoneyFactInput;
  fees?: CardMoneyFactInput;
}

export interface StatementImportCache {
  putImportSource(row: ImportSource): Promise<void>;
  putReconciliationMatches(rows: ReconciliationMatch[]): Promise<void>;
}

type CardStatementStore = {
  list(userId: string): Promise<CardStatement[]>;
  create(input: { userId: string; data: Partial<CardStatement> }): Promise<CardStatement>;
  update(id: string, patch: Partial<CardStatement>): Promise<CardStatement | undefined>;
};

const CARD_KINDS = new Set<ReviewedCardKind>(["purchase", "payment", "interest", "fee", "refund", "tax", "other"]);

function isoDate(value: string | null | undefined): string {
  const date = (value ?? "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
}

export function reviewedCardCycleDates(input: {
  periodFrom: string | null;
  periodTo: string | null;
  rowDates: string[];
}): { cycleStartDate: string; cycleEndDate: string; statementDate: string } {
  const dates = input.rowDates.map((date) => isoDate(date)).filter(Boolean).sort();
  const cycleStartDate = isoDate(input.periodFrom) || dates[0] || "";
  const cycleEndDate = isoDate(input.periodTo) || dates[dates.length - 1] || cycleStartDate;
  const statementDate = isoDate(input.periodTo) || cycleEndDate;
  return { cycleStartDate, cycleEndDate, statementDate };
}

function sumPaise(rows: ReviewedCardImportRow[], include: (row: ReviewedCardImportRow, kind: ReviewedCardKind) => boolean): number {
  return rows.reduce((total, row) => {
    const kind = CARD_KINDS.has(row.kindHint as ReviewedCardKind) ? row.kindHint as ReviewedCardKind : "other";
    return include(row, kind) ? total + row.amountPaise : total;
  }, 0);
}

function factFromLines(
  rows: ReviewedCardImportRow[],
  kind: "interest" | "fee",
  explicit?: CardMoneyFactInput,
): { valuePaise: number | null; evidence: CardMoneyEvidence } {
  const matched = rows.filter((row) => row.kindHint === kind && row.direction === "debit");
  const fromLines = matched.length
    ? { valuePaise: matched.reduce((total, row) => total + row.amountPaise, 0), evidence: "source_observed" as const, needsReview: false }
    : { valuePaise: null, evidence: "not_observed" as const, needsReview: false };
  if (!explicit) return fromLines;
  const supplied = {
    valuePaise: explicit.evidence === "not_observed" ? null : explicit.valuePaise,
    evidence: explicit.evidence,
    needsReview: false,
  };
  if (supplied.evidence !== "not_observed" && (supplied.valuePaise == null || !Number.isInteger(supplied.valuePaise) || supplied.valuePaise < 0)) {
    throw new Error(`${kind} evidence needs a non-negative paise integer`);
  }
  return mergeCardMoneyFact(fromLines, supplied);
}

function minimumFact(explicit?: CardMoneyFactInput): { valuePaise: number | null; evidence: CardMoneyEvidence } {
  if (!explicit || explicit.evidence === "not_observed") return { valuePaise: null, evidence: "not_observed" };
  if (explicit.valuePaise == null || !Number.isInteger(explicit.valuePaise) || explicit.valuePaise < 0) {
    throw new Error("Minimum due evidence needs a non-negative paise integer");
  }
  return { valuePaise: explicit.valuePaise, evidence: explicit.evidence };
}

function factNote(label: string, fact: { valuePaise: number | null; evidence: CardMoneyEvidence }): string {
  if (fact.evidence === "not_observed") return `${label} was not in the reviewed rows.`;
  if (fact.evidence === "source_observed") return `${label} is the printed figure.`;
  if (fact.evidence === "estimated") return `${label} is an estimate and is not printed issuer evidence.`;
  return `${label} was confirmed by you and is not printed issuer evidence.`;
}

/** Figures for one card statement. Closing is the reviewed figure, not a recomputed guess. */
export function buildReviewedCardStatement(input: ReviewedCardImport): Omit<CardStatement, "id" | "userId" | "createdAt" | "updatedAt" | "isDeleted" | "version" | "tags"> {
  const interest = factFromLines(input.rows, "interest", input.interest);
  const fees = factFromLines(input.rows, "fee", input.fees);
  const minimumDue = minimumFact(input.minimumDue);
  const notes = [
    factNote("Interest", interest),
    factNote("Fees", fees),
    factNote("Minimum due", minimumDue),
    "Purchases already imported are not posted again.",
  ].join(" ");
  return {
    cardId: input.cardId,
    cycleStartDate: input.cycleStartDate,
    cycleEndDate: input.cycleEndDate,
    statementDate: input.statementDate,
    openingBalancePaise: input.openingBalancePaise,
    closingBalancePaise: input.closingBalancePaise,
    minimumDuePaise: minimumDue.valuePaise,
    minimumDueEvidence: minimumDue.evidence,
    retailSpendPaise: sumPaise(input.rows, (row, kind) => row.direction === "debit" && (kind === "purchase" || kind === "other" || kind === "tax")),
    feesPaise: fees.valuePaise,
    feesEvidence: fees.evidence,
    interestPaise: interest.valuePaise,
    interestEvidence: interest.evidence,
    paymentsPaise: sumPaise(input.rows, (row, kind) => row.direction === "credit" && kind === "payment"),
    creditsPaise: sumPaise(input.rows, (row, kind) => row.direction === "credit" && kind !== "payment"),
    status: "closed",
    notes,
  };
}

/**
 * One cardStatements row for the reviewed cycle.
 * Does not create transactions. A second save for the same card and cycle updates that row.
 */
function localCardStatementStore(): CardStatementStore {
  return {
    async list(userId) {
      const local = (await getDB().cardStatements.where("userId").equals(userId).toArray()).filter((row) => row.isDeleted !== 1);
      try {
        const remote = await cloudRepoList<CardStatement>("cardStatements", userId);
        const byId = new Map(local.map((row) => [row.id, row]));
        for (const row of remote) {
          if (row.userId === userId && row.isDeleted !== 1) byId.set(row.id, row);
        }
        return [...byId.values()];
      } catch {
        return local;
      }
    },
    create: (row) => cardStatementRepo.create(row as never),
    update: (id, patch) => cardStatementRepo.update(id, patch),
  };
}

export async function persistReviewedCardStatement(
  userId: string,
  input: ReviewedCardImport,
  statements: CardStatementStore = localCardStatementStore(),
): Promise<CardStatement> {
  const draft = buildReviewedCardStatement(input);
  const existing = (await statements.list(userId)).find(
    (row) => row.isDeleted !== 1 && row.cardId === draft.cardId && row.cycleStartDate === draft.cycleStartDate && row.cycleEndDate === draft.cycleEndDate,
  );
  if (existing) {
    const updated = await statements.update(existing.id, {
      statementDate: draft.statementDate,
      openingBalancePaise: draft.openingBalancePaise,
      closingBalancePaise: draft.closingBalancePaise,
      minimumDuePaise: draft.minimumDuePaise,
      minimumDueEvidence: draft.minimumDueEvidence,
      retailSpendPaise: draft.retailSpendPaise,
      feesPaise: draft.feesPaise,
      feesEvidence: draft.feesEvidence,
      interestPaise: draft.interestPaise,
      interestEvidence: draft.interestEvidence,
      paymentsPaise: draft.paymentsPaise,
      creditsPaise: draft.creditsPaise,
      status: draft.status,
      notes: draft.notes,
    });
    if (!updated) throw new Error("Card statement could not be updated");
    return updated;
  }
  return saveCardStatement(userId, draft, statements);
}

async function loadImportSourceFromCloud(id: string, userId: string): Promise<ImportSource | undefined> {
  return cloudRepoGet<ImportSource>("importSources", id, userId);
}

async function loadMatchesFromCloud(ids: string[], userId: string): Promise<ReconciliationMatch[]> {
  const wanted = new Set(ids);
  try {
    const rows = await cloudRepoList<ReconciliationMatch>("reconciliationMatches", userId);
    return rows.filter((row) => wanted.has(row.id));
  } catch {
    const found: ReconciliationMatch[] = [];
    for (const id of ids) {
      found.push(await cloudRepoGet<ReconciliationMatch>("reconciliationMatches", id, userId));
    }
    return found;
  }
}

function dexieStatementCache(): StatementImportCache {
  const db = getDB();
  return {
    async putImportSource(row) {
      await db.importSources.put(row);
    },
    async putReconciliationMatches(rows) {
      if (rows.length) await db.reconciliationMatches.bulkPut(rows);
    },
  };
}

/**
 * Copy the server import source and confirmed matches into the Dexie tables
 * behind importSourceRepo and reconciliationMatchRepo. Does not post them again.
 * Writes nothing when the signed-in user is no longer `userId`.
 */
export async function storeConfirmedStatementImport(input: {
  userId: string;
  activeUserId: () => string | null | undefined;
  result: Pick<StatementImportResult, "importSourceId" | "matchIds">;
  loadImportSource?: (id: string, userId: string) => Promise<ImportSource | undefined>;
  loadReconciliationMatches?: (ids: string[], userId: string) => Promise<ReconciliationMatch[]>;
  cache?: StatementImportCache;
}): Promise<{ wrote: boolean; sourceStored: boolean; matchCount: number }> {
  const none = { wrote: false, sourceStored: false, matchCount: 0 };
  if (input.activeUserId() !== input.userId) return none;
  const sourceId = input.result.importSourceId || "";
  const matchIds = (input.result.matchIds ?? []).filter((id) => id.length > 0);
  const loadSource = input.loadImportSource ?? loadImportSourceFromCloud;
  const loadMatches = input.loadReconciliationMatches ?? loadMatchesFromCloud;
  const source = sourceId ? await loadSource(sourceId, input.userId) : undefined;
  const matches = matchIds.length ? await loadMatches(matchIds, input.userId) : [];
  if (input.activeUserId() !== input.userId) return none;
  const cache = input.cache ?? dexieStatementCache();
  const wanted = new Set(matchIds);
  const ownedMatches = matches.filter((row) => row.userId === input.userId && wanted.has(row.id));
  const ownedSource = source && source.userId === input.userId && source.id === sourceId ? source : undefined;
  if (ownedSource) await cache.putImportSource(ownedSource);
  if (ownedMatches.length) await cache.putReconciliationMatches(ownedMatches);
  return { wrote: true, sourceStored: !!ownedSource, matchCount: ownedMatches.length };
}
