/**
 * Personal-book writes. Money stays in Dexie. These helpers do not post a second movement.
 */

import { addDays } from "date-fns";
import { CLOUD_COLLECTIONS } from "@/config/syncContracts";
import {
  assetValuationRepo,
  attachmentRepo,
  cardEmiInstallmentRepo,
  cardEmiPlanRepo,
  cardPaymentAllocationRepo,
  cardRepo,
  cardStatementRepo,
  creditLimitGroupRepo,
  fixedIncomeAssetRepo,
  householdMemberRepo,
  householdPermissionRepo,
  householdRepo,
  importSourceRepo,
  insurancePolicyRepo,
  obligationRepo,
  reconciliationMatchRepo,
  reminderRepo,
  sinkingFundRepo,
  snapshotRepo,
  transferLinkRepo,
} from "@/repositories";
import { categoryRollupPaise } from "@/services/categoryRollup";
import { createCardEmiPlanFromPurchase } from "@/services/cardEmiEngine";
import { obligationOccurrenceKey } from "@/services/obligationEngine";
import { nextReconciliationStatus } from "@/services/reconciliationDecision";
import { decideLastOwner } from "@/services/householdGrantRules";
import { reservationSnapshot } from "@/services/reservationMath";
import { normalizeCardMoneyWrite } from "@/services/statements/cardMoneyFact";
import type {
  AttachmentMeta,
  Card,
  CardEmiInstallment,
  CardEmiPlan,
  CardPaymentAllocation,
  CardStatement,
  CreditLimitGroup,
  Household,
  HouseholdMember,
  HouseholdPermission,
  ImportSource,
  Obligation,
  ReconciliationMatch,
  Reminder,
  SinkingFund,
  Transaction,
  TransferLink,
} from "@/types";
import { transactionAmountPaise } from "@/utils/money";

export const REQUIRED_CLOUD_KEYS = [
  "households",
  "fixedIncomeAssets",
  "cardEmiPlans",
  "obligations",
  "sinkingFunds",
  "importSources",
  "reconciliationMatches",
] as const;

export function cloudAllowlistIncludesPersonalKeys(
  keys: readonly string[] = CLOUD_COLLECTIONS,
): boolean {
  return REQUIRED_CLOUD_KEYS.every((key) => keys.includes(key));
}

interface Writer<T> {
  list(userId: string): Promise<T[]>;
  create(input: { userId: string; data: Partial<T> }): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T | undefined>;
}

function adapt<T>(repo: {
  list(userId: string): Promise<T[]>;
  create(input: { userId: string; data: never }): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T | undefined>;
}): Writer<T> {
  return {
    list: (userId) => repo.list(userId),
    create: (input) => repo.create(input as never),
    update: (id, patch) => repo.update(id, patch),
  };
}

function assertPaise(value: number, field: string, allowZero = true): void {
  if (!Number.isInteger(value) || value < 0 || (!allowZero && value === 0)) {
    throw new Error(`${field} must be a ${allowZero ? "non-negative" : "positive"} paise integer`);
  }
}

export async function saveTransferLinkForTransaction(
  userId: string,
  tx: Transaction,
  links: Writer<TransferLink> = adapt(transferLinkRepo),
): Promise<TransferLink | null> {
  if (tx.type !== "transfer") return null;
  if (!tx.id) throw new Error("Save the transfer before linking it");
  if (!tx.accountId || !tx.toAccountId) throw new Error("A transfer needs both accounts");
  if (tx.accountId === tx.toAccountId) throw new Error("Transfer accounts must be different");
  const amountPaise = transactionAmountPaise(tx);
  assertPaise(amountPaise, "Transfer amount", false);
  const existing = (await links.list(userId)).find(
    (row) => row.isDeleted !== 1 && row.transactionId === tx.id,
  );
  if (existing) {
    const updated = await links.update(existing.id, {
      fromAccountId: tx.accountId,
      toAccountId: tx.toAccountId,
      amountPaise,
      status: "completed",
    });
    return updated ?? existing;
  }
  return links.create({
    userId,
    data: {
      fromAccountId: tx.accountId,
      toAccountId: tx.toAccountId,
      amountPaise,
      transactionId: tx.id,
      status: "completed",
    },
  });
}

export interface StatementTransferLeg {
  observationId: string;
  accountId: string;
  direction: "debit" | "credit";
  amountPaise: number;
}

