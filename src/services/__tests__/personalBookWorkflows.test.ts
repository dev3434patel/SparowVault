import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SparowVaultDB } from "@/db/database";
import { CLOUD_COLLECTIONS } from "@/config/syncContracts";
import { fundedGoalTransferEffect, goalEarmarkEffect } from "@/services/statements/goalFunding";
import { reservationSnapshot } from "@/services/reservationMath";
import {
  materializeCardEmiObligations,
  materializeCardStatementObligations,
  materializeInsuranceObligations,
  materializeRecurringObligations,
  materializeUdhariObligations,
} from "@/services/obligationEngine";
import { buildUserOwnedFullExportPayload } from "@/services/exportSafety";
import {
  acceptHouseholdInvite,
  addHouseholdMember,
  attachmentHasContent,
  issueHouseholdInvite,
  linkStatementLegsToOneTransfer,
  markTransactionShared,
  matchObligationPayment,
  captureFinancialSnapshot,
  cloudAllowlistIncludesPersonalKeys,
  completeReminder,
  createAttachmentMetadata,
  createCashReservation,
  createCustomObligation,
  createInAppReminder,
  isWealthSinkingFundInvestment,
  parentCategoryTotals,
  persistProjectedObligations,
  persistReconciliationDecision,
  readAttachmentContent,
  recordLocalAaSimulator,
  removeAttachment,
  reservationViewFromFunds,
  saveCardEmiPlan,
  saveCardPaymentAllocation,
  saveCardStatement,
  saveSharedCardLimit,
  saveTransferLinkForTransaction,
  setHouseholdMemberRole,
  sharedFamilyKpis,
  snoozeReminder,
  personalDashboardSections,
} from "@/services/personalBookWorkflows";
import type { Card, CardEmiInstallment, CardEmiPlan, CardStatement, InsurancePolicy, RecurringRule, Transaction, UdhariRecord } from "@/types";

function writer<T extends { id: string; userId: string; isDeleted?: number; notes?: string; tags?: string[]; version?: number }>(
  table: SparowVaultDB[keyof Pick<SparowVaultDB, "transferLinks" | "reconciliationMatches" | "sinkingFunds" | "obligations" | "reminders" | "cardStatements" | "cardPaymentAllocations" | "cardEmiPlans" | "cardEmiInstallments" | "households" | "householdMembers" | "householdPermissions" | "attachments" | "snapshots" | "importSources" | "transactions" | "investments" | "accounts" | "cards" | "creditLimitGroups">],
) {
  return {
    async list(userId: string) {
      const rows = await table.where("userId").equals(userId).toArray();
      return rows.filter((row) => (row as { isDeleted?: number }).isDeleted !== 1) as T[];
    },
    async create(input: { userId: string; data: Partial<T> }) {
      const now = new Date().toISOString();
      const row = {
        ...input.data,
        id: crypto.randomUUID(),
        userId: input.userId,
        createdAt: now,
        updatedAt: now,
        isDeleted: 0,
        version: 1,
        tags: (input.data as { tags?: string[] }).tags ?? [],
        notes: (input.data as { notes?: string }).notes ?? "",
      } as T;
      await table.add(row as never);
      return row;
    },
    async update(id: string, patch: Partial<T>) {
      const current = (await table.get(id)) as T | undefined;
      if (!current) return undefined;
      const next = {
        ...current,
        ...patch,
        updatedAt: new Date().toISOString(),
        version: (current.version ?? 1) + 1,
      };
      await table.put(next as never);
      return next;
    },
  };
}

let db: SparowVaultDB;

beforeEach(() => {
  db = new SparowVaultDB(`personal-book-${crypto.randomUUID()}`);
});

afterEach(async () => {
  await db.delete();
});

