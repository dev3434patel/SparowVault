import type { ImportSource, PaymentMode, Transaction, TransactionType } from "@/types";
import { parseMoneyInputToPaise, paiseToRupees, transactionAmountPaise } from "@/utils/money";
import { AaClosedError } from "@/services/aa/errors";
import { aaCall, type AaHttp } from "@/services/aa/http";
import type { AaGate } from "@/services/aa/config";
import { AA_PATHS, fiFetchPath } from "@/services/aa/paths";
import { dateRange } from "@/services/aa/flow";

export type AaPurpose = "" | "expense" | "income" | "transfer" | "refund";

export interface AaReviewRow {
  id: string;
  providerTxnId: string;
  date: string;
  narration: string;
  direction: "debit" | "credit";
  amountPaise: number;
  reference: string;
  paymentMode: PaymentMode;
  /** Empty until the user chooses. A credit is never pre-filled as income. */
  purpose: AaPurpose;
  include: boolean;
  duplicateOfTransactionId: string | null;
  alreadyPosted: boolean;
}

export interface AaReviewList {
  fiSessionId: string;
  consentId: string;
  maskedAccount: string;
  providerBalancePaise: number | null;
  rows: AaReviewRow[];
}

export interface AaStoredReview {
  kind: "aa_review";
  fiSessionId: string;
  consentId: string;
  maskedAccount: string;
  status: "pending_review" | "confirmed";
  providerBalanceIgnored: true;
  rows: Array<Pick<AaReviewRow, "providerTxnId" | "date" | "direction" | "amountPaise" | "narration" | "reference" | "purpose" | "include">>;
}

export interface AaExistingTransaction {
  id: string;
  date: string;
  type: string;
  amount: number;
  amountPaise?: number;
  notes?: string;
}

const NOTE_PREFIX = "aa-review ";
const NOTE_LIMIT = 24_000;

export function aaPostKey(fiSessionId: string, providerTxnId: string): string {
  return `aaFiSession=${fiSessionId};aaTxn=${providerTxnId}`;
}

export function encodeAaReviewNote(payload: AaStoredReview): string {
  const notes = NOTE_PREFIX + JSON.stringify(payload);
  if (notes.length > NOTE_LIMIT) {
    throw new AaClosedError("invalid_payload", "The review list is too large to store. Shorten the date range. Nothing was imported.");
  }
  return notes;
}

export function readAaReviewNote(notes: string | undefined): AaStoredReview | null {
  if (!notes || !notes.startsWith(NOTE_PREFIX)) return null;
  try {
    const parsed = JSON.parse(notes.slice(NOTE_PREFIX.length)) as AaStoredReview;
    if (parsed?.kind !== "aa_review" || typeof parsed.fiSessionId !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function asTxnArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return [value];
  return [];
}

function readString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function collectFi(body: unknown): { txns: Record<string, unknown>[]; balance: string; masked: string } {
  const txns: Record<string, unknown>[] = [];
  let balance = "";
  let masked = "";
  const visit = (node: unknown, depth: number) => {
    if (!node || typeof node !== "object" || depth > 8) return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item, depth + 1);
      return;
    }
    const record = node as Record<string, unknown>;
    if (record.KeyMaterial || record.keyMaterial || record.encryptedFI || record.EncryptedFI) {
      throw new AaClosedError(
        "encrypted_fi",
        "The provider returned encrypted financial information. SparowVault does not decrypt Account Aggregator payloads. A licensed FIU key is required, and nothing was imported.",
      );
    }
    const summary = asRecord(record.Summary ?? record.summary);
    if (summary) {
      const current = readString(summary, ["currentBalance", "CurrentBalance", "balance"]);
      if (current) balance = current;
    }
    const maskedAcc = readString(record, ["maskedAccNumber", "maskedAccountNumber"]);
    if (maskedAcc) masked = maskedAcc;
    const transactions = asRecord(record.Transactions ?? record.transactions);
    if (transactions) {
      const list = transactions.Transaction ?? transactions.transaction;
      if (list !== undefined) {
        for (const item of asTxnArray(list)) {
          const row = asRecord(item);
          if (row) txns.push(row);
        }
      }
      return;
    }
    for (const value of Object.values(record)) visit(value, depth + 1);
  };
  visit(body, 0);
  return { txns, balance, masked };
}

