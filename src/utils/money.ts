/**
 * Phase 3 — money in integer paise internally; rupees only at UI/export edges.
 */

import type {
  Account,
  Budget,
  Card,
  EMIPayment,
  Goal,
  Investment,
  Loan,
  Transaction,
  UdhariRecord,
} from "@/types";

/** Reject absurd payloads (≈ > ₹1e12) */
export const MAX_ABS_PAISE = 1_000_000_000_000_000; // 1e15 integer

export function assertValidPaise(value: unknown, field = "amountPaise"): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${field} must be a finite number`);
  }
  if (!Number.isInteger(value)) {
    throw new TypeError(`${field} must be an integer (paise)`);
  }
  if (value < 0) {
    throw new RangeError(`${field} must be non-negative`);
  }
  const abs = Math.abs(Math.trunc(value));
  if (abs > MAX_ABS_PAISE) {
    throw new RangeError(`${field} exceeds maximum allowed magnitude`);
  }
}

export type MoneyInputOptions = {
  allowZero?: boolean;
  allowNegative?: boolean;
  allowRounding?: boolean;
  fallbackPaise?: number;
  field?: string;
  maxPaise?: number;
  throwOnInvalid?: boolean;
};

function normalizeMoneyInputText(input: string | number | null | undefined): string {
  if (input === null || input === undefined) return "";
  return String(input)
    .trim()
    .replace(/\u20b9|Rs\.?|INR/gi, "")
    .replace(/,/g, "")
    .replace(/\s+/g, "");
}

export function parseMoneyInputToPaise(
  input: string | number | null | undefined,
  options: MoneyInputOptions = {},
): number {
  const field = options.field ?? "amount";
  const allowZero = options.allowZero ?? true;
  const allowNegative = options.allowNegative ?? false;
  const allowRounding = options.allowRounding ?? true;
  const maxPaise = options.maxPaise ?? MAX_ABS_PAISE;

  if (typeof input === "number" && !Number.isFinite(input)) {
    throw new TypeError(`${field} must be finite`);
  }

  let raw = normalizeMoneyInputText(input);
  if (raw === "" || raw === "." || raw === "-" || raw === "+") {
    if (allowZero) return 0;
    throw new TypeError(`${field} is required`);
  }

  let negative = false;
  if (raw.startsWith("-") || raw.startsWith("+")) {
    negative = raw.startsWith("-");
    raw = raw.slice(1);
  }
  if (negative && !allowNegative) {
    throw new TypeError(`${field} must be non-negative`);
  }

  const match = /^(\d+)(?:\.(\d+))?$/.exec(raw);
  if (!match) {
    throw new TypeError(`${field} must be a valid rupee amount`);
  }

  const integerPart = match[1].replace(/^0+(?=\d)/, "");
  const fractionalPart = match[2] ?? "";
  if (fractionalPart.length > 2 && !allowRounding) {
    throw new TypeError(`${field} cannot have more than 2 decimal places`);
  }

  const rupees = Number(integerPart);
  if (!Number.isSafeInteger(rupees)) {
    throw new TypeError(`${field} exceeds safe integer range`);
  }

  let paise = rupees * 100;
  paise += Number((fractionalPart + "00").slice(0, 2));
  if (allowRounding && fractionalPart.length > 2 && Number(fractionalPart[2]) >= 5) {
    paise += 1;
  }
  if (negative) paise *= -1;

  if (!Number.isSafeInteger(paise)) {
    throw new TypeError(`${field} exceeds safe integer range`);
  }
  if (paise === 0 && !allowZero) {
    throw new TypeError(`${field} must be greater than 0`);
  }
  if (!allowNegative && paise < 0) {
    throw new TypeError(`${field} must be non-negative`);
  }
  if (Math.abs(paise) > maxPaise) {
    throw new TypeError(`${field} exceeds maximum allowed magnitude`);
  }
  return paise;
}

export function safeParseMoneyInput(
  input: string | number | null | undefined,
  options: MoneyInputOptions = {},
): number {
  try {
    return parseMoneyInputToPaise(input, options);
  } catch (error) {
    if (options.throwOnInvalid) throw error;
    return options.fallbackPaise ?? 0;
  }
}

export function rupeesToPaise(value: unknown): number {
  return safeParseMoneyInput(value as string | number | null | undefined, {
    allowZero: true,
    allowRounding: true,
    fallbackPaise: 0,
  });
}

/** Exact rupees from paise for numeric use (prefer formatMoney for display). */
export function paiseToRupees(paise: number): number {
  if (!Number.isFinite(paise)) return 0;
  return Math.round(paise) / 100;
}

const INR_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney(paise: number, currency: "INR" = "INR"): string {
  if (currency !== "INR") {
    return `${(Math.round(paise) / 100).toFixed(2)} ${currency}`;
  }
  return INR_FORMATTER.format(Math.round(paise) / 100);
}

export function addMoney(...parts: number[]): number {
  let sum = 0;
  for (const p of parts) {
    if (!Number.isFinite(p) || !Number.isInteger(p)) continue;
    sum += p;
  }
  return sum;
}

export function subtractMoney(a: number, b: number): number {
  return addMoney(a, -b);
}

// ---------------------------------------------------------------------------
// EMI formula — principal in paise, returns EMI in paise (rounded)
// ---------------------------------------------------------------------------

export function calculateEMI(
  principalPaise: number,
  annualRate: number,
  tenureMonths: number,
): number {
  if (!principalPaise || !tenureMonths) return 0;
  const principal = Math.round(principalPaise) / 100;
  const monthlyRate = annualRate / 12 / 100;
  if (monthlyRate === 0) return Math.round((principal / tenureMonths) * 100);
  const numerator = principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths);
  const denominator = Math.pow(1 + monthlyRate, tenureMonths) - 1;
  const emiRupees = numerator / denominator;
  return Math.round(emiRupees * 100);
}

// ---------------------------------------------------------------------------
// Entity accessors — amountPaise wins when present & integer
// ---------------------------------------------------------------------------

function paiseOrFromRupee(paiseField: unknown, rupeeField: unknown): number {
  if (typeof paiseField === "number" && Number.isInteger(paiseField) && paiseField >= 0) {
    return paiseField;
  }
  return rupeesToPaise(rupeeField);
}

export function transactionAmountPaise(t: Pick<Transaction, "amount" | "amountPaise">): number {
  return paiseOrFromRupee(t.amountPaise, t.amount);
}

export function accountOpeningBalancePaise(a: Pick<Account, "openingBalance" | "openingBalancePaise">): number {
  return paiseOrFromRupee(a.openingBalancePaise, a.openingBalance);
}

export function cardCreditLimitPaise(c: Pick<Card, "creditLimit" | "creditLimitPaise">): number {
  return paiseOrFromRupee(c.creditLimitPaise, c.creditLimit ?? 0);
}

export function budgetLimitPaise(b: Pick<Budget, "amount" | "limitPaise">): number {
  return paiseOrFromRupee(b.limitPaise, b.amount);
}

export function loanPrincipalPaise(l: Pick<Loan, "principal" | "principalPaise">): number {
  return paiseOrFromRupee(l.principalPaise, l.principal);
}

export function loanOutstandingPrincipalPaise(
  l: Pick<Loan, "outstandingPrincipal" | "outstandingPrincipalPaise" | "principal" | "principalPaise">,
): number {
  if (typeof l.outstandingPrincipalPaise === "number" && Number.isInteger(l.outstandingPrincipalPaise)) {
    return l.outstandingPrincipalPaise;
  }
  const op = l.outstandingPrincipal;
  if (op !== undefined && op !== null) {
    return paiseOrFromRupee(undefined, op);
  }
  return loanPrincipalPaise(l);
}

export function loanEmiPaise(
  l: Pick<
    Loan,
    | "emiAmountOverride"
    | "emiPaise"
    | "principal"
    | "principalPaise"
    | "annualInterestRate"
    | "tenureMonths"
    | "lifecycleMode"
    | "remainingEmis"
    | "completedEmis"
  >,
): number {
  if (typeof l.emiPaise === "number" && Number.isInteger(l.emiPaise) && l.emiPaise > 0) {
    return l.emiPaise;
  }
  if (l.emiAmountOverride !== undefined && l.emiAmountOverride !== null) {
    return rupeesToPaise(l.emiAmountOverride);
  }
  const principalP = loanOutstandingPrincipalPaise(l);
  const lifecycleMode = l.lifecycleMode ?? "fresh";
  const isImportedLifecycle =
    lifecycleMode === "existing" || lifecycleMode === "ongoing_imported";
  const remainingTenure = isImportedLifecycle
    ? Math.max(
        1,
        l.remainingEmis ??
          (l.completedEmis !== undefined
            ? Math.max(1, l.tenureMonths - l.completedEmis)
            : l.tenureMonths),
      )
    : l.tenureMonths;
  return calculateEMI(principalP, l.annualInterestRate, remainingTenure);
}

export function emiPaymentAmountPaise(p: Pick<EMIPayment, "amountDue" | "amountPaise">): number {
  return paiseOrFromRupee(p.amountPaise, p.amountDue);
}

export function emiPaymentPaidPaise(p: Pick<EMIPayment, "amountPaid" | "amountPaidPaise">): number {
  return paiseOrFromRupee(p.amountPaidPaise, p.amountPaid);
}

export function emiPaymentOutstandingPaise(
  p: Pick<EMIPayment, "amountDue" | "amountPaise" | "amountPaid" | "amountPaidPaise">,
): number {
  return Math.max(0, emiPaymentAmountPaise(p) - emiPaymentPaidPaise(p));
}

export function emiPaymentPrincipalPaidPaise(
  p: Pick<EMIPayment, "principalComponent" | "principalComponentPaise">,
): number {
  return paiseOrFromRupee(p.principalComponentPaise, p.principalComponent);
}

export function emiPaymentInterestPaise(
  p: Pick<EMIPayment, "interestComponent" | "interestComponentPaise">,
): number {
  return paiseOrFromRupee(p.interestComponentPaise, p.interestComponent);
}

export function goalTargetPaise(g: Pick<Goal, "targetAmount" | "targetAmountPaise">): number {
  return paiseOrFromRupee(g.targetAmountPaise, g.targetAmount);
}

export function goalSavedPaise(g: Pick<Goal, "currentSaved" | "savedAmountPaise">): number {
  return paiseOrFromRupee(g.savedAmountPaise, g.currentSaved);
}

export function udhariAmountPaise(u: Pick<UdhariRecord, "amount" | "amountPaise">): number {
  return paiseOrFromRupee(u.amountPaise, u.amount);
}

export function udhariSettledPaise(u: Pick<UdhariRecord, "amountSettled" | "amountSettledPaise">): number {
  return paiseOrFromRupee(u.amountSettledPaise, u.amountSettled);
}

export function investmentMonthlyPaise(i: Pick<Investment, "monthlyTarget" | "amountPaise">): number {
  return paiseOrFromRupee(i.amountPaise, i.monthlyTarget);
}

export function investmentTotalContributedPaise(
  i: Pick<Investment, "totalContributed" | "totalContributedPaise">,
): number {
  return paiseOrFromRupee(i.totalContributedPaise, i.totalContributed);
}
