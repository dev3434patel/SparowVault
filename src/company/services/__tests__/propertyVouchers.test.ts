import { describe, it, expect } from "vitest";
import { assertBalanced, sumCredit, sumDebit } from "@/company/services/voucherBalance";
import { checkInv09BillAllocation } from "@/company/services/__tests__/helpers/invariants";
import type { DraftVoucherLine, LineSide } from "@/company/types";

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomBalancedVoucher(seedLines = 2): DraftVoucherLine[] {
  const n = Math.max(2, seedLines);
  const half = Math.floor(n / 2);
  const amounts: number[] = [];
  let total = 0;
  for (let i = 0; i < half; i++) {
    const a = randInt(1, 100_000);
    amounts.push(a);
    total += a;
  }
  const lines: DraftVoucherLine[] = amounts.map((amountPaise, i) => ({
    ledgerId: `L${i}`,
    side: "DEBIT" as LineSide,
    amountPaise,
  }));
  // Split credit side to match total
  let remaining = total;
  const creditCount = n - half;
  for (let i = 0; i < creditCount; i++) {
    const isLast = i === creditCount - 1;
    const amountPaise = isLast ? remaining : randInt(1, Math.max(1, remaining - (creditCount - i - 1)));
    remaining -= amountPaise;
    lines.push({
      ledgerId: `C${i}`,
      side: "CREDIT",
      amountPaise,
    });
  }
  return lines;
}

describe("property: vouchers & settlements", () => {
  it("random balanced vouchers always debit == credit", () => {
    for (let i = 0; i < 200; i++) {
      const lines = randomBalancedVoucher(randInt(2, 6));
      expect(sumDebit(lines)).toBe(sumCredit(lines));
      expect(() => assertBalanced(lines)).not.toThrow();
    }
  });

  it("random settlements never over-allocate", () => {
    for (let i = 0; i < 200; i++) {
      const original = randInt(100, 1_000_000);
      const outstanding = randInt(1, original);
      const alloc = randInt(1, outstanding);
      const ok = checkInv09BillAllocation(
        { outstandingPaise: outstanding, originalAmountPaise: original },
        [{ amountPaise: alloc, allocationType: "AGAINST_REFERENCE" }],
      );
      expect(ok.ok).toBe(true);

      const over = checkInv09BillAllocation(
        { outstandingPaise: outstanding, originalAmountPaise: original },
        [{ amountPaise: outstanding + 1, allocationType: "AGAINST_REFERENCE" }],
      );
      expect(over.ok).toBe(false);
    }
  });
});