function paymentModeFrom(mode: string): PaymentMode {
  const value = mode.toUpperCase();
  if (value.includes("UPI")) return "upi";
  if (value.includes("NEFT") || value.includes("IMPS") || value.includes("RTGS") || value.includes("TRANSFER")) return "bank_transfer";
  if (value.includes("CASH") || value.includes("ATM")) return "cash";
  if (value.includes("CARD")) return "debit_card";
  return "other";
}

function calendarDate(record: Record<string, unknown>): string {
  const value = readString(record, ["valueDate", "transactionTimestamp", "transactionDate", "date"]);
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  if (!match) {
    throw new AaClosedError("invalid_payload", "A provider transaction had no usable date. Nothing was imported.");
  }
  return match[1];
}

function optionalBalance(raw: string): number | null {
  if (!raw) return null;
  try {
    return parseMoneyInputToPaise(raw, { allowZero: true, allowRounding: false, field: "provider balance", throwOnInvalid: true });
  } catch {
    return null;
  }
}

export function mapFiToReview(input: {
  body: unknown;
  fiSessionId: string;
  consentId: string;
  maskedAccount: string;
  existingTransactions: AaExistingTransaction[];
}): AaReviewList {
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(input.fiSessionId)) {
    throw new AaClosedError("invalid_payload", "The financial-information session id is unusable. Nothing was imported.");
  }
  const collected = collectFi(input.body);
  if (collected.txns.length === 0) {
    throw new AaClosedError("invalid_payload", "The provider returned no transactions. Opening balances were not changed.");
  }
  const seen = new Set<string>();
  const rows: AaReviewRow[] = collected.txns.map((record) => {
    const providerTxnId = readString(record, ["txnId", "txnid", "transactionId"]);
    if (!providerTxnId || seen.has(providerTxnId)) {
      throw new AaClosedError("invalid_payload", "A provider transaction id was missing or repeated. Nothing was imported.");
    }
    seen.add(providerTxnId);
    const directionRaw = readString(record, ["type", "transactionType"]).toUpperCase();
    if (directionRaw !== "DEBIT" && directionRaw !== "CREDIT") {
      throw new AaClosedError("invalid_payload", "A provider transaction had no debit or credit direction. Nothing was imported.");
    }
    const direction = directionRaw === "DEBIT" ? "debit" : "credit";
    let amountPaise: number;
    try {
      amountPaise = parseMoneyInputToPaise(readString(record, ["amount"]), {
        allowZero: false,
        allowRounding: false,
        field: "amount",
        throwOnInvalid: true,
      });
    } catch {
      throw new AaClosedError("invalid_payload", "A provider amount could not be read as paise. Nothing was imported.");
    }
    const narration = readString(record, ["narration", "transactionNarration", "description"]).slice(0, 180) || "No narration from provider";
    const reference = readString(record, ["reference", "txnRef", "referenceNumber"]).slice(0, 80);
    const key = aaPostKey(input.fiSessionId, providerTxnId);
    const alreadyPosted = input.existingTransactions.some((txn) => (txn.notes ?? "").includes(key));
    const duplicateOfTransactionId = alreadyPosted
      ? null
      : input.existingTransactions.find((txn) =>
        txn.date.slice(0, 10) === calendarDate(record) && transactionAmountPaise(txn) === amountPaise,
      )?.id ?? null;
    return {
      id: `${input.fiSessionId}:${providerTxnId}`,
      providerTxnId,
      date: calendarDate(record),
      narration,
      direction,
      amountPaise,
      reference,
      paymentMode: paymentModeFrom(readString(record, ["mode", "paymentMode"])),
      purpose: "",
      include: direction === "debit" && !alreadyPosted && !duplicateOfTransactionId,
      duplicateOfTransactionId,
      alreadyPosted,
    };
  });
  return {
    fiSessionId: input.fiSessionId,
    consentId: input.consentId,
    maskedAccount: collected.masked || input.maskedAccount,
    providerBalancePaise: optionalBalance(collected.balance),
    rows,
  };
}

