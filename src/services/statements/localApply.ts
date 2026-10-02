import { ApiError, apiRequest } from "@/lib/apiClient";
import { getDB, type SparowVaultDB } from "@/db/database";
import { cloudRepoCreate, cloudRepoGet, cloudRepoList, cloudRepoUpdate } from "@/lib/cloud/repoClient";
import {
  listOutboxByCollection,
  readOutboxItem,
  upsertOutboxItem,
  type StatementApplyPhase,
} from "@/services/syncOutbox";
import type { CardStatement, ImportSource, ReconciliationMatch } from "@/types";
import { buildReviewedCardStatement, type ReviewedCardImport } from "./localBooks";
import type { StatementImportResult } from "./types";

const COLLECTION = "statementImports";

export interface StatementLocalApplyRecord {
  mutationId: string;
  userId: string;
  state: StatementApplyPhase;
  importSourceId: string | null;
  matchIds: string[];
  transactionIds: string[];
  imported: number;
  duplicates: number;
  skipped: number;
  card: ReviewedCardImport | null;
  statementId: string | null;
  attempts: number;
  updatedAt: string;
  lastError?: string;
  endpoint?: string;
  requestBody?: string;
}

export interface LocalStatementRows {
  source?: ImportSource;
  matches: ReconciliationMatch[];
  statement?: CardStatement;
}

function itemId(mutationId: string): string {
  return `${COLLECTION}:${mutationId}`;
}

function saveRecord(record: StatementLocalApplyRecord): void {
  upsertOutboxItem({
    id: itemId(record.mutationId),
    collection: COLLECTION,
    entityId: record.mutationId,
    state: record.state,
    updatedAt: record.updatedAt,
    error: record.lastError,
    userId: record.userId,
    detail: JSON.stringify(record),
  });
}

export function readStatementLocalApply(mutationId: string): StatementLocalApplyRecord | undefined {
  const item = readOutboxItem(itemId(mutationId));
  if (!item?.detail) return undefined;
  return JSON.parse(item.detail) as StatementLocalApplyRecord;
}

export function listPendingStatementApplies(userId: string): StatementLocalApplyRecord[] {
  return listOutboxByCollection(COLLECTION).flatMap((item) => {
    if (!item.detail || item.userId !== userId) return [];
    const record = JSON.parse(item.detail) as StatementLocalApplyRecord;
    return record.state === "LOCAL_APPLIED" ? [] : [record];
  });
}

export function stableCardStatementId(userId: string, card: ReviewedCardImport): string {
  return `cst_${userId}_${card.cardId}_${card.cycleStartDate}_${card.cycleEndDate}`.replace(/[^a-zA-Z0-9_:-]/g, "_");
}

/**
 * Store the reviewed command before POST. A lost response retries this same body.
 * Throws when the command is not durable, so the caller must not send it.
 */
export function rememberStatementCommand(input: {
  mutationId: string;
  userId: string;
  endpoint: string;
  body: string;
  card: ReviewedCardImport | null;
}): StatementLocalApplyRecord {
  const existing = readStatementLocalApply(input.mutationId);
  if (existing && existing.userId !== input.userId) {
    throw new Error("Account changed. Sign in to the original account.");
  }
  if (existing?.requestBody && existing.requestBody !== input.body && existing.state !== "LOCAL_APPLIED") {
    throw new Error("This import key was already used for a different review.");
  }
  if (existing && (existing.state === "LOCAL_APPLIED" || existing.state === "SERVER_COMMITTED" || existing.state === "LOCAL_APPLY_PENDING")) {
    return existing;
  }
  const record: StatementLocalApplyRecord = {
    mutationId: input.mutationId,
    userId: input.userId,
    state: "DELIVERY_UNKNOWN",
    importSourceId: existing?.importSourceId ?? null,
    matchIds: existing?.matchIds ?? [],
    transactionIds: existing?.transactionIds ?? [],
    imported: existing?.imported ?? 0,
    duplicates: existing?.duplicates ?? 0,
    skipped: existing?.skipped ?? 0,
    card: input.card,
    statementId: existing?.statementId ?? null,
    endpoint: input.endpoint,
    requestBody: input.body,
    attempts: existing?.attempts ?? 0,
    updatedAt: new Date().toISOString(),
  };
  saveRecord(record);
  if (typeof window !== "undefined") {
    const raw = window.localStorage.getItem("sparowvault_sync_outbox_v1") ?? "";
    if (!raw.includes(input.mutationId)) {
      throw new Error("The import command was not stored. Nothing was sent.");
    }
  }
  const stored = readStatementLocalApply(input.mutationId);
  if (!stored || stored.requestBody !== input.body || stored.userId !== input.userId) {
    throw new Error("The import command was not stored. Nothing was sent.");
  }
  return stored;
}

