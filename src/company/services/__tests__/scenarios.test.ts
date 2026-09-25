import { describe, it, expect } from "vitest";
import {
  mapPurposeToDraftLines,
  estimateProfitImpactPaise,
  purposeAffectsProfit,
} from "@/company/services/purposeEngine";
import { assertBalanced } from "@/company/services/voucherBalance";
import { profitLoss } from "@/company/services/__tests__/helpers/reportEngine";
import { checkInv10Permission } from "@/company/services/__tests__/helpers/invariants";
import type { AccountNature, PurposeCode } from "@/company/types";

const N: Record<string, AccountNature> = {
  BANK: "ASSET",
  CASH: "ASSET",
  LOAN: "LIABILITY",
  AR: "ASSET",
  AP: "LIABILITY",
  ADV: "ASSET",
  CAP: "EQUITY",
  DRAW: "EQUITY",
  INT_INC: "INCOME",
  PUR: "EXPENSE",
  EXP: "EXPENSE",
  SAL: "EXPENSE",
  PROP: "ASSET",
};

function run(
  purpose: PurposeCode,
  amountPaise: number,
  cash: string,
  counter: string,
  extra?: { from?: string; to?: string; direction?: "received" | "paid" },
) {
  const lines = mapPurposeToDraftLines({
    purpose,
    amountPaise,
    cashBankLedgerId: cash,
    partyRelationshipLedgerId: counter,
    fromLedgerId: extra?.from,
    toLedgerId: extra?.to,
    quickDirection: extra?.direction,
  });
  assertBalanced(lines);
  return lines;
}

describe("scenarios A–J", () => {
  it("A loan received", () => {
    const lines = run("LOAN_RECEIVED", 100_000_00, "BANK", "LOAN");
    expect(estimateProfitImpactPaise(lines, N)).toBe(0);
  });

  it("B advance / farmer advance", () => {
    expect(estimateProfitImpactPaise(run("ADVANCE_GIVEN", 70_000_00, "BANK", "ADV"), N)).toBe(0);
    expect(estimateProfitImpactPaise(run("FARMER_ADVANCE", 70_000_00, "BANK", "ADV"), N)).toBe(0);
  });

  it("C customer payment", () => {
    const lines = run("CUSTOMER_PAYMENT", 5_000_00, "BANK", "AR");
    expect(profitLoss(lines, N).profitPaise).toBe(0);
  });

  it("D capital introduced", () => {
    expect(estimateProfitImpactPaise(run("CAPITAL_INTRODUCED", 50_000_00, "BANK", "CAP"), N)).toBe(0);
  });

  it("E expense payment affects P&L", () => {
    const lines = run("EXPENSE", 1_000_00, "BANK", "EXP");
    expect(purposeAffectsProfit("EXPENSE")).toBe(true);
    expect(estimateProfitImpactPaise(lines, N)).toBe(-1_000_00);
  });

  it("F salary", () => {
    expect(estimateProfitImpactPaise(run("SALARY", 2_000_00, "BANK", "SAL"), N)).toBe(-2_000_00);
  });

  it("G interest income", () => {
    expect(estimateProfitImpactPaise(run("INTEREST_INCOME", 500_00, "BANK", "INT_INC"), N)).toBe(500_00);
  });

  it("H purchase / vendor", () => {
    expect(estimateProfitImpactPaise(run("PURCHASE", 8_000_00, "BANK", "PUR"), N)).toBe(-8_000_00);
    expect(estimateProfitImpactPaise(run("VENDOR_PAYMENT", 8_000_00, "BANK", "AP"), N)).toBe(0);
  });

  it("I contra", () => {
    const lines = run("CONTRA", 10_000_00, "CASH", "BANK", { from: "CASH", to: "BANK" });
    expect(estimateProfitImpactPaise(lines, N)).toBe(0);
  });

  it("J permission deny simulation", () => {
    const viewer = ["view_dashboard", "view_party"] as const;
    const gate = checkInv10Permission([...viewer], "create_payment");
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.code).toBe("INV-10");
  });
});