/** Two bank observations of one own-account move. A credit leg is not income. */
export function pairedTransferEffect(input: {
  fromAccountId: string;
  toAccountId: string;
  amountPaise: number;
  legs: StatementTransferLeg[];
  feePaise?: number;
}): { economicEvents: 1; incomePaise: 0; expensePaise: 0; feePaise: number } {
  if (!input.fromAccountId || !input.toAccountId || input.fromAccountId === input.toAccountId) {
    throw new Error("Transfer accounts must be different");
  }
  assertPaise(input.amountPaise, "Transfer amount", false);
  if (input.legs.length !== 2) throw new Error("One transfer has two statement legs");
  const debit = input.legs.find((leg) => leg.direction === "debit");
  const credit = input.legs.find((leg) => leg.direction === "credit");
  if (!debit || !credit) throw new Error("A transfer needs one debit leg and one credit leg");
  if (!debit.observationId.trim() || !credit.observationId.trim() || debit.observationId === credit.observationId) {
    throw new Error("Statement legs must be distinct observations");
  }
  if (debit.accountId !== input.fromAccountId || credit.accountId !== input.toAccountId) {
    throw new Error("Statement legs must match the transfer accounts");
  }
  if (debit.amountPaise !== input.amountPaise || credit.amountPaise !== input.amountPaise) {
    throw new Error("Statement legs must match the transfer amount");
  }
  const feePaise = input.feePaise ?? 0;
  assertPaise(feePaise, "Fee");
  return { economicEvents: 1, incomePaise: 0, expensePaise: 0, feePaise };
}

export async function linkStatementLegsToOneTransfer(
  userId: string,
  transfer: Transaction,
  legs: StatementTransferLeg[],
  links: Writer<TransferLink> = adapt(transferLinkRepo),
  fee?: { transactionId: string; amountPaise: number },
): Promise<TransferLink> {
  const effect = pairedTransferEffect({
    fromAccountId: transfer.accountId ?? "",
    toAccountId: transfer.toAccountId ?? "",
    amountPaise: transactionAmountPaise(transfer),
    legs,
    feePaise: fee?.amountPaise ?? 0,
  });
  if (effect.feePaise > 0 && !fee?.transactionId.trim()) {
    throw new Error("A fee stays on its own transaction");
  }
  const link = await saveTransferLinkForTransaction(userId, transfer, links);
  if (!link) throw new Error("Save the transfer before linking it");
  const updated = await links.update(link.id, {
    notes: `observations=${legs.map((leg) => leg.observationId).join(",")}`,
    ...(effect.feePaise > 0 && fee ? { feeTransactionId: fee.transactionId } : {}),
  });
  return updated ?? link;
}

export async function persistReconciliationDecision(
  userId: string,
  action: "confirm" | "reject" | "unmatch",
  match: { leftTransactionId: string; rightTransactionId?: string; confidence: number },
  matches: Writer<ReconciliationMatch> = adapt(reconciliationMatchRepo),
): Promise<ReconciliationMatch | undefined> {
  if (!match.leftTransactionId.trim()) throw new Error("A reconciliation match needs a transaction");
  if (!Number.isFinite(match.confidence) || match.confidence < 0 || match.confidence > 1) {
    throw new Error("Confidence must be between 0 and 1");
  }
  const status = nextReconciliationStatus(action);
  const existing = (await matches.list(userId)).find(
    (row) =>
      row.isDeleted !== 1 &&
      row.leftTransactionId === match.leftTransactionId &&
      (row.rightTransactionId ?? "") === (match.rightTransactionId ?? ""),
  );
  if (existing) {
    return matches.update(existing.id, { status, confidence: match.confidence });
  }
  return matches.create({
    userId,
    data: {
      leftTransactionId: match.leftTransactionId,
      rightTransactionId: match.rightTransactionId,
      status,
      confidence: match.confidence,
    },
  });
}

export function parentCategoryTotals(
  categories: Array<{ id: string; parentId: string | null; name: string }>,
  transactions: Array<{ id: string; categoryId?: string | null; amountPaise: number }>,
): Array<{ categoryId: string; name: string; totalPaise: number }> {
  const totals = categoryRollupPaise(categories, transactions);
  const parentIds = new Set(categories.map((category) => category.parentId).filter((id): id is string => !!id));
  return categories
    .filter((category) => parentIds.has(category.id))
    .map((category) => ({
      categoryId: category.id,
      name: category.name,
      totalPaise: totals.get(category.id) ?? 0,
    }));
}

export const WEALTH_SINKING_FUND_INVESTMENT_TYPE = "sinking_fund";

export function isWealthSinkingFundInvestment(investment: { type: string }): boolean {
  return investment.type === WEALTH_SINKING_FUND_INVESTMENT_TYPE;
}