function readSessionId(body: unknown): string {
  const record = asRecord(body);
  if (!record) {
    throw new AaClosedError("invalid_payload", "The provider did not return a financial-information session id. Nothing was imported.");
  }
  const direct = readString(record, ["sessionId", "session_id"]);
  if (direct) return direct;
  const nested = asRecord(record.FI);
  const nestedId = nested ? readString(nested, ["sessionId"]) : "";
  if (!nestedId) {
    throw new AaClosedError("invalid_payload", "The provider did not return a financial-information session id. Nothing was imported.");
  }
  return nestedId;
}

export async function fetchAaTransactions(
  gate: AaGate,
  http: AaHttp,
  input: {
    userId: string;
    consentId: string;
    from: string;
    to: string;
    maskedAccount: string;
    existingTransactions: AaExistingTransaction[];
    existingSources: Array<Pick<ImportSource, "id" | "notes" | "kind">>;
    saveSource: (input: { userId: string; data: { name: string; kind: "aa_ready"; notes: string } }) => Promise<{ id: string }>;
  },
): Promise<{ review: AaReviewList; sourceId: string; staged: boolean }> {
  if (!input.userId) {
    throw new AaClosedError("invalid_payload", "Sign in before fetching Account Aggregator data. Nothing was imported.");
  }
  const range = dateRange(input.from, input.to);
  const requested = await aaCall(gate, http, {
    method: "POST",
    path: AA_PATHS.fiRequest,
    body: {
      ver: "2.0.0",
      timestamp: new Date().toISOString(),
      txnid: crypto.randomUUID(),
      FIDataRange: range,
      Consent: { id: input.consentId },
    },
  });
  const fiSessionId = readSessionId(requested);
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(fiSessionId)) {
    throw new AaClosedError("invalid_payload", "The financial-information session id is unusable. Nothing was imported.");
  }
  const fetched = await aaCall(gate, http, { method: "GET", path: fiFetchPath(fiSessionId) });
  const review = mapFiToReview({
    body: fetched,
    fiSessionId,
    consentId: input.consentId,
    maskedAccount: input.maskedAccount,
    existingTransactions: input.existingTransactions,
  });
  const existing = input.existingSources
    .map((source) => ({ source, note: readAaReviewNote(source.notes) }))
    .find((item) => item.note?.fiSessionId === fiSessionId);
  if (existing?.source.id) {
    return { review, sourceId: existing.source.id, staged: false };
  }
  const note = encodeAaReviewNote({
    kind: "aa_review",
    fiSessionId: review.fiSessionId,
    consentId: review.consentId,
    maskedAccount: review.maskedAccount,
    status: "pending_review",
    providerBalanceIgnored: true,
    rows: review.rows.map((row) => ({
      providerTxnId: row.providerTxnId,
      date: row.date,
      direction: row.direction,
      amountPaise: row.amountPaise,
      narration: row.narration,
      reference: row.reference,
      purpose: "",
      include: row.include,
    })),
  });
  const saved = await input.saveSource({
    userId: input.userId,
    data: {
      name: `Account Aggregator review ${review.maskedAccount || "account"}`,
      kind: "aa_ready",
      notes: note,
    },
  });
  return { review, sourceId: saved.id, staged: true };
}

