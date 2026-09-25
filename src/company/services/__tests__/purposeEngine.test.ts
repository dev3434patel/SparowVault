import { describe, it, expect } from "vitest";
import {
  mapPurposeToDraftLines,
  estimateProfitImpactPaise,
  purposeAffectsProfit,
} from "@/company/services/purposeEngine";
import { assertBalanced } from "@/company/services/voucherBalance";

const NATURES = {
  BANK: "ASSET" as const,
  LOAN_PAYABLE: "LIABILITY" as const,
  ADVANCE: "ASSET" as const,
  CASH: "ASSET" as const,
};

describe("purposeEngine scenarios A/B/I", () => {
  it("Scenario A: loan received — bank Dr, liability Cr, P&L unchanged", () => {
    const lines = mapPurposeToDraftLines({
      purpose: "LOAN_RECEIVED",
      amountPaise: 10_000_000,
      cashBankLedgerId: "BANK",
      partyRelationshipLedgerId: "LOAN_PAYABLE",
    });
    assertBalanced(lines);
    expect(lines.find((l) => l.ledgerId === "BANK")?.side).toBe("DEBIT");
    expect(lines.find((l) => l.ledgerId === "LOAN_PAYABLE")?.side).toBe("CREDIT");
    expect(purposeAffectsProfit("LOAN_RECEIVED")).toBe(false);
    expect(estimateProfitImpactPaise(lines, NATURES)).toBe(0);
  });

  it("Scenario B: advance given — advance Dr, bank Cr, not expense", () => {
    const lines = mapPurposeToDraftLines({
      purpose: "ADVANCE_GIVEN",
      amountPaise: 7_000_000,
      cashBankLedgerId: "BANK",
      partyRelationshipLedgerId: "ADVANCE",
    });
    assertBalanced(lines);
    expect(lines.find((l) => l.ledgerId === "ADVANCE")?.side).toBe("DEBIT");
    expect(lines.find((l) => l.ledgerId === "BANK")?.side).toBe("CREDIT");
    expect(purposeAffectsProfit("ADVANCE_GIVEN")).toBe(false);
    expect(estimateProfitImpactPaise(lines, NATURES)).toBe(0);
  });

  it("Scenario I: contra cash→bank — P&L 0, balanced", () => {
    const lines = mapPurposeToDraftLines({
      purpose: "CONTRA",
      amountPaise: 1_000_000,
      cashBankLedgerId: "CASH",
      partyRelationshipLedgerId: "BANK",
      fromLedgerId: "CASH",
      toLedgerId: "BANK",
    });
    assertBalanced(lines);
    expect(lines.find((l) => l.ledgerId === "BANK")?.side).toBe("DEBIT");
    expect(lines.find((l) => l.ledgerId === "CASH")?.side).toBe("CREDIT");
    expect(estimateProfitImpactPaise(lines, NATURES)).toBe(0);
  });
});
