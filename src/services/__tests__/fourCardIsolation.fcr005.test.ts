/**
 * FCR-005 — Four simultaneous cards: no cross-card contamination of liability/limit/util.
 */
import { describe, it, expect } from "vitest";
import { buildCreditCardIntel } from "@/services/cardEngine";
import { fourCardsFixture, FOUR_CARD_USER_ID } from "../../../tests/fixtures/users/06-four-cards";
import type { Transaction } from "@/types";

const tx = (over: Partial<Transaction>): Transaction =>
  ({
    id: over.id ?? "tx",
    userId: FOUR_CARD_USER_ID,
    type: over.type ?? "expense",
    amountPaise: over.amountPaise ?? 0,
    amount: (over.amountPaise ?? 0) / 100,
    date: over.date ?? "2026-06-15",
    paymentMode: "credit_card",
    merchantOrPerson: "Store",
    description: "",
    billAvailable: 0,
    gstApplicable: 0,
    taxFlag: 0,
    businessOrPersonal: "personal",
    needWant: "unassigned",
    fixedVariable: "unassigned",
    plannedUnplanned: "unassigned",
    isDeleted: 0,
    createdAt: "2026-06-15T00:00:00.000Z",
    updatedAt: "2026-06-15T00:00:00.000Z",
    version: 1,
    tags: [],
    notes: "",
    ...over,
  }) as Transaction;

describe("FCR-005 four-card isolation", () => {
  it("attributes spend only to the charged card; aggregates without contamination", () => {
    const cards = fourCardsFixture.filter((c) => c.type === "credit");
    expect(cards.map((c) => c.id).sort()).toEqual(["card_a", "card_b", "card_c", "card_d"]);

    const spendOnB = tx({
      id: "tx_b",
      linkedCardId: "card_b",
      amountPaise: 60_000_00,
      type: "expense",
    });

    const rows = cards.map((c) => ({
      id: c.id,
      intel: buildCreditCardIntel(c, [spendOnB], [], new Date("2026-06-20")),
    }));

    const outstanding = (id: string) =>
      rows.find((r) => r.id === id)?.intel?.outstandingPaise ?? 0;

    expect(outstanding("card_b")).toBe(60_000_00);
    expect(outstanding("card_a")).toBe(0);
    expect(outstanding("card_c")).toBe(0);
    expect(outstanding("card_d")).toBe(0);

    const aggregateOutstanding = rows.reduce((s, r) => s + (r.intel?.outstandingPaise ?? 0), 0);
    const aggregateLimit = rows.reduce((s, r) => s + (r.intel?.limitPaise ?? 0), 0);
    expect(aggregateOutstanding).toBe(60_000_00);
    expect(aggregateLimit).toBe(cards.reduce((s, c) => s + (c.creditLimitPaise ?? 0), 0));
  });
});
