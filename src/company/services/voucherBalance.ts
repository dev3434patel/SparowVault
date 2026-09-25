import type { DraftVoucherLine, LineSide, VoucherLine } from "@/company/types";

export type BalanceLine = Pick<VoucherLine, "side" | "amountPaise"> | DraftVoucherLine;

export function sumDebit(lines: BalanceLine[]): number {
  return lines
    .filter((l) => l.side === "DEBIT")
    .reduce((sum, l) => sum + (Number.isInteger(l.amountPaise) ? l.amountPaise : 0), 0);
}

export function sumCredit(lines: BalanceLine[]): number {
  return lines
    .filter((l) => l.side === "CREDIT")
    .reduce((sum, l) => sum + (Number.isInteger(l.amountPaise) ? l.amountPaise : 0), 0);
}

export function isBalanced(lines: BalanceLine[]): boolean {
  if (lines.length < 2) return false;
  return sumDebit(lines) === sumCredit(lines);
}

export function assertBalanced(lines: BalanceLine[]): void {
  for (const line of lines) {
    if (!Number.isInteger(line.amountPaise) || line.amountPaise <= 0) {
      throw new Error("Each line amountPaise must be a positive integer");
    }
    if (line.side !== "DEBIT" && line.side !== "CREDIT") {
      throw new Error(`Invalid line side: ${(line as { side: LineSide }).side}`);
    }
  }
  if (lines.length < 2) {
    throw new Error("Voucher requires at least two lines");
  }
  const dr = sumDebit(lines);
  const cr = sumCredit(lines);
  if (dr !== cr) {
    throw new Error(`Unbalanced voucher: debit ${dr} !== credit ${cr}`);
  }
}

export function imbalancePaise(lines: BalanceLine[]): number {
  return sumDebit(lines) - sumCredit(lines);
}
