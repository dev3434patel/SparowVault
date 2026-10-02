// Indian-aware formatting utilities
import { format, parseISO } from "date-fns";
import { readStoredLocale } from "@/company/i18n/index";
import companyEn from "@/company/i18n/locales/en.json";
import companyGu from "@/company/i18n/locales/gu.json";
import { personalCatalog } from "@/i18n/useMessages";

const companyDictionaries = { en: companyEn, gu: companyGu } as Record<"en" | "gu", Record<string, string>>;

/** Personal routes use the personal catalog. Company routes use the company catalog. */
export function messageShell(): "personal" | "company" {
  if (typeof window === "undefined") return "personal";
  return window.location.pathname.startsWith("/company") ? "company" : "personal";
}

function readPersonalLocale(): "en" | "gu" {
  try {
    return localStorage.getItem("sv:personalLocale") === "gu" ? "gu" : "en";
  } catch {
    return "en";
  }
}

function companyLabel(key: string): string | undefined {
  const locale = typeof localStorage === "undefined" ? "en" : readStoredLocale();
  return companyDictionaries[locale][key] ?? companyDictionaries.en[key];
}

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
  if (messageShell() === "company") return companyLabel(`format.pay.${mode}`) ?? mode;
  const payments = personalCatalog(readPersonalLocale()).copy.transactions.payments;
  return mode in payments ? payments[mode as keyof typeof payments] : mode;
}

export function formatTxType(type: string): string {
  if (messageShell() === "company") return companyLabel(`format.tx.${type}`) ?? type;
  const types = personalCatalog(readPersonalLocale()).copy.transactions.types;
  return type in types ? types[type as keyof typeof types] : type;
}

/** Quick-add intent names. Personal shell reads personal messages; company shell reads company messages. */
export function formatIntentLabel(intent: string): string {
  if (messageShell() === "company") return companyLabel(`intent.${intent}`) ?? intent;
  const intents = personalCatalog(readPersonalLocale()).ui.quickAdd.intents;
  return intent in intents ? intents[intent as keyof typeof intents] : intent;
}
