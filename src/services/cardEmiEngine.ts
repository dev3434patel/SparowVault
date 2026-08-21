/**
 * vNext Phase E — Card EMI schedule engine (reducing balance, zero-rate, first-period).
 */

import { addMonths, parseISO, format } from "date-fns";
import type { CardEmiInstallment, CardEmiPlan } from "@/types";
import { calculateEMI } from "@/utils/money";

export const CARD_EMI_CALCULATION_VERSION = "vnext-emi-1.0";

function localDateKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export interface EmiScheduleRow {
  installmentNo: number;
  dueDate: string;
  emiPaise: number;
  principalPaise: number;
  interestPaise: number;
  feePaise: number;
  taxPaise: number;
  closingPrincipalPaise: number;
}

export interface BuildEmiScheduleInput {
  planId: string;
  userId: string;
  principalPaise: number;
  annualRateBps: number;
  tenureMonths: number;
  startDate: string;
  strategy?: CardEmiPlan["scheduleStrategy"];
  noCostEmi?: boolean;
  merchantSubsidyPaise?: number;
}

/** Build projected installment schedule; sum(principal) equals input principal (±1 paise on last row). */
export function buildCardEmiSchedule(input: BuildEmiScheduleInput): EmiScheduleRow[] {
  const {
    planId,
    principalPaise,
    annualRateBps,
    tenureMonths,
    startDate,
    strategy = "reducing_balance",
    noCostEmi = false,
  } = input;
  void planId;
  if (principalPaise <= 0 || tenureMonths <= 0) return [];

  const annualRate = annualRateBps / 100;
  const monthlyRate = annualRate / 12 / 100;
  const emiPaise =
    strategy === "zero_rate" || noCostEmi
      ? Math.round(principalPaise / tenureMonths)
      : calculateEMI(principalPaise, annualRate, tenureMonths);

  let balance = principalPaise;
  const rows: EmiScheduleRow[] = [];
  const start = parseISO(startDate);

  for (let n = 1; n <= tenureMonths; n += 1) {
    const dueDate = localDateKey(addMonths(start, n - 1));
    let interestPaise = 0;
    if (monthlyRate > 0 && !noCostEmi && strategy !== "zero_rate") {
      interestPaise = Math.round(balance * monthlyRate);
    }
    let principalPaiseRow = emiPaise - interestPaise;
    if (n === tenureMonths) {
      principalPaiseRow = balance;
    }
    principalPaiseRow = Math.min(principalPaiseRow, balance);
    const emiRow = principalPaiseRow + interestPaise;
    balance -= principalPaiseRow;
    rows.push({
      installmentNo: n,
      dueDate,
      emiPaise: emiRow,
      principalPaise: principalPaiseRow,
      interestPaise,
      feePaise: 0,
      taxPaise: 0,
      closingPrincipalPaise: Math.max(0, balance),
    });
  }
  return rows;
}

export function scheduleToInstallmentEntities(
  plan: CardEmiPlan,
  rows: EmiScheduleRow[],
): CardEmiInstallment[] {
  const now = new Date().toISOString();
  return rows.map((r) => ({
    id: `${plan.id}_inst_${r.installmentNo}`,
    userId: plan.userId,
    planId: plan.id,
    installmentNo: r.installmentNo,
    dueDate: r.dueDate,
    emiPaise: r.emiPaise,
    principalPaise: r.principalPaise,
    interestPaise: r.interestPaise,
    feePaise: r.feePaise,
    taxPaise: r.taxPaise,
    status: "projected" as const,
    source: "estimated" as const,
    createdAt: now,
    updatedAt: now,
    isDeleted: 0,
    version: 1,
    tags: [],
    notes: "",
  }));
}

export function totalPrincipalInSchedule(rows: EmiScheduleRow[]): number {
  return rows.reduce((s, r) => s + r.principalPaise, 0);
}