/** Persist the server receipt before any Dexie write so an abort can resume. */
export function rememberServerCommittedStatement(input: {
  mutationId: string;
  userId: string;
  result: Pick<StatementImportResult, "importSourceId" | "matchIds" | "transactionIds" | "imported" | "duplicates" | "skipped">;
  card: ReviewedCardImport | null;
}): StatementLocalApplyRecord {
  const existing = readStatementLocalApply(input.mutationId);
  if (existing?.userId === input.userId && existing.state === "LOCAL_APPLIED") return existing;
  const record: StatementLocalApplyRecord = {
    mutationId: input.mutationId,
    userId: input.userId,
    state: "SERVER_COMMITTED",
    importSourceId: input.result.importSourceId ?? null,
    matchIds: [...(input.result.matchIds ?? [])],
    transactionIds: [...(input.result.transactionIds ?? [])],
    imported: input.result.imported,
    duplicates: input.result.duplicates,
    skipped: input.result.skipped,
    card: input.card,
    statementId: existing?.statementId ?? null,
    endpoint: existing?.endpoint,
    requestBody: undefined,
    attempts: existing?.attempts ?? 0,
    updatedAt: new Date().toISOString(),
  };
  saveRecord(record);
  return record;
}

async function defaultRunLocal(db: SparowVaultDB, rows: LocalStatementRows): Promise<void> {
  await db.transaction("rw", [db.importSources, db.reconciliationMatches, db.cardStatements], async () => {
    if (rows.source) await db.importSources.put(rows.source);
    if (rows.matches.length) await db.reconciliationMatches.bulkPut(rows.matches);
    if (rows.statement) await db.cardStatements.put(rows.statement);
  });
}

async function defaultLoadSource(id: string, userId: string): Promise<ImportSource | undefined> {
  return cloudRepoGet<ImportSource>("importSources", id, userId);
}

async function defaultLoadMatches(ids: string[], userId: string): Promise<ReconciliationMatch[]> {
  const wanted = new Set(ids);
  const rows = await cloudRepoList<ReconciliationMatch>("reconciliationMatches", userId);
  return rows.filter((row) => wanted.has(row.id));
}

