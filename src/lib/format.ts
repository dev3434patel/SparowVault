// Indian-aware formatting utilities
import { format, parseISO } from "date-fns";

const INR_LOCALE = "en-IN";

export function formatINR(
  amount: number,
  options?: { showSymbol?: boolean; decimals?: number; compact?: boolean },
): string {
  const { showSymbol = true, decimals = 2, compact = false } = options ?? {};
  if (!Number.isFinite(amount)) amount = 0;

  if (compact && Math.abs(amount) >= 1000) {
    return formatINRCompact(amount, showSymbol);
  }

  const formatted = new Intl.NumberFormat(INR_LOCALE, {
    style: showSymbol ? "currency" : "decimal",
    currency: "INR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
  return formatted;
}

export function formatINRCompact(amount: number, showSymbol = true): string {
  const sym = showSymbol ? "₹" : "";
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  if (abs >= 10000000) return `${sign}${sym}${(abs / 10000000).toFixed(2)} Cr`;
  if (abs >= 100000) return `${sign}${sym}${(abs / 100000).toFixed(2)} L`;
  if (abs >= 1000) return `${sign}${sym}${(abs / 1000).toFixed(2)} K`;
  return `${sign}${sym}${abs.toFixed(2)}`;
}

export function formatNumberIN(n: number, decimals = 0): string {
  if (!Number.isFinite(n)) n = 0;
  return new Intl.NumberFormat(INR_LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export function formatPercent(n: number, decimals = 1): string {
  if (!Number.isFinite(n)) n = 0;
  return `${n.toFixed(decimals)}%`;
}

export function formatDate(
  iso: string | Date | undefined | null,
  pattern = "dd MMM yyyy",
): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? parseISO(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, pattern);
}

export function formatDateShort(iso: string | Date | undefined | null) {
  return formatDate(iso, "dd MMM");
}

export function formatDateLong(iso: string | Date | undefined | null) {
  return formatDate(iso, "EEE, dd MMM yyyy");
}

export function formatMonthYear(iso: string | Date | undefined | null) {
  return formatDate(iso, "MMMM yyyy");
}

export function formatRelativeDue(iso?: string | null): string {
  if (!iso) return "—";
  const due = typeof iso === "string" ? parseISO(iso) : iso;
  if (Number.isNaN(due.getTime())) return "—";
  const ms = due.getTime() - Date.now();
  const days = Math.round(ms / (1000 * 60 * 60 * 24));
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days > 1 && days <= 30) return `Due in ${days} days`;
  if (days > 30) return `Due in ${Math.round(days / 30)} mo`;
  if (days === -1) return "1 day overdue";
  if (days < -1 && days >= -30) return `${-days} days overdue`;
  if (days < -30) return `${Math.round(-days / 30)} mo overdue`;
  return "—";
}

// Convert "yyyy-MM-dd" (from <input type="date">) to a stable ISO that
// represents local midnight, NOT UTC midnight. `new Date("yyyy-MM-dd")`
// parses as UTC, then `toISOString()` shifts the day for non-UTC users.
export function localDateToIso(localDate: string): string {
  if (!localDate) return new Date().toISOString();
  if (localDate.includes("T")) return localDate;
  return new Date(`${localDate}T00:00:00`).toISOString();
}

// Inverse: ISO timestamp -> "yyyy-MM-dd" in the user's local timezone,
// suitable for <input type="date" value=...>.
export function isoToLocalDate(iso: string | Date | undefined | null): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? parseISO(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "yyyy-MM-dd");
}

export function formatPaymentMode(mode: string): string {
  const map: Record<string, string> = {
    cash: "Cash",
    upi: "UPI",
    bank_transfer: "Bank Transfer",
    cheque: "Cheque",
    debit_card: "Debit Card",
    credit_card: "Credit Card",
    wallet: "Wallet",
    auto_debit: "Auto Debit",
    other: "Other",
  };
  return map[mode] ?? mode;
}

export function formatTxType(t: string): string {
  const map: Record<string, string> = {
    income: "Income",
    expense: "Expense",
    transfer: "Transfer",
    loan_disbursement: "Loan Disbursement",
    emi_payment: "EMI Payment",
    cc_payment: "Card Payment",
    udhari_given: "Udhari Given",
    udhari_received: "Udhari Received",
    udhari_collect: "Udhari Collected",
    udhari_repay: "Udhari Repaid",
    udhari_write_off: "Udhari Write-off",
    savings_contribution: "Savings",
    investment_contribution: "Investment",
    refund: "Refund",
    adjustment: "Adjustment",
  };
  return map[t] ?? t;
}
