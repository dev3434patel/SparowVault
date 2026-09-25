import { describe, it, expect } from "vitest";
import {
  ageingBuckets,
  balanceSheet,
  partyRunningBalance,
  profitLoss,
  trialBalance,
} from "@/company/services/__tests__/helpers/reportEngine";
import type { AccountNature } from "@/company/types";

const natures: Record<string, AccountNature> = {
  BANK: "ASSET",
  LOAN: "LIABILITY",
  CAPITAL: "EQUITY",
  SALES: "INCOME",
  RENT: "EXPENSE",
};

describe("reportEngine", () => {
  it("TB balances for loan receipt", () => {
    const lines = [
      { ledgerId: "BANK", side: "DEBIT" as const, amountPaise: 100_00 },
      { ledgerId: "LOAN", side: "CREDIT" as const, amountPaise: 100_00 },
    ];
    const tb = trialBalance(lines, natures);
    expect(tb.balanced).toBe(true);
    expect(tb.totalDebitPaise).toBe(tb.totalCreditPaise);
  });

  it("BS equation holds with profit folded into equity", () => {
    const lines = [
      { ledgerId: "BANK", side: "DEBIT" as const, amountPaise: 150_00 },
      { ledgerId: "CAPITAL", side: "CREDIT" as const, amountPaise: 100_00 },
      { ledgerId: "SALES", side: "CREDIT" as const, amountPaise: 80_00 },
      { ledgerId: "RENT", side: "DEBIT" as const, amountPaise: 30_00 },
    ];
    // Need balanced voucher set — add balancing if needed:
    // Bank 150 Dr = Capital 100 Cr + Sales 80 Cr - wait that's 180 Cr and 150+30=180 Dr. Good.
    const tb = trialBalance(lines, natures);
    expect(tb.balanced).toBe(true);
    const bs = balanceSheet(lines, natures);
    expect(bs.balanced).toBe(true);
    expect(bs.assetsPaise).toBe(bs.liabilitiesPaise + bs.equityPaise);
    const pl = profitLoss(lines, natures);
    expect(pl.profitPaise).toBe(50_00);
  });

  it("loan receipt absent from P&L", () => {
    const lines = [
      { ledgerId: "BANK", side: "DEBIT" as const, amountPaise: 100_00 },
      { ledgerId: "LOAN", side: "CREDIT" as const, amountPaise: 100_00 },
    ];
    expect(profitLoss(lines, natures).profitPaise).toBe(0);
  });

  it("ageing buckets and party running balance", () => {
    const buckets = ageingBuckets(
      [
        {
          outstandingPaise: 1000,
          dueDate: "2026-09-01",
          status: "OPEN",
        },
      ],
      "2026-09-20",
    );
    expect(buckets.find((b) => b.key === "16_30")?.amountPaise).toBe(1000);

    const rows = partyRunningBalance(
      [
        { date: "2026-01-02", debitPaise: 500, creditPaise: 0 },
        { date: "2026-01-01", debitPaise: 0, creditPaise: 200 },
      ],
      0,
    );
    expect(rows[0].date).toBe("2026-01-01");
    expect(rows[1].runningBalancePaise).toBe(300);
  });
});