export function reservationKindFromNotes(notes: string | undefined): "envelope" | "sinking" | null {
  if ((notes ?? "").includes("kind=envelope")) return "envelope";
  if ((notes ?? "").includes("kind=sinking")) return "sinking";
  return null;
}

export function reservedPaiseFromNotes(notes: string | undefined): number {
  const match = (notes ?? "").match(/reservedPaise=(\d+)/);
  return match ? Number(match[1]) : 0;
}

export function reservationViewFromFunds(input: {
  bankCashPaise: number;
  funds: SinkingFund[];
  goalEarmarkPaise: number;
}) {
  let envelopeReservedPaise = 0;
  let sinkingFundReservedPaise = 0;
  for (const fund of input.funds) {
    if (fund.isDeleted === 1) continue;
    const reserved = reservedPaiseFromNotes(fund.notes);
    if (reservationKindFromNotes(fund.notes) === "envelope") envelopeReservedPaise += reserved;
    else sinkingFundReservedPaise += reserved;
  }
  return reservationSnapshot({
    bankCashPaise: input.bankCashPaise,
    envelopeReservedPaise,
    goalEarmarkPaise: input.goalEarmarkPaise,
    sinkingFundReservedPaise,
  });
}

export async function createCashReservation(
  userId: string,
  input: {
    name: string;
    kind: "envelope" | "sinking";
    targetPaise: number;
    reservedPaise: number;
    targetDate: string;
  },
  funds: Writer<SinkingFund> = adapt(sinkingFundRepo),
): Promise<SinkingFund> {
  const name = input.name.trim();
  if (!name) throw new Error("Reservation needs a name");
  if (!input.targetDate) throw new Error("Reservation needs a target date");
  assertPaise(input.targetPaise, "Target", false);
  assertPaise(input.reservedPaise, "Reserved amount");
  if (input.reservedPaise > input.targetPaise) {
    throw new Error("Reserved amount cannot exceed the target");
  }
  if (input.kind !== "envelope" && input.kind !== "sinking") {
    throw new Error("Reservation kind must be envelope or sinking fund");
  }
  return funds.create({
    userId,
    data: {
      name,
      targetPaise: input.targetPaise,
      targetDate: input.targetDate,
      notes: `kind=${input.kind};reservedPaise=${input.reservedPaise}`,
    },
  });
}

export async function persistProjectedObligations(
  userId: string,
  projected: Obligation[],
  obligations: Writer<Obligation> = adapt(obligationRepo),
): Promise<Obligation[]> {
  const existing = await obligations.list(userId);
  const keys = new Set(existing.filter((row) => row.isDeleted !== 1).map((row) => row.occurrenceKey));
  const saved: Obligation[] = [];
  for (const row of projected) {
    if (row.userId !== userId || keys.has(row.occurrenceKey)) continue;
    if (!row.title.trim() || !row.dueDate) throw new Error("Obligation needs a title and due date");
    assertPaise(row.amountPaise, "Obligation amount");
    const created = await obligations.create({
      userId,
      data: {
        sourceType: row.sourceType,
        sourceId: row.sourceId,
        occurrenceKey: row.occurrenceKey,
        title: row.title,
        dueDate: row.dueDate,
        amountPaise: row.amountPaise,
        status: row.status,
        categoryId: row.categoryId,
        accountId: row.accountId,
        cardId: row.cardId,
        notes: row.notes || "scheduled-due",
      },
    });
    keys.add(row.occurrenceKey);
    saved.push(created);
  }
  return saved;
}

export async function createCustomObligation(
  userId: string,
  input: { title: string; dueDate: string; amountPaise: number },
  obligations: Writer<Obligation> = adapt(obligationRepo),
): Promise<Obligation> {
  const title = input.title.trim();
  if (!title || !input.dueDate) throw new Error("Custom obligation needs a title and due date");
  assertPaise(input.amountPaise, "Obligation amount", false);
  const sourceId = `custom:${title.toLowerCase()}:${input.dueDate}`;
  const occurrenceKey = obligationOccurrenceKey("custom", sourceId, input.dueDate);
  const existing = (await obligations.list(userId)).find(
    (row) => row.isDeleted !== 1 && row.occurrenceKey === occurrenceKey,
  );
  if (existing) return existing;
  return obligations.create({
    userId,
    data: {
      sourceType: "custom",
      sourceId,
      occurrenceKey,
      title,
      dueDate: input.dueDate,
      amountPaise: input.amountPaise,
      status: "due",
      notes: "scheduled-due",
    },
  });
}

