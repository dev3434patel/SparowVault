import type { CompanyVoucher } from "@/company/types";

/** Day-book rows often omit lines and send debitTotalPaise. A line total of zero must not hide that total. */
export function voucherListAmountPaise(voucher: Pick<CompanyVoucher, "lines" | "debitTotalPaise">): number {
  const fromLines = (voucher.lines ?? []).reduce(
    (sum, line) => (line.side === "DEBIT" ? sum + line.amountPaise : sum),
    0,
  );
  if (fromLines > 0) return fromLines;
  return voucher.debitTotalPaise ?? 0;
}

/** Party statement rows carry debitPaise and creditPaise, not a voucher total. */
export function statementRowAmountPaise(row: {
  debitPaise?: number;
  creditPaise?: number;
  amountPaise?: number;
  amount_paise?: number;
}): number {
  const debit = Number(row.debitPaise ?? 0);
  if (debit > 0) return debit;
  const credit = Number(row.creditPaise ?? 0);
  if (credit > 0) return credit;
  const named = Number(row.amount_paise ?? row.amountPaise ?? 0);
  return named > 0 ? named : 0;
}