const transfer = (over: Partial<Transaction> = {}): Transaction =>
  ({
    id: "tx-1",
    userId: "u1",
    date: "2026-05-02",
    type: "transfer",
    amount: 500,
    amountPaise: 50000,
    accountId: "bank",
    toAccountId: "cash",
    paymentMode: "bank_transfer",
    merchantOrPerson: "",
    description: "move",
    billAvailable: 0,
    gstApplicable: 0,
    taxFlag: 0,
    businessOrPersonal: "personal",
    needWant: "unassigned",
    fixedVariable: "unassigned",
    plannedUnplanned: "unassigned",
    createdAt: "2026-05-02",
    updatedAt: "2026-05-02",
    isDeleted: 0,
    version: 1,
    tags: [],
    notes: "",
    ...over,
  }) as Transaction;

describe("personal book workflows", () => {
  it("keeps the personal cloud keys that already exist on the allowlist", () => {
    expect(cloudAllowlistIncludesPersonalKeys(CLOUD_COLLECTIONS)).toBe(true);
    expect(CLOUD_COLLECTIONS).toEqual(expect.arrayContaining([
      "households",
      "fixedIncomeAssets",
      "cardEmiPlans",
      "obligations",
      "sinkingFunds",
      "importSources",
      "reconciliationMatches",
    ]));
  });

  it("rolls a child spend into the parent total", () => {
    const totals = parentCategoryTotals(
      [
        { id: "food", parentId: null, name: "Food" },
        { id: "groceries", parentId: "food", name: "Groceries" },
      ],
      [{ id: "t1", categoryId: "groceries", amountPaise: 12500 }],
    );
    expect(totals).toEqual([{ categoryId: "food", name: "Food", totalPaise: 12500 }]);
  });

  it("writes a transfer link on the existing transaction and does not add another movement", async () => {
    await db.transactions.add(transfer());
    const before = await db.transactions.count();
    const link = await saveTransferLinkForTransaction("u1", transfer(), writer(db.transferLinks));
    expect(link?.transactionId).toBe("tx-1");
    expect(await db.transactions.count()).toBe(before);
    expect(await db.transferLinks.count()).toBe(1);
    await saveTransferLinkForTransaction("u1", transfer({ amountPaise: 60000, amount: 600 }), writer(db.transferLinks));
    expect(await db.transferLinks.count()).toBe(1);
    expect((await db.transferLinks.toArray())[0]?.amountPaise).toBe(60000);
  });

  it("links both statement legs to one transfer and keeps a fee off that amount", async () => {
    await db.transactions.add(transfer());
    const before = await db.transactions.count();
    const link = await linkStatementLegsToOneTransfer(
      "u1",
      transfer(),
      [
        { observationId: "leg-out", accountId: "bank", direction: "debit", amountPaise: 50000 },
        { observationId: "leg-in", accountId: "cash", direction: "credit", amountPaise: 50000 },
      ],
      writer(db.transferLinks),
      { transactionId: "fee-1", amountPaise: 200 },
    );
    expect(link.transactionId).toBe("tx-1");
    expect(link.amountPaise).toBe(50000);
    expect(link.feeTransactionId).toBe("fee-1");
    expect(link.notes).toContain("observations=leg-out,leg-in");
    expect(await db.transferLinks.count()).toBe(1);
    expect(await db.transactions.count()).toBe(before);
    await expect(linkStatementLegsToOneTransfer(
      "u1",
      transfer({ accountId: "bank", toAccountId: "bank" }),
      [
        { observationId: "a", accountId: "bank", direction: "debit", amountPaise: 50000 },
        { observationId: "b", accountId: "bank", direction: "credit", amountPaise: 50000 },
      ],
      writer(db.transferLinks),
    )).rejects.toThrow(/different/);
  });

  it("persists confirm, reject, and unmatch on the same reconciliation row", async () => {
    const matches = writer(db.reconciliationMatches);
    const confirmed = await persistReconciliationDecision("u1", "confirm", {
      leftTransactionId: "left",
      rightTransactionId: "right",
      confidence: 0.85,
    }, matches);
    expect(confirmed?.status).toBe("confirmed");
    const rejected = await persistReconciliationDecision("u1", "reject", {
      leftTransactionId: "left",
      rightTransactionId: "right",
      confidence: 0.85,
    }, matches);
    expect(rejected?.status).toBe("rejected");
    expect(rejected?.id).toBe(confirmed?.id);
    const unmatched = await persistReconciliationDecision("u1", "unmatch", {
      leftTransactionId: "left",
      rightTransactionId: "right",
      confidence: 0.4,
    }, matches);
    expect(unmatched?.status).toBe("suggested");
    expect(await db.reconciliationMatches.count()).toBe(1);
  });

  it("reserves envelope cash without moving the bank balance", async () => {
    await db.accounts.add({
      id: "bank",
      userId: "u1",
      name: "Bank",
      type: "bank",
      openingBalancePaise: 1_000_000,
      openingBalance: 10000,
      color: "#000",
      icon: "bank",
      createdAt: "2026-05-01",
      updatedAt: "2026-05-01",
      isDeleted: 0,
      version: 1,
      tags: [],
      notes: "",
    });
    await db.investments.add({
      id: "inv-sink",
      userId: "u1",
      name: "Sinking Fund",
      type: "sinking_fund",
      startDate: "2026-01-01",
      frequency: "monthly",
      amount: 1000,
      amountPaise: 100000,
      status: "active",
      totalContributed: 0,
      createdAt: "2026-05-01",
      updatedAt: "2026-05-01",
      isDeleted: 0,
      version: 1,
      tags: [],
      notes: "",
    });
    const fund = await createCashReservation("u1", {
      name: "Insurance envelope",
      kind: "envelope",
      targetPaise: 300000,
      reservedPaise: 100000,
      targetDate: "2026-12-01",
    }, writer(db.sinkingFunds));
    const snap = reservationViewFromFunds({
      bankCashPaise: 1_000_000,
      funds: [fund],
      goalEarmarkPaise: 0,
    });
    expect(snap.bankCashPaise).toBe(1_000_000);
    expect(snap.reservedPaise).toBe(100000);
    expect(snap.availableToSpendPaise).toBe(900000);
    expect(await db.transactions.count()).toBe(0);
    expect((await db.accounts.get("bank"))?.openingBalancePaise).toBe(1_000_000);
    expect(await db.investments.count()).toBe(1);
    expect(isWealthSinkingFundInvestment({ type: "sinking_fund" })).toBe(true);
    expect(fund.notes).toContain("kind=envelope");
  });

  it("stores weekly, quarterly, and yearly dues as obligations, not expenses", async () => {
    const today = new Date(2026, 4, 1);
    const rule = (frequency: RecurringRule["frequency"], id: string, nextRunDate: string): RecurringRule =>
      ({
        id,
        userId: "u1",
        title: frequency,
        type: "expense",
        amount: 100,
        amountPaise: 10000,
        paymentMode: "bank_transfer",
        frequency,
        nextRunDate,
        active: 1,
        isDeleted: 0,
        createdAt: "2026-05-01",
        updatedAt: "2026-05-01",
        version: 1,
        tags: [],
        notes: "",
      }) as RecurringRule;
    const projected = materializeRecurringObligations(
      [
        rule("weekly", "w", "2026-05-04"),
        rule("quarterly", "q", "2026-07-01"),
        rule("yearly", "y", "2027-01-15"),
      ],
      "u1",
      today,
      30,
    );
    expect(projected.some((row) => row.sourceId === "w")).toBe(true);
    expect(projected.some((row) => row.sourceId === "q")).toBe(true);
    expect(projected.some((row) => row.sourceId === "y")).toBe(true);
    const saved = await persistProjectedObligations("u1", projected, writer(db.obligations));
    expect(saved.length).toBe(projected.length);
    await persistProjectedObligations("u1", projected, writer(db.obligations));
    expect(await db.obligations.count()).toBe(projected.length);
    expect(await db.transactions.count()).toBe(0);
  });

  it("persists card, EMI, udhari, and insurance dues without posting an expense", async () => {
    const today = new Date(2026, 4, 1);
    const base = {
      userId: "u1",
      createdAt: "2026-05-01",
      updatedAt: "2026-05-01",
      isDeleted: 0 as const,
      version: 1,
      tags: [] as string[],
      notes: "",
    };
    const projected = [
      ...materializeCardStatementObligations(
        [{
          ...base,
          id: "st-open",
          cardId: "card-1",
          cycleStartDate: "2026-04-01",
          cycleEndDate: "2026-04-30",
          statementDate: "2026-05-01",
          openingBalancePaise: 0,
          closingBalancePaise: 300000,
          minimumDuePaise: 10000,
          retailSpendPaise: 300000,
          feesPaise: 0,
          interestPaise: 0,
          paymentsPaise: 0,
          creditsPaise: 0,
          status: "open",
        }] as CardStatement[],
        [{ ...base, id: "card-1", nickname: "Local Card", dueDay: 15, type: "credit", isInactive: 0 } as Card],
        "u1",
        today,
      ),
      ...materializeCardEmiObligations(
        [{
          ...base,
          id: "inst-1",
          planId: "plan-1",
          installmentNo: 1,
          dueDate: "2026-05-10",
          emiPaise: 40000,
          principalPaise: 38000,
          interestPaise: 2000,
          feePaise: 0,
          taxPaise: 0,
          status: "projected",
          source: "estimated",
        }] as CardEmiInstallment[],
        [{ ...base, id: "plan-1", cardId: "card-1", purchaseTransactionIds: ["purchase-1"], status: "active" } as CardEmiPlan],
        "u1",
        today,
      ),
      ...materializeUdhariObligations(
        [{
          ...base,
          id: "ud-1",
          personName: "Rita",
          type: "payable",
          amount: 500,
          amountPaise: 50000,
          givenDate: "2026-04-01",
          dueDate: "2026-05-12",
          status: "open",
          amountSettled: 200,
          amountSettledPaise: 20000,
          reminderOn: 0,
          context: "friend",
        }] as UdhariRecord[],
        "u1",
        today,
      ),
      ...materializeInsuranceObligations(
        [{ ...base, id: "pol-1", name: "Health", insurer: "Local", premiumPaise: 150000, premiumDueDay: 20, coveragePaise: 0, status: "active" }] as InsurancePolicy[],
        "u1",
        today,
      ),
    ];
    const obligations = writer(db.obligations);
    const saved = await persistProjectedObligations("u1", projected, obligations);
    expect(saved.map((row) => row.sourceType).sort()).toEqual(["card_emi", "card_statement", "insurance", "udhari"]);
    expect(await db.obligations.count()).toBe(4);
    expect(await db.transactions.count()).toBe(0);
    await persistProjectedObligations("u1", projected, obligations);
    expect(await db.obligations.count()).toBe(4);
    const reloaded = await db.obligations.toArray();
    expect(reloaded.every((row) => row.notes === "scheduled-due")).toBe(true);
  });

  it("saves a custom due once and matches an existing payment without posting cash", async () => {
    const obligations = writer(db.obligations);
    const created = await createCustomObligation("u1", {
      title: "Society fee",
      dueDate: "2026-05-18",
      amountPaise: 25000,
    }, obligations);
    const again = await createCustomObligation("u1", {
      title: "Society fee",
      dueDate: "2026-05-18",
      amountPaise: 25000,
    }, obligations);
    expect(again.id).toBe(created.id);
    expect(created.sourceType).toBe("custom");
    expect(await db.transactions.count()).toBe(0);
    const partial = await matchObligationPayment("u1", created.occurrenceKey, {
      transactionId: "pay-existing",
      paidPaise: 10000,
    }, obligations);
    expect(partial.status).toBe("due");
    expect(partial.notes).toContain("paymentTx=pay-existing");
    const replay = await matchObligationPayment("u1", created.occurrenceKey, {
      transactionId: "pay-existing",
      paidPaise: 10000,
    }, obligations);
    expect(replay.id).toBe(partial.id);
    expect(await db.obligations.count()).toBe(1);
    expect(await db.transactions.count()).toBe(0);
  });

  it("creates, snoozes, and completes an in-app reminder", async () => {
    const reminders = writer(db.reminders);
    const created = await createInAppReminder("u1", {
      title: "Rent",
      dueDate: "2026-05-05",
      linkedId: "rule-rent",
    }, reminders);
    expect(created.done).toBe(0);
    expect(created.linkedId).toBe("rule-rent");
    expect(created.notes).toContain("in-app");
    const snoozed = await snoozeReminder(created, 3, reminders);
    expect(snoozed?.dueDate).toBe("2026-05-08");
    const done = await completeReminder(snoozed!, reminders);
    expect(done?.done).toBe(1);
  });

  it("issues a household invite that a viewer cannot create and that stays a viewer after accept", async () => {
    const members = writer(db.householdMembers);
    const permissions = writer(db.householdPermissions);
    await expect(issueHouseholdInvite("u1", "viewer", "h1", members, permissions)).rejects.toThrow(/Viewer/);
    const issued = await issueHouseholdInvite("u1", "owner", "h1", members, permissions);
    const accepted = await acceptHouseholdInvite("u1", issued.code, "Rita", members);
    expect(accepted?.displayName).toBe("Rita");
    expect(accepted?.role).toBe("viewer");
    expect(accepted?.notes).toContain("accepted=1");
    expect(await db.transactions.count()).toBe(0);
  });

  it("saves a shared limit on the selected card without posting cash", async () => {
    const cards = writer(db.cards);
    const card = await cards.create({
      userId: "u1",
      data: { nickname: "Family", bank: "Local", last4: "4242", type: "credit", color: "#000", isInactive: 0 },
    });
    const group = await saveSharedCardLimit(
      "u1",
      { cardId: card.id, name: "Household cards", totalLimitPaise: 5000000 },
      writer(db.creditLimitGroups),
      cards,
    );
    expect(group.totalLimitPaise).toBe(5000000);
    const saved = await db.cards.get(card.id);
    expect(saved?.sharedLimitGroupId).toBe(group.id);
    expect(await db.transactions.count()).toBe(0);
    const revised = await saveSharedCardLimit(
      "u1",
      { cardId: card.id, name: "Household cards", totalLimitPaise: 4000000 },
      writer(db.creditLimitGroups),
      cards,
    );
    expect(revised.id).toBe(group.id);
    expect(revised.totalLimitPaise).toBe(4000000);
    expect(await db.creditLimitGroups.count()).toBe(1);
  });

  it("saves a statement, a payment allocation, and an EMI plan without posting the purchase", async () => {
    const statement = await saveCardStatement("u1", {
      cardId: "card-1",
      cycleStartDate: "2026-04-01",
      cycleEndDate: "2026-04-30",
      statementDate: "2026-05-01",
      openingBalancePaise: 0,
      closingBalancePaise: 200000,
      minimumDuePaise: 10000,
      retailSpendPaise: 200000,
      feesPaise: 0,
      interestPaise: 0,
      paymentsPaise: 0,
      creditsPaise: 0,
      status: "open",
    }, writer(db.cardStatements));
    const allocation = await saveCardPaymentAllocation("u1", {
      cardId: "card-1",
      statementId: statement.id,
      transactionId: "pay-1",
      amountPaise: 50000,
      allocatedAt: "2026-05-10",
    }, writer(db.cardPaymentAllocations));
    const emi = await saveCardEmiPlan("u1", {
      cardId: "card-1",
      purchaseTransactionIds: ["purchase-1"],
      principalPaise: 120000,
      annualRateBps: 1800,
      tenureMonths: 3,
      startDate: "2026-05-01",
    }, writer(db.cardEmiPlans), writer(db.cardEmiInstallments));
    expect(allocation.transactionId).toBe("pay-1");
    expect(emi.installments).toHaveLength(3);
    expect(emi.installments.every((row) => row.planId === emi.plan.id)).toBe(true);
    expect(await db.transactions.count()).toBe(0);
    await expect(saveCardEmiPlan("u1", {
      cardId: "card-1",
      purchaseTransactionIds: ["purchase-1"],
      principalPaise: 120000,
      annualRateBps: 1800,
      tenureMonths: 3,
      startDate: "2026-05-01",
    }, writer(db.cardEmiPlans), writer(db.cardEmiInstallments))).rejects.toThrow(/does not post/);
  });

  it("blocks a viewer and counts only explicitly shared rows", async () => {
    await expect(addHouseholdMember("u1", "viewer", {
      householdId: "h1",
      displayName: "Kid",
      role: "editor",
    }, writer(db.householdMembers), writer(db.householdPermissions))).rejects.toThrow(/Viewer cannot/);
    expect(await db.householdMembers.count()).toBe(0);
    const owner = await addHouseholdMember("u1", "owner", {
      householdId: "h1",
      displayName: "Partner",
      role: "editor",
    }, writer(db.householdMembers), writer(db.householdPermissions));
    expect(owner.role).toBe("partner");
    expect((await db.householdPermissions.toArray())[0]?.canEditTransactions).toBe(1);
    const viewer = await addHouseholdMember("u1", "owner", {
      householdId: "h1",
      displayName: "Guest",
      role: "viewer",
    }, writer(db.householdMembers), writer(db.householdPermissions));
    expect(viewer.role).toBe("viewer");
    await setHouseholdMemberRole("u1", "partner", viewer.id, "editor", writer(db.householdMembers), writer(db.householdPermissions));
    expect((await db.householdMembers.get(viewer.id))?.role).toBe("partner");
    const kpis = sharedFamilyKpis([
      { ...transfer({ id: "in", type: "income", amountPaise: 80000, notes: "shared=1" }) },
      { ...transfer({ id: "hidden", type: "income", amountPaise: 99999, notes: "" }) },
      { ...transfer({ id: "out", type: "expense", amountPaise: 20000, tags: ["shared"] }) },
    ]);
    expect(kpis).toMatchObject({ incomePaise: 80000, expensePaise: 20000, surplusPaise: 60000, sharedCount: 2 });
    let writes = 0;
    await expect(markTransactionShared("viewer", "tx-1", "", true, async () => {
      writes += 1;
      return undefined;
    })).rejects.toThrow(/Viewer cannot/);
    expect(writes).toBe(0);
    const notes = await markTransactionShared("owner", "tx-1", "rent", true, async (_id, patch) => patch.notes);
    expect(notes).toBe("rent shared=1");
  });

  it("stores attachment metadata and a snapshot without adding cash", async () => {
    await db.accounts.add({
      id: "bank",
      userId: "u1",
      name: "Bank",
      type: "bank",
      openingBalancePaise: 250000,
      openingBalance: 2500,
      color: "#000",
      icon: "bank",
      createdAt: "2026-05-01",
      updatedAt: "2026-05-01",
      isDeleted: 0,
      version: 1,
      tags: [],
      notes: "",
    });
    const attachment = await createAttachmentMetadata("u1", {
      fileName: "bill.pdf",
      mimeType: "application/pdf",
      sizeBytes: 5,
      linkedType: "transaction",
      linkedId: "tx-1",
      contentBase64: "aGVsbG8=",
    }, writer(db.attachments));
    const snapshot = await captureFinancialSnapshot("u1", {
      periodKey: "2026-05",
      totalIncome: 1000,
      totalExpense: 400,
      netSavings: 600,
      savingsRate: 0.6,
      budgetUsage: 0.4,
      creditUtilization: 0.1,
      healthScore: 70,
    }, writer(db.snapshots));
    expect(attachment.fileName).toBe("bill.pdf");
    expect(attachmentHasContent(attachment.notes)).toBe(true);
    expect(attachment.notes).toContain("sha256=");
    expect(attachment.notes).not.toContain("metadata-only");
    expect(readAttachmentContent(attachment, "u1")).toBe("aGVsbG8=");
    expect(() => readAttachmentContent(attachment, "u2")).toThrow(/another profile/);
    await expect(createAttachmentMetadata("u1", {
      fileName: "big.pdf",
      mimeType: "application/pdf",
      sizeBytes: 50,
      linkedType: "transaction",
      linkedId: "tx-1",
      contentBase64: "aGVsbG8=",
    }, writer(db.attachments), { maxBytes: 10 })).rejects.toThrow(/storage limit/);
    expect(await db.attachments.count()).toBe(1);
    await db.transactions.add(transfer({ id: "tx-1" }));
    await removeAttachment("u1", attachment.id, writer(db.attachments));
    expect(await db.transactions.count()).toBe(1);
    expect((await db.transactions.get("tx-1"))?.id).toBe("tx-1");
    expect(snapshot.notes).toContain("does not add cash");
    expect((await db.accounts.get("bank"))?.openingBalancePaise).toBe(250000);
  });

  it("extends JSON backup with the new personal stores and leaves company books out", () => {
    const payload = buildUserOwnedFullExportPayload(
      { id: "u1", username: "me", displayName: "Me" },
      {
        settings: {},
        accounts: [],
        cards: [],
        categories: [],
        transactions: [],
        budgets: [],
        goals: [],
        goalContribs: [],
        loans: [],
        emis: [],
        udhari: [],
        udhariSettlements: [],
        investments: [],
        savingsContribs: [],
        reminders: [],
        recurringRules: [],
        sinkingFunds: [
          {
            id: "sf",
            userId: "u1",
            name: "Trip",
            targetPaise: 100,
            targetDate: "2026-12-01",
            createdAt: "2026-05-01",
            updatedAt: "2026-05-01",
            isDeleted: 0,
            version: 1,
            tags: [],
            notes: "kind=envelope;reservedPaise=40",
          },
          {
            id: "other",
            userId: "u2",
            name: "Other",
            targetPaise: 1,
            targetDate: "2026-12-01",
            createdAt: "2026-05-01",
            updatedAt: "2026-05-01",
            isDeleted: 0,
            version: 1,
            tags: [],
            notes: "",
          },
        ],
      },
    );
    expect(payload.collections.sinkingFunds?.map((row) => row.id)).toEqual(["sf"]);
    expect(payload.collections).not.toHaveProperty("vouchers");
    expect(payload.collections).not.toHaveProperty("companyLedgers");
    expect(personalDashboardSections("essential")).toEqual(["essentials"]);
    expect(personalDashboardSections("family")).toEqual(["family"]);
    expect(personalDashboardSections("wealth")).toEqual(["wealth"]);
    expect(personalDashboardSections("normal")).toEqual([]);
  });

  it("records a local account-aggregator simulator run that is not live", async () => {
    const source = await recordLocalAaSimulator("u1", writer(db.importSources));
    expect(source.kind).toBe("aa_ready");
    expect(source.notes).toContain("not-live");
    expect(source).not.toHaveProperty("password");
  });
});