export async function matchObligationPayment(
  userId: string,
  occurrenceKey: string,
  input: { transactionId: string; paidPaise: number },
  obligations: Writer<Obligation> = adapt(obligationRepo),
): Promise<Obligation> {
  if (!input.transactionId.trim()) throw new Error("Match an existing payment");
  assertPaise(input.paidPaise, "Paid amount", false);
  const row = (await obligations.list(userId)).find(
    (item) => item.isDeleted !== 1 && item.occurrenceKey === occurrenceKey,
  );
  if (!row) throw new Error("Save the due before matching a payment");
  const already = (row.notes ?? "").match(/paymentTx=([^\s;]+)/);
  if (already?.[1] === input.transactionId) return row;
  if (already) throw new Error("This due is already linked to a payment");
  const status = input.paidPaise >= row.amountPaise ? "paid" : "due";
  const notes = `${row.notes ?? ""} paymentTx=${input.transactionId};paidPaise=${input.paidPaise}`.trim();
  const updated = await obligations.update(row.id, { status, notes });
  if (!updated) throw new Error("Save the due before matching a payment");
  return updated;
}

function shiftDueDate(dueDate: string, days: number): string {
  const [year, month, day] = dueDate.slice(0, 10).split("-").map(Number);
  const next = addDays(new Date(year, (month || 1) - 1, day || 1), days);
  const mm = String(next.getMonth() + 1).padStart(2, "0");
  const dd = String(next.getDate()).padStart(2, "0");
  return `${next.getFullYear()}-${mm}-${dd}`;
}

export async function createInAppReminder(
  userId: string,
  input: { title: string; dueDate: string; kind?: Reminder["kind"]; amount?: number; linkedId?: string },
  reminders: Writer<Reminder> = adapt(reminderRepo),
): Promise<Reminder> {
  const title = input.title.trim();
  if (!title) throw new Error("Reminder needs a title");
  if (!input.dueDate) throw new Error("Reminder needs a due date");
  const linkedId = input.linkedId?.trim();
  return reminders.create({
    userId,
    data: {
      kind: input.kind ?? "custom",
      title,
      dueDate: input.dueDate,
      amount: input.amount,
      linkedId: linkedId || undefined,
      recurring: 0,
      done: 0,
      notes: linkedId ? `channel=in-app;linkedId=${linkedId}` : "channel=in-app",
    },
  });
}

export async function snoozeReminder(
  reminder: Reminder,
  days: number,
  reminders: Writer<Reminder> = adapt(reminderRepo),
): Promise<Reminder | undefined> {
  if (!Number.isInteger(days) || days < 1) throw new Error("Snooze days must be a positive integer");
  return reminders.update(reminder.id, {
    dueDate: shiftDueDate(reminder.dueDate, days),
    done: 0,
    notes: "channel=in-app",
  });
}

export async function completeReminder(
  reminder: Reminder,
  reminders: Writer<Reminder> = adapt(reminderRepo),
): Promise<Reminder | undefined> {
  return reminders.update(reminder.id, { done: 1, notes: "channel=in-app" });
}

export async function saveSharedCardLimit(
  userId: string,
  input: { cardId: string; name: string; totalLimitPaise: number },
  groups: Writer<CreditLimitGroup> = adapt(creditLimitGroupRepo),
  cards: Writer<Card> = adapt(cardRepo),
): Promise<CreditLimitGroup> {
  if (!input.cardId) throw new Error("Shared limit needs a card");
  const name = input.name.trim();
  if (!name) throw new Error("Shared limit needs a name");
  assertPaise(input.totalLimitPaise, "totalLimitPaise");
  const card = (await cards.list(userId)).find((row) => row.id === input.cardId && row.isDeleted !== 1);
  if (!card) throw new Error("Card was not found");
  if (card.sharedLimitGroupId) {
    const updated = await groups.update(card.sharedLimitGroupId, {
      name,
      totalLimitPaise: input.totalLimitPaise,
    });
    if (updated) return updated;
  }
  const group = await groups.create({
    userId,
    data: { name, totalLimitPaise: input.totalLimitPaise },
  });
  const saved = await cards.update(input.cardId, { sharedLimitGroupId: group.id });
  if (!saved) throw new Error("Card was not found");
  return group;
}

