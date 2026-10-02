import { describe, expect, it } from "vitest";
import {
  chequeMatch,
  dimensionSplit,
  invoiceThenReceipt,
  movingAverageSale,
  payrollAccrual,
} from "@/company/finance/playbookGoldens";

describe("company playbook goldens", () => {
  it("receipt does not change revenue", () => {
    const row = invoiceThenReceipt({ taxablePaise: 1_000_000, taxPaise: 180_000, receiptPaise: 500_000 });
    expect(row.receivablePaise).toBe(1_180_000);
    expect(row.openReceivablePaise).toBe(680_000);
    expect(row.revenuePaise).toBe(1_000_000);
  });

  it("buy 10 at 100 and sell 4 at 150", () => {
    const row = movingAverageSale({ buyQty: 10, buyRatePaise: 10_000, sellQty: 4, sellRatePaise: 15_000 });
    expect(row.qtyLeft).toBe(6);
    expect(row.stockValuePaise).toBe(60_000);
    expect(row.cogsPaise).toBe(40_000);
  });

  it("synthetic payroll gross 30000", () => {
    const row = payrollAccrual({
      grossPaise: 3_000_000,
      employeePfPaise: 300_000,
      otherDeductionPaise: 100_000,
      employerPfPaise: 180_000,
    });
    expect(row.expensePaise).toBe(3_180_000);
    expect(row.netPayablePaise).toBe(2_600_000);
    expect(row.ratesVerified).toBe(false);
  });

  it("dimension parts sum once", () => {
    expect(dimensionSplit(1_000_000, [600_000, 400_000]).balanced).toBe(true);
  });

  it("cheque match leaves book cash unchanged", () => {
    const row = chequeMatch({ bookCashPaise: 500_000, chequePaise: 200_000, feePaise: 1_000 });
    expect(row.bookCashPaise).toBe(500_000);
    expect(row.feeStillNeedsVoucher).toBe(true);
  });
});