function purposeFor(row: AaReviewRow, purpose: AaPurpose): TransactionType {
  if (!purpose) {
    throw new AaClosedError("invalid_payload", "Choose a purpose before posting. A credit is not income until you say so. Nothing was posted.");
  }
  if (row.direction === "debit" && purpose !== "expense" && purpose !== "transfer") {
    throw new AaClosedError("invalid_payload", "A debit cannot be posted as income. Nothing was posted.");
  }
  if (row.direction === "credit" && purpose !== "income" && purpose !== "refund" && purpose !== "transfer") {
    throw new AaClosedError("invalid_payload", "Choose income, refund, or transfer for a credit. Nothing was posted.");
  }
  return purpose;
}

export async function confirmAaReview(input: {
  userId: string;
  accountId: string;
  toAccountId?: string;
  review: AaReviewList;
  sourceId?: string;
  decisions: Record<string, { include: boolean; purpose: AaPurpose }>;
  existingTransactions: AaExistingTransaction[];
  createTransaction: (input: {
    userId: string;
    data: Omit<Transaction, "id" | "userId" | "createdAt" | "updatedAt" | "isDeleted" | "version" | "tags" | "notes"> & { notes: string; tags: string[] };
  }) => Promise<{ id: string }>;
  updateSource?: (id: string, patch: Partial<ImportSource>) => Promise<unknown>;
}): Promise<{ postedIds: string[]; skipped: number }> {
  if (!input.userId) throw new AaClosedError("invalid_payload", "Sign in before confirming. Nothing was posted.");
  if (!input.accountId) throw new AaClosedError("invalid_payload", "Choose the personal account these rows belong to. Nothing was posted.");
  const planned: Array<{ row: AaReviewRow; type: TransactionType }> = [];
  let skipped = 0;
  for (const row of input.review.rows) {
    const decision = input.decisions[row.id] ?? { include: false, purpose: "" as AaPurpose };
    const key = aaPostKey(input.review.fiSessionId, row.providerTxnId);
    const already = row.alreadyPosted || input.existingTransactions.some((txn) => (txn.notes ?? "").includes(key));
    if (!decision.include || already) {
      skipped += 1;
      continue;
    }
    const type = purposeFor(row, decision.purpose);
    if (type === "transfer" && !input.toAccountId) {
      throw new AaClosedError("invalid_payload", "Choose the other personal account for a transfer. Nothing was posted.");
    }
    planned.push({ row, type });
  }
  const postedIds: string[] = [];
  for (const item of planned) {
    const key = aaPostKey(input.review.fiSessionId, item.row.providerTxnId);
    const created = await input.createTransaction({
      userId: input.userId,
      data: {
        date: item.row.date,
        type: item.type,
        amount: paiseToRupees(item.row.amountPaise),
        amountPaise: item.row.amountPaise,
        accountId: input.accountId,
        toAccountId: item.type === "transfer" ? input.toAccountId : undefined,
        paymentMode: item.row.paymentMode,
        merchantOrPerson: "",
        description: item.row.narration,
        billAvailable: 0,
        gstApplicable: 0,
        taxFlag: 0,
        businessOrPersonal: "personal",
        needWant: "unassigned",
        fixedVariable: "unassigned",
        plannedUnplanned: "unassigned",
        notes: `${key};ref=${item.row.reference}`,
        tags: ["aa_ready"],
      },
    });
    postedIds.push(created.id);
  }
  if (input.sourceId && input.updateSource) {
    await input.updateSource(input.sourceId, {
      lastImportAt: new Date().toISOString(),
      notes: encodeAaReviewNote({
        kind: "aa_review",
        fiSessionId: input.review.fiSessionId,
        consentId: input.review.consentId,
        maskedAccount: input.review.maskedAccount,
        status: "confirmed",
        providerBalanceIgnored: true,
        rows: input.review.rows.map((row) => ({
          providerTxnId: row.providerTxnId,
          date: row.date,
          direction: row.direction,
          amountPaise: row.amountPaise,
          narration: row.narration,
          reference: row.reference,
          purpose: input.decisions[row.id]?.purpose ?? "",
          include: input.decisions[row.id]?.include ?? false,
        })),
      }),
    });
  }
  return { postedIds, skipped };
}