export async function saveCardStatement(
  userId: string,
  input: Omit<CardStatement, "id" | "userId" | "createdAt" | "updatedAt" | "isDeleted" | "version" | "tags" | "notes"> & { notes?: string },
  statements: Writer<CardStatement> = adapt(cardStatementRepo),
): Promise<CardStatement> {
  if (!input.cardId) throw new Error("Statement needs a card");
  if (!input.cycleStartDate || !input.cycleEndDate || input.cycleStartDate > input.cycleEndDate) {
    throw new Error("Statement cycle dates are invalid");
  }
  for (const [field, value] of [
    ["openingBalancePaise", input.openingBalancePaise],
    ["closingBalancePaise", input.closingBalancePaise],
    ["retailSpendPaise", input.retailSpendPaise],
    ["paymentsPaise", input.paymentsPaise],
    ["creditsPaise", input.creditsPaise],
  ] as const) {
    assertPaise(value, field);
  }
  const minimumDue = normalizeCardMoneyWrite(input.minimumDuePaise, input.minimumDueEvidence, "minimumDuePaise");
  const fees = normalizeCardMoneyWrite(input.feesPaise, input.feesEvidence, "feesPaise");
  const interest = normalizeCardMoneyWrite(input.interestPaise, input.interestEvidence, "interestPaise");
  input = {
    ...input,
    minimumDuePaise: minimumDue.valuePaise,
    minimumDueEvidence: minimumDue.evidence ?? input.minimumDueEvidence,
    feesPaise: fees.valuePaise,
    feesEvidence: fees.evidence ?? input.feesEvidence,
    interestPaise: interest.valuePaise,
    interestEvidence: interest.evidence ?? input.interestEvidence,
  };
  if (input.status !== "open" && input.status !== "closed" && input.status !== "paid") {
    throw new Error("Statement status must be open, closed, or paid");
  }
  return statements.create({ userId, data: input });
}

export async function saveCardPaymentAllocation(
  userId: string,
  input: { cardId: string; transactionId: string; amountPaise: number; statementId?: string; allocatedAt: string },
  allocations: Writer<CardPaymentAllocation> = adapt(cardPaymentAllocationRepo),
): Promise<CardPaymentAllocation> {
  if (!input.cardId || !input.transactionId) {
    throw new Error("Allocation needs a card and an existing payment transaction");
  }
  assertPaise(input.amountPaise, "Allocation amount", false);
  if (!input.allocatedAt) throw new Error("Allocation needs a date");
  return allocations.create({
    userId,
    data: {
      cardId: input.cardId,
      statementId: input.statementId,
      transactionId: input.transactionId,
      amountPaise: input.amountPaise,
      allocatedAt: input.allocatedAt,
    },
  });
}

export async function saveCardEmiPlan(
  userId: string,
  input: {
    cardId: string;
    purchaseTransactionIds: string[];
    principalPaise: number;
    annualRateBps: number;
    tenureMonths: number;
    startDate: string;
    noCostEmi?: boolean;
  },
  plans: Writer<CardEmiPlan> = adapt(cardEmiPlanRepo),
  installments: Writer<CardEmiInstallment> = adapt(cardEmiInstallmentRepo),
): Promise<{ plan: CardEmiPlan; installments: CardEmiInstallment[] }> {
  if (!input.cardId) throw new Error("EMI plan needs a card");
  if (input.purchaseTransactionIds.length === 0 || input.purchaseTransactionIds.some((id) => !id)) {
    throw new Error("Choose the purchase already on the card. Conversion does not post that purchase again.");
  }
  assertPaise(input.principalPaise, "Principal", false);
  if (!Number.isInteger(input.annualRateBps) || input.annualRateBps < 0) {
    throw new Error("Interest rate must be a non-negative basis-point integer");
  }
  if (!Number.isInteger(input.tenureMonths) || input.tenureMonths < 1) {
    throw new Error("Tenure must be at least one month");
  }
  if (!input.startDate) throw new Error("EMI plan needs a start date");
  const existing = await plans.list(userId);
  const already = existing.some(
    (plan) =>
      plan.isDeleted !== 1 &&
      plan.status !== "closed" &&
      plan.purchaseTransactionIds.some((id) => input.purchaseTransactionIds.includes(id)),
  );
  if (already) {
    throw new Error("That purchase is already on an EMI plan. Conversion does not post it again.");
  }
  const draft = createCardEmiPlanFromPurchase({
    id: "pending",
    userId,
    cardId: input.cardId,
    purchaseTransactionIds: input.purchaseTransactionIds,
    principalPaise: input.principalPaise,
    annualRateBps: input.annualRateBps,
    tenureMonths: input.tenureMonths,
    startDate: input.startDate,
    noCostEmi: input.noCostEmi,
  });
  const plan = await plans.create({
    userId,
    data: {
      cardId: draft.plan.cardId,
      purchaseTransactionIds: draft.plan.purchaseTransactionIds,
      principalPaise: draft.plan.principalPaise,
      annualRateBps: draft.plan.annualRateBps,
      tenureMonths: draft.plan.tenureMonths,
      emiPaise: draft.plan.emiPaise,
      startDate: draft.plan.startDate,
      status: draft.plan.status,
      scheduleStrategy: draft.plan.scheduleStrategy,
      calculationVersion: draft.plan.calculationVersion,
      noCostEmi: draft.plan.noCostEmi,
    },
  });
  const saved: CardEmiInstallment[] = [];
  for (const row of draft.installments) {
    saved.push(
      await installments.create({
        userId,
        data: {
          planId: plan.id,
          installmentNo: row.installmentNo,
          dueDate: row.dueDate,
          emiPaise: row.emiPaise,
          principalPaise: row.principalPaise,
          interestPaise: row.interestPaise,
          feePaise: row.feePaise,
          taxPaise: row.taxPaise,
          status: row.status,
          source: row.source,
        },
      }),
    );
  }
  return { plan, installments: saved };
}

