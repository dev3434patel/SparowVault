import { describe, it, expect } from "vitest";
import { splitTransaction, sumSplit } from "@/services/businessPersonalSplit";
import type { Transaction } from "@/types";

const t = (over: Partial<Transaction>): Transaction => ({
  id: "t",
  userId: "u",
  type: "expense",
  amount: 0,
  amountPaise: 0,
  date: "2026-05-13",
  paymentMode: "upi",
  merchantOrPerson: "",
  description: "",
  billAvailable: 0,
  gstApplicable: 0,
  taxFlag: 0,
  businessOrPersonal: "personal",
  needWant: "unassigned",
  fixedVariable: "unassigned",
  plannedUnplanned: "unassigned",
  isDeleted: 0,
  createdAt: "2026-05-13T00:00:00.000Z",
  updatedAt: "2026-05-13T00:00:00.000Z",
  ...over,
}) as Transaction;

describe("Phase 15 — business/personal split", () => {
  it("personal: 100% personal", () => {
    const s = splitTransaction(t({ amountPaise: 10000, businessOrPersonal: "personal" }));
    expect(s).toEqual({ businessPaise: 0, personalPaise: 10000, totalPaise: 10000 });
  });
  it("business: 100% business", () => {
    const s = splitTransaction(t({ amountPaise: 10000, businessOrPersonal: "business" }));
    expect(s).toEqual({ businessPaise: 10000, personalPaise: 0, totalPaise: 10000 });
  });
  it("mixed default 50/50, exact integer total", () => {
    const s = splitTransaction(t({ amountPaise: 10001, businessOrPersonal: "mixed" }));
    expect(s.businessPaise + s.personalPaise).toBe(10001);
    expect(s.businessPaise).toBe(5001); // Math.round(10001 * 0.5) = 5001
    expect(s.personalPaise).toBe(5000);
  });
  it("mixed honours custom splitBusinessPct", () => {
    const tx = t({ amountPaise: 10000, businessOrPersonal: "mixed" }) as unknown as Transaction & { splitBusinessPct: number };
    tx.splitBusinessPct = 70;
    const s = splitTransaction(tx);
    expect(s.businessPaise).toBe(7000);
    expect(s.personalPaise).toBe(3000);
  });
  it("mixed explicit paise split wins over percentage", () => {
    const tx = t({ amountPaise: 10001, businessOrPersonal: "mixed" }) as unknown as Transaction & {
      splitBusinessPaise: number;
      splitBusinessPct: number;
    };
    tx.splitBusinessPaise = 3334;
    tx.splitBusinessPct = 90;
    const s = splitTransaction(tx);
    expect(s.businessPaise).toBe(3334);
    expect(s.personalPaise).toBe(6667);
    expect(s.businessPaise + s.personalPaise).toBe(10001);
  });
  it("clamps splitBusinessPct out of range", () => {
    const tx = t({ amountPaise: 10000, businessOrPersonal: "mixed" }) as unknown as Transaction & { splitBusinessPct: number };
    tx.splitBusinessPct = 250;
    const s = splitTransaction(tx);
    expect(s.businessPaise).toBe(10000);
    expect(s.personalPaise).toBe(0);
  });
  it("sumSplit aggregates correctly and ignores soft-deleted rows", () => {
    const rows = [
      t({ amountPaise: 1000, businessOrPersonal: "business" }),
      t({ amountPaise: 1000, businessOrPersonal: "personal" }),
      t({ amountPaise: 2000, businessOrPersonal: "mixed" }),
      t({ amountPaise: 99999, isDeleted: 1 }),
    ];
    const s = sumSplit(rows);
    expect(s.businessPaise).toBe(1000 + 1000); // business + half of 2000
    expect(s.personalPaise).toBe(1000 + 1000);
    expect(s.totalPaise).toBe(4000);
  });
});
