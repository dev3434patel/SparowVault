/**
 * Phase 10 — Emergency fund vs essential monthly burn.
 */

import { subMonths } from "date-fns";
import type { Category, Goal, Investment, Transaction } from "@/types";
import { filterByMonth, sumByType } from "@/services/calculations";
import {
  goalSavedPaise,
  investmentTotalContributedPaise,
  transactionAmountPaise,
} from "@/utils/money";

/** Match user category names (case-insensitive) to essentials bucket. */
const ESSENTIAL_KEYWORDS = [
  "rent",
  "food",
  "grocer",
  "grocery",
  "emi",
  "school",
  "fee",
  "tuition",
  "medical",
  "health",
  "utility",
  "electric",
  "water",
  "gas",
  "internet",
  "mobile",
  "transport",
  "fuel",
  "commute",
  "bus",
  "train",
  "metro",
];

export function isEssentialCategoryName(name: string): boolean {
  const n = name.trim().toLowerCase();
  return ESSENTIAL_KEYWORDS.some((k) => n.includes(k));
}

function essentialCategoryIds(categories: Category[]): Set<string> {
  const ids = new Set<string>();
  for (const c of categories) {
    if (c.archived) continue;
    if (c.appliesTo === "income") continue;
    if (isEssentialCategoryName(c.name)) ids.add(c.id);
  }
  return ids;
}

/** Average essential category spend + EMI, last `months` complete months (including current partial). */
export function averageMonthlyEssentialPaise(
  transactions: Transaction[],
  categories: Category[],
  today = new Date(),
  months = 3,
): number {
  const essentialIds = essentialCategoryIds(categories);
  let sumEssential = 0;
  let sumEmi = 0;
  let count = 0;
  for (let i = 0; i < months; i++) {
    const d = subMonths(today, i);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const monthTx = filterByMonth(transactions, y, m);
    const essentialSpent = monthTx
      .filter((t) => t.type === "expense" && t.categoryId && essentialIds.has(t.categoryId))
      .reduce((a, t) => a + transactionAmountPaise(t), 0);
    const emi = sumByType(monthTx, ["emi_payment"]);
    sumEssential += essentialSpent;
    sumEmi += emi;
    count += 1;
  }
  if (!count) return 0;
  return Math.round((sumEssential + sumEmi) / count);
}

export interface EmergencyFundIntel {
  monthlyEssentialPaise: number;
  emergencyFundAvailablePaise: number;
  monthsCovered: number;
  shortfallVsTargetPaise: number;
  targetRecommendedPaise: number;
  targetMonths: number;
}

const DEFAULT_TARGET_MONTHS = 6;

export function buildEmergencyFundIntel(
  transactions: Transaction[],
  categories: Category[],
  investments: Investment[],
  goals: Goal[],
  today = new Date(),
  targetMonths: number = DEFAULT_TARGET_MONTHS,
): EmergencyFundIntel {
  const monthlyEssentialPaise = averageMonthlyEssentialPaise(transactions, categories, today, 3);

  const emergencyInv = investments.filter((i) => i.type === "emergency_fund" && i.status === "active");
  const fromInvestments = emergencyInv.reduce((a, i) => a + investmentTotalContributedPaise(i), 0);

  const emergencyGoals = goals.filter(
    (g) => g.status === "active" && (g.goalType === "emergency_fund" || g.title.toLowerCase().includes("emergency")),
  );
  const fromGoals = emergencyGoals.reduce((a, g) => a + goalSavedPaise(g), 0);

  const emergencyFundAvailablePaise = fromInvestments + fromGoals;

  const monthsCovered =
    monthlyEssentialPaise > 0 ? emergencyFundAvailablePaise / monthlyEssentialPaise : 0;

  const targetRecommendedPaise = Math.round(monthlyEssentialPaise * targetMonths);
  const shortfallVsTargetPaise = Math.max(0, targetRecommendedPaise - emergencyFundAvailablePaise);

  return {
    monthlyEssentialPaise,
    emergencyFundAvailablePaise,
    monthsCovered,
    shortfallVsTargetPaise,
    targetRecommendedPaise,
    targetMonths,
  };
}