export type HouseholdUiRole = "owner" | "editor" | "viewer";

export function storedHouseholdRole(role: HouseholdUiRole): HouseholdMember["role"] {
  return role === "editor" ? "partner" : role;
}

export function householdRoleLabel(role: string): string {
  if (role === "owner") return "Owner";
  if (role === "partner" || role === "editor") return "Editor";
  return "Viewer";
}

export function householdActorCanWrite(role: string | undefined): boolean {
  return role === "owner" || role === "partner" || role === "editor";
}

export function assertHouseholdWriter(role: string | undefined): void {
  if (!householdActorCanWrite(role)) throw new Error("Viewer cannot change household records");
}

export function actingHouseholdMember(
  members: HouseholdMember[],
  householdId: string,
): HouseholdMember | undefined {
  const rows = members.filter((member) => member.householdId === householdId && member.isDeleted !== 1);
  return rows.find((member) => (member.notes ?? "").includes("self=1"))
    ?? rows.find((member) => member.role === "owner")
    ?? rows[0];
}

export const SHARED_MARKER = "shared=1";

export function rowIsShared(row: { notes?: string; tags?: string[] }): boolean {
  if (row.tags?.includes("shared")) return true;
  return (row.notes ?? "").includes(SHARED_MARKER);
}

export async function markTransactionShared<T>(
  actorRole: string | undefined,
  transactionId: string,
  notes: string | undefined,
  shared: boolean,
  update: (id: string, patch: { notes: string }) => Promise<T>,
): Promise<T> {
  assertHouseholdWriter(actorRole);
  if (!transactionId) throw new Error("Choose a transaction to share");
  return update(transactionId, { notes: withSharedMarker(notes, shared) });
}

export function withSharedMarker(notes: string | undefined, shared: boolean): string {
  const base = (notes ?? "").replace(/\bshared=1\b/g, "").replace(/\s+/g, " ").trim();
  if (!shared) return base;
  return base ? `${base} ${SHARED_MARKER}` : SHARED_MARKER;
}

export function sharedFamilyKpis(
  rows: Array<Pick<Transaction, "type" | "isDeleted" | "notes" | "tags" | "amount" | "amountPaise">>,
) {
  let incomePaise = 0;
  let expensePaise = 0;
  let sharedCount = 0;
  for (const row of rows) {
    if (row.isDeleted === 1 || !rowIsShared(row)) continue;
    sharedCount += 1;
    const paise = transactionAmountPaise(row);
    if (row.type === "income") incomePaise += paise;
    if (row.type === "expense") expensePaise += paise;
  }
  return { incomePaise, expensePaise, surplusPaise: incomePaise - expensePaise, sharedCount };
}

export async function createHouseholdRecord(
  userId: string,
  name: string,
  displayName: string,
  households: Writer<Household> = adapt(householdRepo),
  members: Writer<HouseholdMember> = adapt(householdMemberRepo),
  permissions: Writer<HouseholdPermission> = adapt(householdPermissionRepo),
) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Household needs a name");
  const household = await households.create({
    userId,
    data: { name: trimmed, defaultCurrency: "INR" },
  });
  const member = await members.create({
    userId,
    data: {
      householdId: household.id,
      displayName: displayName.trim() || "Owner",
      role: "owner",
      notes: "self=1",
    },
  });
  await permissions.create({
    userId,
    data: {
      householdId: household.id,
      memberId: member.id,
      canViewTransactions: 1,
      canEditTransactions: 1,
      canViewBalances: 1,
    },
  });
  return { household, member };
}

