import { describe, expect, it } from "vitest";

/** Unique company total must never equal sum of overlapping category buckets. */
function uniqueCompanyTotal(tx: Array<{ partyId: string; amountPaise: number }>): number {
  return tx.reduce((s, t) => s + t.amountPaise, 0);
}

function categorySubtotal(
  tx: Array<{ partyId: string; amountPaise: number }>,
  membership: Record<string, string[]>,
  category: string,
): number {
  return tx
    .filter((t) => (membership[t.partyId] || []).includes(category))
    .reduce((s, t) => s + t.amountPaise, 0);
}

describe("category aggregation policy", () => {
  const membership = {
    ramesh: ["Farmers", "Lenders"],
    suresh: ["Farmers"],
  };
  const tx = [
    { partyId: "ramesh", amountPaise: 100_00_000 },
    { partyId: "suresh", amountPaise: 200_00_000 },
  ];

  it("category subtotals may overlap", () => {
    expect(categorySubtotal(tx, membership, "Farmers")).toBe(300_00_000);
    expect(categorySubtotal(tx, membership, "Lenders")).toBe(100_00_000);
  });

  it("unique company total is 3L not 4L", () => {
    const unique = uniqueCompanyTotal(tx);
    const naiveSum =
      categorySubtotal(tx, membership, "Farmers") + categorySubtotal(tx, membership, "Lenders");
    expect(unique).toBe(300_00_000);
    expect(naiveSum).toBe(400_00_000);
    expect(unique).not.toBe(naiveSum);
  });
});
