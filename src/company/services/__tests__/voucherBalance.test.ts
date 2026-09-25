import { describe, it, expect } from "vitest";
import {
  assertBalanced,
  imbalancePaise,
  isBalanced,
  sumCredit,
  sumDebit,
} from "@/company/services/voucherBalance";

describe("voucherBalance", () => {
  it("sums debit and credit", () => {
    const lines = [
      { side: "DEBIT" as const, amountPaise: 100 },
      { side: "CREDIT" as const, amountPaise: 60 },
      { side: "CREDIT" as const, amountPaise: 40 },
    ];
    expect(sumDebit(lines)).toBe(100);
    expect(sumCredit(lines)).toBe(100);
    expect(isBalanced(lines)).toBe(true);
    expect(imbalancePaise(lines)).toBe(0);
  });

  it("assertBalanced rejects imbalance", () => {
    expect(() =>
      assertBalanced([
        { side: "DEBIT", amountPaise: 100 },
        { side: "CREDIT", amountPaise: 99 },
      ]),
    ).toThrow(/Unbalanced/);
  });

  it("assertBalanced rejects single line and non-positive", () => {
    expect(() => assertBalanced([{ side: "DEBIT", amountPaise: 100 }])).toThrow(/two lines/);
    expect(() =>
      assertBalanced([
        { side: "DEBIT", amountPaise: 0 },
        { side: "CREDIT", amountPaise: 0 },
      ]),
    ).toThrow(/positive/);
  });
});
