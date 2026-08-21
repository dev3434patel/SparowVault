import { describe, it, expect } from "vitest";
import {
  materializeRecurringObligations,
  mergeObligationsUnique,
  obligationOccurrenceKey,
} from "@/services/obligationEngine";
import type { RecurringRule } from "@/types";

const rule = (over: Partial<RecurringRule>): RecurringRule =>
  ({
    id: over.id ?? "r1",
    userId: "u1",
    title: over.title ?? "Rent",
    type: "expense",
    amountPaise: over.amountPaise ?? 250_000_0,
    amount: 25000,
    paymentMode: "bank_transfer",
    frequency: "monthly",
    dayOfMonth: over.dayOfMonth ?? 5,
    nextRunDate: "2026-05-05",
    active: 1,
    isDeleted: 0,
    createdAt: "2026-05-01",
    updatedAt: "2026-05-01",
    version: 1,
    tags: [],
    notes: "",
    ...over,
  }) as RecurringRule;

describe("obligationEngine", () => {
  it("occurrenceKey is idempotent for same rule+date", () => {
    const k1 = obligationOccurrenceKey("recurring", "r1", "2026-05-05");
    const k2 = obligationOccurrenceKey("recurring", "r1", "2026-05-05");
    expect(k1).toBe(k2);
  });

  it("mergeObligationsUnique never duplicates occurrenceKey", () => {
    const today = new Date("2026-05-01");
    const a = materializeRecurringObligations([rule({ id: "r1" })], "u1", today);
    const b = materializeRecurringObligations([rule({ id: "r1" })], "u1", today);
    const merged = mergeObligationsUnique(a, b);
    const keys = new Set(merged.map((o) => o.occurrenceKey));
    expect(keys.size).toBe(merged.length);
  });
});
