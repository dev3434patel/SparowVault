/**
 * vNext Phase F — Sinking fund monthly requirement.
 */

import { differenceInCalendarMonths, parseISO } from "date-fns";
import type { SinkingFund } from "@/types";

export function monthlyRequiredPaise(fund: SinkingFund, today = new Date()): number {
  const target = fund.targetPaise;
  if (fund.monthlyRequiredPaise != null && fund.monthlyRequiredPaise > 0) {
    return fund.monthlyRequiredPaise;
  }
  const months = Math.max(1, differenceInCalendarMonths(parseISO(fund.targetDate), today));
  return Math.ceil(target / months);
}

export function sinkingFundProgressPaise(savedPaise: number, targetPaise: number): number {
  if (targetPaise <= 0) return 0;
  return Math.min(100, Math.round((100 * savedPaise) / targetPaise));
}
