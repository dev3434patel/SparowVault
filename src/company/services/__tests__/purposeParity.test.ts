/**
 * FE ↔ PHP purpose line-shape parity.
 * For every non-deprecated purpose (except CONTRA_EXPLICIT), draft lines must match
 * posting.php company_preview_purpose side slots given the same cash/counter IDs.
 */
import { describe, expect, it } from "vitest";
import purposeRules from "../../../../config/company-purpose-rules.json";
import { mapPurposeToDraftLines, type PurposeDraftArgs } from "@/company/services/purposeEngine";
import type { PurposeCode } from "@/company/types";

const CASH = "cash-bank-1";
const COUNTER = "counter-1";
const AMOUNT = 12_500;

describe("purpose FE/PHP line-shape parity", () => {
  const active = purposeRules.purposes.filter((p) => !p.deprecated);

  it("every active purpose is covered", () => {
    expect(active.length).toBeGreaterThan(10);
  });

  for (const row of active) {
    const strategy = row.counterStrategy;
    if (strategy === "CONTRA_EXPLICIT") {
      it(`${row.key}: CONTRA builds Dr to / Cr from (UI mirror)`, () => {
        const lines = mapPurposeToDraftLines({
          purpose: row.key as PurposeCode,
          amountPaise: AMOUNT,
          cashBankLedgerId: CASH,
          partyRelationshipLedgerId: COUNTER,
          fromLedgerId: CASH,
          toLedgerId: COUNTER,
        });
        expect(lines).toHaveLength(2);
        expect(lines[0]).toMatchObject({ ledgerId: COUNTER, side: "DEBIT", amountPaise: AMOUNT });
        expect(lines[1]).toMatchObject({ ledgerId: CASH, side: "CREDIT", amountPaise: AMOUNT });
      });
      continue;
    }

    it(`${row.key}: FE sides match PHP prepaid preview shape`, () => {
      const args: PurposeDraftArgs = {
        purpose: row.key as PurposeCode,
        amountPaise: AMOUNT,
        cashBankLedgerId: CASH,
        partyRelationshipLedgerId: COUNTER,
        counterLedgerId: COUNTER,
      };
      const lines = mapPurposeToDraftLines(args);
      expect(lines).toHaveLength(2);
      expect(lines[0].amountPaise).toBe(AMOUNT);
      expect(lines[1].amountPaise).toBe(AMOUNT);

      const direction = String(row.direction ?? "").toUpperCase();
      const vt = String(row.voucherType ?? "").toUpperCase();
      const isReceipt = direction === "RECEIVED" || vt === "RECEIPT" || vt === "SALE";

      if (isReceipt) {
        // PHP: Dr cash/bank, Cr counter
        expect(lines[0]).toMatchObject({ ledgerId: CASH, side: "DEBIT" });
        expect(lines[1]).toMatchObject({ ledgerId: COUNTER, side: "CREDIT" });
      } else {
        // PHP: Dr counter, Cr cash/bank
        expect(lines[0]).toMatchObject({ ledgerId: COUNTER, side: "DEBIT" });
        expect(lines[1]).toMatchObject({ ledgerId: CASH, side: "CREDIT" });
      }
    });
  }

  it("deprecated purposes throw with replacedBy hint", () => {
    const legacy = purposeRules.purposes.find((p) => p.deprecated && p.key === "OTHER");
    expect(legacy).toBeTruthy();
    expect(() =>
      mapPurposeToDraftLines({
        purpose: "OTHER",
        amountPaise: AMOUNT,
        cashBankLedgerId: CASH,
        partyRelationshipLedgerId: COUNTER,
      }),
    ).toThrow(/OTHER_PAYMENT/);
  });
});