export function createCardEmiPlanFromPurchase(input: {
  id: string;
  userId: string;
  cardId: string;
  purchaseTransactionIds: string[];
  principalPaise: number;
  annualRateBps: number;
  tenureMonths: number;
  startDate: string;
  noCostEmi?: boolean;
}): { plan: CardEmiPlan; installments: CardEmiInstallment[] } {
  const rows = buildCardEmiSchedule({
    planId: input.id,
    userId: input.userId,
    principalPaise: input.principalPaise,
    annualRateBps: input.annualRateBps,
    tenureMonths: input.tenureMonths,
    startDate: input.startDate,
    noCostEmi: input.noCostEmi,
  });
  const emiPaise = rows[0]?.emiPaise ?? 0;
  const now = new Date().toISOString();
  const plan: CardEmiPlan = {
    id: input.id,
    userId: input.userId,
    cardId: input.cardId,
    purchaseTransactionIds: input.purchaseTransactionIds,
    principalPaise: input.principalPaise,
    annualRateBps: input.annualRateBps,
    tenureMonths: input.tenureMonths,
    emiPaise,
    startDate: input.startDate,
    status: "active",
    scheduleStrategy: input.noCostEmi ? "zero_rate" : "reducing_balance",
    calculationVersion: CARD_EMI_CALCULATION_VERSION,
    noCostEmi: input.noCostEmi ? 1 : 0,
    createdAt: now,
    updatedAt: now,
    isDeleted: 0,
    version: 1,
    tags: [],
    notes: "",
  };
  return { plan, installments: scheduleToInstallmentEntities(plan, rows) };
}

/** Net financing cost = interest+fees+taxes − offsets (merchant/issuer discounts). */
export function calculateNetFinancingCostPaise(input: {
  totalInterestPaise: number;
  totalFeePaise: number;
  totalTaxPaise: number;
  merchantSubsidyPaise?: number;
  issuerDiscountPaise?: number;
  cashbackPaise?: number;
}): {
  grossFinancingCostPaise: number;
  offsetsPaise: number;
  netFinancingCostPaise: number;
} {
  const gross =
    Math.max(0, input.totalInterestPaise) +
    Math.max(0, input.totalFeePaise) +
    Math.max(0, input.totalTaxPaise);
  const offsets =
    Math.max(0, input.merchantSubsidyPaise ?? 0) +
    Math.max(0, input.issuerDiscountPaise ?? 0) +
    Math.max(0, input.cashbackPaise ?? 0);
  return {
    grossFinancingCostPaise: gross,
    offsetsPaise: offsets,
    netFinancingCostPaise: Math.max(0, gross - offsets),
  };
}

/** Foreclosure estimate — remaining principal + optional fee/tax (issuer actual wins later). */
export function estimateCardEmiForeclosurePaise(input: {
  remainingPrincipalPaise: number;
  preclosureFeePaise?: number;
  preclosureTaxPaise?: number;
}): {
  remainingPrincipalPaise: number;
  feePaise: number;
  taxPaise: number;
  estimatedTotalPaise: number;
  source: "estimated";
} {
  const fee = Math.max(0, input.preclosureFeePaise ?? 0);
  const tax = Math.max(0, input.preclosureTaxPaise ?? 0);
  const principal = Math.max(0, input.remainingPrincipalPaise);
  return {
    remainingPrincipalPaise: principal,
    feePaise: fee,
    taxPaise: tax,
    estimatedTotalPaise: principal + fee + tax,
    source: "estimated",
  };
}

/** Compare tenures for educational "Can I afford this?" / tenure comparison UI. */
export function compareCardEmiTenures(input: {
  principalPaise: number;
  annualRateBps: number;
  tenures: number[];
  startDate: string;
}): Array<{
  tenureMonths: number;
  emiPaise: number;
  totalInterestPaise: number;
  totalPaidPaise: number;
}> {
  return input.tenures.map((tenureMonths) => {
    const rows = buildCardEmiSchedule({
      planId: "cmp",
      userId: "u",
      principalPaise: input.principalPaise,
      annualRateBps: input.annualRateBps,
      tenureMonths,
      startDate: input.startDate,
    });
    const totalInterestPaise = rows.reduce((s, r) => s + r.interestPaise, 0);
    const totalPaidPaise = rows.reduce((s, r) => s + r.emiPaise, 0);
    return {
      tenureMonths,
      emiPaise: rows[0]?.emiPaise ?? 0,
      totalInterestPaise,
      totalPaidPaise,
    };
  });
}
