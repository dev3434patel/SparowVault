import { describe, it, expect } from "vitest";
import { calculateSharedLimitAvailablePaise } from "@/services/cardEngine";

describe("sharedLimitMatrix", () => {
  it("primary + add-on share one ₹2,00,000 facility", () => {
    // Primary 80k + add-on 40k outstanding → available 80k (never 2,80,000)
    const available = calculateSharedLimitAvailablePaise({
      groupTotalLimitPaise: 2_00_000_00,
      memberOutstandingPaise: [80_000_00, 40_000_00],
    });
    expect(available).toBe(80_000_00);
  });

  it("never sums individual shared limits as separate facilities", () => {
    const wrongNaive = 2_00_000_00 + 2_00_000_00; // what a buggy UI might do
    const available = calculateSharedLimitAvailablePaise({
      groupTotalLimitPaise: 2_00_000_00,
      memberOutstandingPaise: [80_000_00, 40_000_00],
    });
    expect(available).not.toBe(wrongNaive - 1_20_000_00);
    expect(available).toBe(80_000_00);
    expect(available).toBeLessThan(2_00_000_00);
  });

  it("three cards sharing one limit group", () => {
    expect(
      calculateSharedLimitAvailablePaise({
        groupTotalLimitPaise: 3_00_000_00,
        memberOutstandingPaise: [50_000_00, 75_000_00, 25_000_00],
      }),
    ).toBe(1_50_000_00);
  });

  it("closed/historical card still counted when included in members", () => {
    expect(
      calculateSharedLimitAvailablePaise({
        groupTotalLimitPaise: 1_00_000_00,
        memberOutstandingPaise: [30_000_00, 0],
      }),
    ).toBe(70_000_00);
  });

  it("credit balances (negative outstanding) do not inflate used limit", () => {
    expect(
      calculateSharedLimitAvailablePaise({
        groupTotalLimitPaise: 1_00_000_00,
        memberOutstandingPaise: [40_000_00, -5_000_00],
      }),
    ).toBe(60_000_00);
  });
});
