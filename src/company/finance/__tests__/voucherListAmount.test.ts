import { describe, expect, it } from "vitest";
import { statementRowAmountPaise, voucherListAmountPaise } from "@/company/finance/voucherListAmount";

describe("voucherListAmountPaise", () => {
  it("uses the debit total when the day book omits lines", () => {
    expect(voucherListAmountPaise({ lines: [], debitTotalPaise: 1_180_000 })).toBe(1_180_000);
  });

  it("sums debit lines when they are present", () => {
    expect(
      voucherListAmountPaise({
        lines: [
          { lineNo: 1, ledgerId: "ar", side: "DEBIT", amountPaise: 1_180_000 },
          { lineNo: 2, ledgerId: "sales", side: "CREDIT", amountPaise: 1_000_000 },
        ],
        debitTotalPaise: 0,
      }),
    ).toBe(1_180_000);
  });
});

describe("statementRowAmountPaise", () => {
  it("shows a posted party debit instead of zero when amountPaise is absent", () => {
    expect(statementRowAmountPaise({ debitPaise: 1_180_000, creditPaise: 0 })).toBe(1_180_000);
  });

  it("shows a credit line when the party side is a credit", () => {
    expect(statementRowAmountPaise({ debitPaise: 0, creditPaise: 500_000 })).toBe(500_000);
  });
});