describe("independent synthetic oracle D", () => {
  it("reserves cash without moving it, and moves cash only on a separate transfer", () => {
    const cashPaise = 1_000_000;
    const snap = reservationSnapshot({
      bankCashPaise: cashPaise,
      envelopeReservedPaise: 150_000,
      sinkingFundReservedPaise: 100_000,
      goalEarmarkPaise: 50_000,
    });
    expect(snap.bankCashPaise).toBe(1_000_000);
    expect(snap.reservedPaise).toBe(300_000);
    expect(snap.availableToSpendPaise).toBe(700_000);
    const earmark = goalEarmarkEffect(snap.reservedPaise);
    expect(earmark.sourceAccountBalanceDeltaPaise).toBe(0);
    expect(earmark.destinationAccountBalanceDeltaPaise).toBe(0);
    expect(earmark.netWorthDeltaPaise).toBe(0);
    expect(cashPaise + earmark.sourceAccountBalanceDeltaPaise).toBe(1_000_000);

    const transfer = fundedGoalTransferEffect(200_000);
    expect(cashPaise + transfer.sourceAccountBalanceDeltaPaise).toBe(800_000);
    expect(transfer.destinationAccountBalanceDeltaPaise).toBe(200_000);
    expect(transfer.netWorthDeltaPaise).toBe(0);
  });
});