export async function addHouseholdMember(
  userId: string,
  actorRole: string | undefined,
  input: { householdId: string; displayName: string; role: HouseholdUiRole },
  members: Writer<HouseholdMember> = adapt(householdMemberRepo),
  permissions: Writer<HouseholdPermission> = adapt(householdPermissionRepo),
) {
  assertHouseholdWriter(actorRole);
  const displayName = input.displayName.trim();
  if (!input.householdId || !displayName) throw new Error("Member needs a household and a name");
  const role = storedHouseholdRole(input.role);
  const member = await members.create({
    userId,
    data: { householdId: input.householdId, displayName, role },
  });
  await permissions.create({
    userId,
    data: {
      householdId: input.householdId,
      memberId: member.id,
      canViewTransactions: 1,
      canEditTransactions: role === "viewer" ? 0 : 1,
      canViewBalances: 1,
    },
  });
  return member;
}

export async function issueHouseholdInvite(
  userId: string,
  actorRole: string | undefined,
  householdId: string,
  members: Writer<HouseholdMember> = adapt(householdMemberRepo),
  permissions: Writer<HouseholdPermission> = adapt(householdPermissionRepo),
) {
  const code = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  const member = await addHouseholdMember(
    userId,
    actorRole,
    { householdId, displayName: "Pending invite", role: "viewer" },
    members,
    permissions,
  );
  const saved = await members.update(member.id, { notes: `invite=${code}` });
  return { code, member: saved ?? member };
}

export async function acceptHouseholdInvite(
  userId: string,
  code: string,
  displayName: string,
  members: Writer<HouseholdMember> = adapt(householdMemberRepo),
) {
  const trimmed = code.trim();
  const name = displayName.trim();
  if (!trimmed || !name) throw new Error("Invite needs a code and a name");
  const rows = await members.list(userId);
  const match = rows.find(
    (row) => (row.notes ?? "").includes(`invite=${trimmed}`) && !(row.notes ?? "").includes("accepted=1"),
  );
  if (!match) throw new Error("Invite code was not found");
  return members.update(match.id, {
    displayName: name,
    notes: `${match.notes ?? ""};accepted=1`,
  });
}

export async function setHouseholdMemberRole(
  userId: string,
  actorRole: string | undefined,
  memberId: string,
  role: HouseholdUiRole,
  members: Writer<HouseholdMember> = adapt(householdMemberRepo),
  permissions: Writer<HouseholdPermission> = adapt(householdPermissionRepo),
) {
  assertHouseholdWriter(actorRole);
  const stored = storedHouseholdRole(role);
  const rows = await members.list(userId);
  const current = rows.find((row) => row.id === memberId && row.isDeleted !== 1);
  if (!current) throw new Error("Member was not found");
  const owners = rows.filter((row) => row.householdId === current.householdId && row.role === "owner" && row.isDeleted !== 1);
  if (current.role === "owner" && !decideLastOwner(owners.length, stored).ok) throw new Error("The last owner cannot be removed");
  const member = await members.update(memberId, { role: stored });
  if (!member) throw new Error("Member was not found");
  const permission = (await permissions.list(userId)).find(
    (row) => row.isDeleted !== 1 && row.memberId === memberId,
  );
  const canEditTransactions = stored === "viewer" ? 0 : 1;
  if (permission) {
    await permissions.update(permission.id, { canEditTransactions });
  }
  return member;
}

const DEFAULT_ATTACHMENT_BYTES = 8 * 1024 * 1024;

export function attachmentHasContent(notes: string | undefined): boolean {
  const value = notes ?? "";
  if (!value.includes("local-blob=") || value.includes("local-blob=metadata-only")) return false;
  return /local-blob=[A-Za-z0-9+/=]+/.test(value);
}

