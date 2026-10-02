import { describe, expect, it } from "vitest";
import { dimensionSplit } from "@/company/services/costSplit";

describe("dimensionSplit", () => {
  it("keeps a 10000 voucher at 10000 when the parts are 6000 and 4000", () => {
    const split = dimensionSplit(1_000_000, [
      { costCentreId: "a", amountPaise: 600_000 },
      { costCentreId: "b", amountPaise: 400_000 },
    ]);
    expect(split.error).toBeUndefined();
    expect(split.costAllocations?.reduce((sum, part) => sum + part.amountPaise, 0)).toBe(1_000_000);
  });

  it("rejects a split that would change the voucher total", () => {
    const split = dimensionSplit(1_000_000, [
      { costCentreId: "a", amountPaise: 600_000 },
      { costCentreId: "b", amountPaise: 300_000 },
    ]);
    expect(split.costAllocations).toBeUndefined();
    expect(split.error).toContain("equal");
  });
});
