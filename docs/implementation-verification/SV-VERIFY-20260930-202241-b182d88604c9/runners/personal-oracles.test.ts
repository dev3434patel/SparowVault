import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SparowVaultDB } from "@/db/database";
import { computeAccountCashClosingPaise } from "@/services/accountBalanceEngine";
import { alertPreferenceEnabled, type AlertPreferenceKey } from "@/services/alertPreferences";
import { saveCardEmiPlan, createCashReservation, saveTransferLinkForTransaction } from "@/services/personalBookWorkflows";
import { isExpenseTx, isIncomeTx, sumExpense, sumIncome } from "@/services/calculations";
import type { Account, Card, ProfileSettings, SinkingFund, Transaction, TransferLink } from "@/types";

const USER = "alice-personal";
const BANK = "bank-a";
const CASH = "cash-b";
const CARD = "card-1";

function tx(partial: Partial<Transaction> & Pick<Transaction, "id" | "type" | "amountPaise">): Transaction {
  return {
    userId: USER,
    amount: (partial.amountPaise ?? 0) / 100,
    date: "2026-09-30",
    paymentMode: "upi",
    merchantOrPerson: "audit",
    description: partial.id,
    billAvailable: 0,
    gstApplicable: 0,
    taxFlag: 0,
    businessOrPersonal: "personal",
    needWant: "unassigned",
    fixedVariable: "unassigned",
    plannedUnplanned: "unassigned",
    isDeleted: 0,
    createdAt: "2026-09-30T00:00:00.000Z",
    updatedAt: "2026-09-30T00:00:00.000Z",
    version: 1,
    tags: [],
    notes: "",
    ...partial,
  };
}

function independentEmiPaise(principalPaise: number, annualPercent: number, months: number): number {
  const principalRupees = principalPaise / 100;
  const monthly = annualPercent / 12 / 100;
  const growth = (1 + monthly) ** months;
  return Math.round((principalRupees * monthly * growth / (growth - 1)) * 100);
}

