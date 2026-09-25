import { describe, it, expect } from "vitest";
import {
  checkInv01Balanced,
  checkInv02PositivePaise,
  checkInv03MinLines,
  checkInv04TrialBalance,
  checkInv05BalanceSheetEquation,
  checkInv06NoSpuriousPnL,
  checkInv07CashBankRules,
  checkInv08PostedOnly,
  checkInv09BillAllocation,
  checkInv10Permission,
  INVARIANT_IDS,
} from "@/company/services/__tests__/helpers/invariants";
import { mapPurposeToDraftLines } from "@/company/services/purposeEngine";
import type { AccountNature } from "@/company/types";

const natures: Record<string, AccountNature> = {
  BANK: "ASSET",
  LOAN: "LIABILITY",
  EXP: "EXPENSE",
};

describe("invariants INV-01..10", () => {
  it("exposes ten invariant ids", () => {
    expect(INVARIANT_IDS).toHaveLength(10);
  });

  it("INV-01..05 structural", () => {
    const lines = [
      { ledgerId: "BANK", side: "DEBIT" as const, amountPaise: 100 },
      { ledgerId: "LOAN", side: "CREDIT" as const, amountPaise: 100 },
    ];
    expect(checkInv01Balanced(lines).ok).toBe(true);
    expect(checkInv02PositivePaise(lines).ok).toBe(true);
    expect(checkInv03MinLines(lines).ok).toBe(true);
    expect(checkInv04TrialBalance(lines, natures).ok).toBe(true);
    expect(checkInv05BalanceSheetEquation(lines, natures).ok).toBe(true);
  });

  it("INV-06 no spurious P&L on loan", () => {
    const lines = mapPurposeToDraftLines({
      purpose: "LOAN_RECEIVED",
      amountPaise: 500,
      cashBankLedgerId: "BANK",
      partyRelationshipLedgerId: "LOAN",
    });
    expect(checkInv06NoSpuriousPnL(lines, natures, "LOAN_RECEIVED").ok).toBe(true);
  });

  it("INV-07 cash/bank rules", () => {
    const cash = new Set(["BANK", "CASH"]);
    expect(
      checkInv07CashBankRules(
        "RECEIPT",
        [
          { ledgerId: "BANK", side: "DEBIT" },
          { ledgerId: "LOAN", side: "CREDIT" },
        ],
        cash,
      ).ok,
    ).toBe(true);
    expect(
      checkInv07CashBankRules(
        "CONTRA",
        [
          { ledgerId: "BANK", side: "DEBIT" },
          { ledgerId: "EXP", side: "CREDIT" },
        ],
        cash,
      ).ok,
    ).toBe(false);
  });

  it("INV-08 posted only", () => {
    expect(checkInv08PostedOnly("POSTED", true).ok).toBe(true);
    expect(checkInv08PostedOnly("DRAFT", true).ok).toBe(false);
    expect(checkInv08PostedOnly("DRAFT", false).ok).toBe(true);
  });

  it("INV-09 bill over-allocation", () => {
    expect(
      checkInv09BillAllocation(
        { outstandingPaise: 1000, originalAmountPaise: 1000 },
        [{ amountPaise: 400, allocationType: "AGAINST_REFERENCE" }],
      ).ok,
    ).toBe(true);
    expect(
      checkInv09BillAllocation(
        { outstandingPaise: 1000, originalAmountPaise: 1000 },
        [{ amountPaise: 1001, allocationType: "AGAINST_REFERENCE" }],
      ).ok,
    ).toBe(false);
  });

  it("INV-10 permission deny", () => {
    expect(checkInv10Permission(["view_dashboard"], "create_payment").ok).toBe(false);
    expect(checkInv10Permission(["create_payment"], "create_payment").ok).toBe(true);
  });
});