async function attachmentHash(content: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createAttachmentMetadata(
  userId: string,
  input: {
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    linkedType: AttachmentMeta["linkedType"];
    linkedId: string;
    contentBase64?: string;
  },
  attachments: Writer<AttachmentMeta> = adapt(attachmentRepo),
  options?: { maxBytes?: number | null },
): Promise<AttachmentMeta> {
  if (!input.fileName.trim() || !input.mimeType.trim() || !input.linkedId.trim()) {
    throw new Error("Attachment metadata needs a file name, type, and linked record");
  }
  if (!Number.isInteger(input.sizeBytes) || input.sizeBytes < 0) {
    throw new Error("Attachment size must be a non-negative integer");
  }
  const content = input.contentBase64?.trim() ?? "";
  if (!content || content === "metadata-only") {
    throw new Error("Attachment content is not stored");
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(content) || content.length % 4 !== 0) {
    throw new Error("Attachment content must be base64");
  }
  const limit = options?.maxBytes === undefined ? DEFAULT_ATTACHMENT_BYTES : options.maxBytes;
  if (limit != null && input.sizeBytes > limit) {
    throw new Error("Attachment is over the storage limit");
  }
  const hash = await attachmentHash(content);
  const notes = `local-blob=${content};sha256=${hash};bytes=${input.sizeBytes}`;
  return attachments.create({
    userId,
    data: {
      fileName: input.fileName.trim(),
      mimeType: input.mimeType.trim(),
      sizeBytes: input.sizeBytes,
      linkedType: input.linkedType,
      linkedId: input.linkedId,
      notes,
    },
  });
}

export function readAttachmentContent(row: AttachmentMeta, userId: string): string {
  if (row.userId !== userId || row.isDeleted === 1) {
    throw new Error("Attachment belongs to another profile");
  }
  const notes = row.notes ?? "";
  if (!attachmentHasContent(notes)) throw new Error("Attachment content is not stored");
  const match = notes.match(/local-blob=([A-Za-z0-9+/=]+)/);
  if (!match) throw new Error("Attachment content is not stored");
  return match[1];
}

export async function removeAttachment(
  userId: string,
  attachmentId: string,
  attachments: Writer<AttachmentMeta> = adapt(attachmentRepo),
): Promise<void> {
  const row = (await attachments.list(userId)).find((item) => item.id === attachmentId && item.isDeleted !== 1);
  if (!row || row.userId !== userId) throw new Error("Attachment belongs to another profile");
  await attachments.update(attachmentId, { isDeleted: 1 });
}

export async function captureFinancialSnapshot(
  userId: string,
  input: {
    periodKey: string;
    totalIncome: number;
    totalExpense: number;
    netSavings: number;
    savingsRate: number;
    budgetUsage: number;
    creditUtilization: number;
    healthScore: number;
  },
  snapshots: Writer<import("@/types").FinancialSnapshot> = adapt(snapshotRepo),
) {
  if (!input.periodKey.trim()) throw new Error("Snapshot needs a period");
  for (const value of [
    input.totalIncome,
    input.totalExpense,
    input.netSavings,
    input.savingsRate,
    input.budgetUsage,
    input.creditUtilization,
    input.healthScore,
  ]) {
    if (!Number.isFinite(value)) throw new Error("Snapshot figures must be finite numbers");
  }
  return snapshots.create({
    userId,
    data: { ...input, periodKey: input.periodKey.trim(), notes: "snapshot does not add cash" },
  });
}

export async function recordLocalAaSimulator(
  userId: string,
  sources: Writer<ImportSource> = adapt(importSourceRepo),
): Promise<ImportSource> {
  if (!userId) throw new Error("Sign in before running the local simulator");
  return sources.create({
    userId,
    data: {
      name: "Local Account Aggregator simulator",
      kind: "aa_ready",
      lastImportAt: new Date().toISOString(),
      notes: "not-live",
    },
  });
}

export async function collectPersonalBackupExtras(userId: string) {
  const [
    transferLinks,
    cardStatements,
    cardPaymentAllocations,
    cardEmiPlans,
    cardEmiInstallments,
    obligations,
    sinkingFunds,
    households,
    householdMembers,
    householdPermissions,
    fixedIncomeAssets,
    insurancePolicies,
    assetValuations,
    importSources,
    reconciliationMatches,
    attachments,
    snapshots,
  ] = await Promise.all([
    transferLinkRepo.list(userId),
    cardStatementRepo.list(userId),
    cardPaymentAllocationRepo.list(userId),
    cardEmiPlanRepo.list(userId),
    cardEmiInstallmentRepo.list(userId),
    obligationRepo.list(userId),
    sinkingFundRepo.list(userId),
    householdRepo.list(userId),
    householdMemberRepo.list(userId),
    householdPermissionRepo.list(userId),
    fixedIncomeAssetRepo.list(userId),
    insurancePolicyRepo.list(userId),
    assetValuationRepo.list(userId),
    importSourceRepo.list(userId),
    reconciliationMatchRepo.list(userId),
    attachmentRepo.list(userId),
    snapshotRepo.list(userId),
  ]);
  return {
    transferLinks,
    cardStatements,
    cardPaymentAllocations,
    cardEmiPlans,
    cardEmiInstallments,
    obligations,
    sinkingFunds,
    households,
    householdMembers,
    householdPermissions,
    fixedIncomeAssets,
    insurancePolicies,
    assetValuations,
    importSources,
    reconciliationMatches,
    attachments,
    snapshots,
  };
}

export function personalDashboardSections(mode: string): Array<"essentials" | "family" | "wealth"> {
  if (mode === "essential") return ["essentials"];
  if (mode === "family") return ["family"];
  if (mode === "wealth") return ["wealth"];
  return [];
}