describe("personal indexeddb oracles", () => {
  let db: SparowVaultDB;

  beforeEach(async () => {
    db = new SparowVaultDB("sparowvault_v1");
    await db.delete();
    db = new SparowVaultDB("sparowvault_v1");
    await db.open();
  });

  afterEach(async () => {
    db.close();
  });

  it("O01 reservation labels cash and does not move the bank", async () => {
    const opening = 500_000;
    const reserved = 200_000;
    const fund = await createCashReservation(USER, {
      name: "Rent envelope",
      kind: "envelope",
      targetPaise: 300_000,
      reservedPaise: reserved,
      targetDate: "2026-10-31",
    }, {
      list: async () => db.sinkingFunds.where("userId").equals(USER).toArray(),
      create: async (input) => {
        const row = {
          id: "fund-1",
          userId: input.userId,
          name: input.data.name,
          targetPaise: input.data.targetPaise,
          targetDate: input.data.targetDate,
          notes: input.data.notes,
          createdAt: "2026-09-30T00:00:00.000Z",
          updatedAt: "2026-09-30T00:00:00.000Z",
          isDeleted: 0,
          version: 1,
          tags: [],
        } as SinkingFund;
        await db.sinkingFunds.add(row);
        return row;
      },
      update: async () => undefined,
    });
    const stored = await db.sinkingFunds.get(fund.id);
    const txs = await db.transactions.toArray();
    const bank = computeAccountCashClosingPaise(BANK, opening, txs);
    expect(stored?.notes).toContain("reservedPaise=200000");
    expect(txs).toHaveLength(0);
    expect(bank).toBe(opening);
    expect(opening - reserved).toBe(300_000);
  });

  it("O02 transfer moves both accounts and leaves net cash unchanged", async () => {
    const amount = 30_000;
    const row = tx({ id: "t-transfer", type: "transfer", amountPaise: amount, accountId: BANK, toAccountId: CASH, paymentMode: "bank_transfer" });
    await db.transactions.add(row);
    await saveTransferLinkForTransaction(USER, row, {
      list: async () => [],
      create: async (input) => {
        const link = { id: "link-1", userId: USER, ...input.data, createdAt: row.createdAt, updatedAt: row.updatedAt, isDeleted: 0, version: 1, tags: [], notes: "" } as TransferLink;
        await db.transferLinks.add(link);
        return link;
      },
      update: async () => undefined,
    });
    const txs = await db.transactions.toArray();
    const from = computeAccountCashClosingPaise(BANK, 100_000, txs);
    const to = computeAccountCashClosingPaise(CASH, 0, txs);
    expect(from).toBe(70_000);
    expect(to).toBe(amount);
    expect(from + to).toBe(100_000);
    expect((await db.transferLinks.toArray())).toHaveLength(1);
  });

  it("O03 card purchase does not touch the bank and repayment is not a second expense", async () => {
    const purchase = 250_000;
    const repay = 100_000;
    await db.transactions.bulkAdd([
      tx({ id: "t-card-buy", type: "expense", amountPaise: purchase, accountId: BANK, paymentMode: "credit_card", linkedCardId: CARD }),
      tx({ id: "t-card-pay", type: "cc_payment", amountPaise: repay, accountId: BANK, paymentMode: "upi", linkedCardId: CARD }),
    ]);
    const txs = await db.transactions.toArray();
    const bank = computeAccountCashClosingPaise(BANK, 400_000, txs);
    const expense = sumExpense(txs);
    const cardLiability = txs
      .filter((row) => row.linkedCardId === CARD && row.isDeleted !== 1)
      .reduce((sum, row) => sum + (row.type === "expense" ? row.amountPaise! : row.type === "cc_payment" ? -row.amountPaise! : 0), 0);
    expect(bank).toBe(300_000);
    expect(expense).toBe(purchase);
    expect(cardLiability).toBe(purchase - repay);
  });

  it("O04 EMI conversion keeps principal and does not post the purchase again", async () => {
    const principal = 1_200_000;
    await db.transactions.add(tx({
      id: "t-emi-purchase",
      type: "expense",
      amountPaise: principal,
      paymentMode: "credit_card",
      linkedCardId: CARD,
    }));
    const before = await db.transactions.count();
    const saved = await saveCardEmiPlan(USER, {
      cardId: CARD,
      purchaseTransactionIds: ["t-emi-purchase"],
      principalPaise: principal,
      annualRateBps: 1200,
      tenureMonths: 12,
      startDate: "2026-10-01",
    }, {
      list: async () => db.cardEmiPlans.toArray(),
      create: async (input) => {
        const plan = { id: "plan-1", userId: USER, ...input.data, createdAt: "2026-09-30T00:00:00.000Z", updatedAt: "2026-09-30T00:00:00.000Z", isDeleted: 0, version: 1, tags: [], notes: "" };
        await db.cardEmiPlans.add(plan as never);
        return plan as never;
      },
      update: async () => undefined,
    }, {
      list: async () => db.cardEmiInstallments.toArray(),
      create: async (input) => {
        const row = { id: crypto.randomUUID(), userId: USER, ...input.data, createdAt: "2026-09-30T00:00:00.000Z", updatedAt: "2026-09-30T00:00:00.000Z", isDeleted: 0, version: 1, tags: [], notes: "" };
        await db.cardEmiInstallments.add(row as never);
        return row as never;
      },
      update: async () => undefined,
    });
    const principalSum = saved.installments.reduce((sum, row) => sum + row.principalPaise, 0);
    const expectedEmi = independentEmiPaise(principal, 12, 12);
    expect(await db.transactions.count()).toBe(before);
    expect(principalSum).toBe(principal);
    expect(saved.plan.emiPaise).toBe(expectedEmi);
  });

  it("O05 loan proceeds increase cash and are not income", async () => {
    const proceeds = 5_000_000;
    await db.transactions.add(tx({ id: "t-loan", type: "loan_disbursement", amountPaise: proceeds, accountId: BANK, paymentMode: "bank_transfer" }));
    const txs = await db.transactions.toArray();
    expect(computeAccountCashClosingPaise(BANK, 0, txs)).toBe(proceeds);
    expect(sumIncome(txs)).toBe(0);
    expect(txs.filter(isIncomeTx)).toHaveLength(0);
  });

  it("O06 udhari given reduces cash and is not an expense", async () => {
    const given = 40_000;
    await db.transactions.add(tx({ id: "t-udhari", type: "udhari_given", amountPaise: given, accountId: BANK, paymentMode: "upi" }));
    const txs = await db.transactions.toArray();
    expect(computeAccountCashClosingPaise(BANK, 100_000, txs)).toBe(60_000);
    expect(sumExpense(txs)).toBe(0);
    expect(txs.filter(isExpenseTx)).toHaveLength(0);
  });

  it("runs all 64 alert preference combinations", () => {
    const keys: AlertPreferenceKey[] = [
      "budgetAlerts",
      "udhariAlerts",
      "dueAlerts",
      "unusualSpendAlerts",
      "duplicateAlerts",
      "savingsAlerts",
    ];
    const kinds = ["budget_over", "udhari_due", "emi_due_soon", "unusual_spend", "duplicate_candidate", "goal_shortfall"];
    let checks = 0;
    for (let mask = 0; mask < 64; mask += 1) {
      const prefs = Object.fromEntries(keys.map((key, index) => [key, (mask & (1 << index)) !== 0])) as ProfileSettings["warningPreferences"];
      kinds.forEach((kind, index) => {
        const expected = (mask & (1 << index)) !== 0;
        expect(alertPreferenceEnabled(prefs, kind)).toBe(expected);
        checks += 1;
      });
    }
    expect(checks).toBe(384);
  });
});

void (0 as unknown as Account);
void (0 as unknown as Card);