export async function publishCardStatementRow(row: CardStatement, mutationId: string): Promise<void> {
  try {
    const existing = await cloudRepoGet<CardStatement>("cardStatements", row.id, row.userId);
    if (existing.userId !== row.userId) throw new Error("Account changed. Sign in to the original account.");
    await cloudRepoUpdate("cardStatements", row.id, row, {
      userId: row.userId,
      mutationId: `${mutationId}:statement`,
      expectedVersion: existing.version,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      await cloudRepoCreate("cardStatements", row.userId, row, "cst", `${mutationId}:statement`);
      return;
    }
    throw error;
  }
}

/**
 * Copy source, matches, and the card-statement row after the server commit.
 * Does not create or repost purchase transactions.
 */
export async function applyStatementLocalCopy(input: {
  mutationId: string;
  activeUserId: () => string | null | undefined;
  db?: SparowVaultDB;
  loadImportSource?: (id: string, userId: string) => Promise<ImportSource | undefined>;
  loadReconciliationMatches?: (ids: string[], userId: string) => Promise<ReconciliationMatch[]>;
  publishStatement?: (row: CardStatement) => Promise<void>;
  runLocal?: (db: SparowVaultDB, rows: LocalStatementRows) => Promise<void>;
}): Promise<StatementLocalApplyRecord> {
  const current = readStatementLocalApply(input.mutationId);
  if (!current) throw new Error("No server receipt is stored for this import");
  if (input.activeUserId() !== current.userId) return current;
  if (current.state === "LOCAL_APPLIED") return current;
  const pending: StatementLocalApplyRecord = {
    ...current,
    state: "LOCAL_APPLY_PENDING",
    attempts: current.attempts + 1,
    updatedAt: new Date().toISOString(),
    lastError: undefined,
  };
  saveRecord(pending);
  const db = input.db ?? getDB();
  const loadSource = input.loadImportSource ?? defaultLoadSource;
  const loadMatches = input.loadReconciliationMatches ?? defaultLoadMatches;
  const publish = input.publishStatement ?? ((row: CardStatement) => publishCardStatementRow(row, input.mutationId));
  try {
    const sourceId = pending.importSourceId ?? "";
    const source = sourceId ? await loadSource(sourceId, pending.userId) : undefined;
    const matches = pending.matchIds.length ? await loadMatches(pending.matchIds, pending.userId) : [];
    if (input.activeUserId() !== pending.userId) return readStatementLocalApply(input.mutationId) ?? pending;
    const wanted = new Set(pending.matchIds);
    const ownedMatches = matches.filter((row) => row.userId === pending.userId && wanted.has(row.id));
    const ownedSource = source && source.userId === pending.userId && source.id === sourceId ? source : undefined;
    let statement: CardStatement | undefined;
    if (pending.card) {
      const draft = buildReviewedCardStatement(pending.card);
      const existing = (await db.cardStatements.where("userId").equals(pending.userId).toArray()).find(
        (row) => row.isDeleted !== 1 && row.cardId === draft.cardId && row.cycleStartDate === draft.cycleStartDate && row.cycleEndDate === draft.cycleEndDate,
      );
      const now = new Date().toISOString();
      statement = {
        ...draft,
        id: existing?.id ?? stableCardStatementId(pending.userId, pending.card),
        userId: pending.userId,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        isDeleted: 0,
        version: (existing?.version ?? 0) + 1,
        tags: existing?.tags?.length ? existing.tags : ["statement-import"],
        notes: draft.notes ?? "",
      };
    }
    await (input.runLocal ?? defaultRunLocal)(db, { source: ownedSource, matches: ownedMatches, statement });
    if (statement) await publish(statement);
    const applied: StatementLocalApplyRecord = {
      ...pending,
      state: "LOCAL_APPLIED",
      statementId: statement?.id ?? pending.statementId,
      updatedAt: new Date().toISOString(),
      lastError: undefined,
    };
    saveRecord(applied);
    return applied;
  } catch (error) {
    saveRecord({
      ...pending,
      state: "LOCAL_APPLY_PENDING",
      lastError: error instanceof Error ? error.message : "Local apply failed",
      updatedAt: new Date().toISOString(),
    });
    throw error;
  }
}

/** A second client reads the stored statement row. The original PDF is not required. */
export async function readCommittedCardStatement(input: {
  userId: string;
  statementId: string;
  loadRemote: (id: string, userId: string) => Promise<CardStatement | undefined>;
}): Promise<CardStatement | undefined> {
  const row = await input.loadRemote(input.statementId, input.userId);
  if (!row || row.userId !== input.userId || row.isDeleted === 1) return undefined;
  return row;
}

export async function resumePendingStatementLocalApplies(
  userId: string,
  activeUserId: () => string | null | undefined,
): Promise<void> {
  for (const job of listPendingStatementApplies(userId)) {
    if (activeUserId() !== userId) return;
    if (job.userId !== userId) continue;
    try {
      if (job.state === "DELIVERY_UNKNOWN") {
        if (!job.requestBody || !job.endpoint) continue;
        const saved = await apiRequest<StatementImportResult>(job.endpoint, { method: "POST", auth: true, body: job.requestBody });
        rememberServerCommittedStatement({ mutationId: job.mutationId, userId: job.userId, result: saved, card: job.card });
      }
      await applyStatementLocalCopy({ mutationId: job.mutationId, activeUserId });
    } catch {
      /* DELIVERY_UNKNOWN or LOCAL_APPLY_PENDING stays until the same command succeeds. */
    }
  }
}
