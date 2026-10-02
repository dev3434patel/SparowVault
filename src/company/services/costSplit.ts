export type CostPart = { costCentreId: string; amountPaise: number };

/** Parts must equal the line. Empty input means the voucher has no dimension split. */
export function dimensionSplit(
  linePaise: number,
  parts: CostPart[],
): { costAllocations?: CostPart[]; error?: string } {
  if (parts.length === 0) return {};
  const allocated = parts.reduce((sum, part) => sum + part.amountPaise, 0);
  if (allocated !== linePaise) {
    return { error: "The dimension split must equal the voucher amount." };
  }
  return { costAllocations: parts };
}
