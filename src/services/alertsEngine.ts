import { parseISO } from "date-fns";
import { alertRepo } from "@/repositories";
import {
  budgetStatuses,
  filterByMonth,
  summarizeLoan,
  totalUdhariPayable,
  totalUdhariReceivable,
} from "./calculations";
import { calculateFinanceMonthKpis } from "./financeKpiEngine";
import { buildCashflowSurvivalReport } from "./cashflowSurvivalEngine";
import { buildEmergencyFundIntel } from "./emergencyFundEngine";
import { buildGoalIntel } from "./goalEngine";
import { buildCreditCardIntel } from "./cardEngine";
import { readCardMoneyFact, type CardMoneyFact } from "@/services/statements/cardMoneyFact";
import { getDB } from "@/db/database";
import type { CardStatement } from "@/types";
import { smartBudgetStatuses } from "./smartBudgetEngine";
import { udhariPersonKey } from "./udhariEngine";
import type { RecurringRule, User } from "@/types";
import { useDataStore } from "@/store/dataStore";
import {
  budgetLimitPaise,
  formatMoney,
  rupeesToPaise,
  transactionAmountPaise,
  udhariAmountPaise,
  udhariSettledPaise,
} from "@/utils/money";
import { alertPreferenceEnabled } from "@/services/alertPreferences";

function recurringRuleAmountPaise(r: RecurringRule): number {
  if (r.amountPaise != null && Number.isFinite(r.amountPaise)) return Math.round(r.amountPaise);
  return rupeesToPaise(r.amount);
}

function minimumDueAlertMessage(fact: CardMoneyFact, fullDuePaise: number): string {
  const full = `Full due (PIF) about ${formatMoney(fullDuePaise)}.`;
  if (fact.evidence === "not_observed" || fact.valuePaise == null) {
    return `${full} Minimum due was not on the statement, so this is not a minimum-payment instruction.`;
  }
  if (fact.evidence === "source_observed" && fact.valuePaise === 0) {
    return `${full} Printed minimum due is ${formatMoney(0)}.`;
  }
  if (fact.evidence === "estimated") {
    return `${full} Estimated minimum about ${formatMoney(fact.valuePaise)} (not an issuer figure).`;
  }
  if (fact.evidence === "user_confirmed") {
    return `${full} Minimum due ${formatMoney(fact.valuePaise)} was confirmed by you, not printed by the issuer.`;
  }
  return `${full} Minimum due ${formatMoney(fact.valuePaise)}.`;
}

// Given current dataStore state, regenerate alerts (idempotent: dismissed alerts stay dismissed).
export async function runAlertEngine(user: User) {
  const state = useDataStore.getState();
  const existing = state.alerts;
  const today = new Date();
  const nowMs = today.getTime();

  const generated: Array<{
    kind: string;
    severity: "info" | "warning" | "danger" | "success";
    title: string;
    message: string;
    linkHref?: string;
  }> = [];

  // Budget alerts
  const activeBudgets = state.budgets.filter((b) =>
    b.period === "monthly"
      ? b.year === today.getFullYear() && b.month === today.getMonth() + 1
      : b.year === today.getFullYear(),
  );
  const bgts = budgetStatuses(activeBudgets, state.transactions, today);
  for (const b of bgts) {
    const cat = state.categories.find((c) => c.id === b.budget.categoryId);
    const name = cat?.name ?? "Category";
    if (b.level === "over") {
      generated.push({
        kind: "budget_over",
        severity: "danger",
        title: `Over budget: ${name}`,
        message: `You've spent ${b.percentUsed.toFixed(0)}% of the ${name} budget.`,
      });
    } else if (b.level === "warning") {
      generated.push({
        kind: "budget_warn",
        severity: "warning",
        title: `${name} budget at ${b.percentUsed.toFixed(0)}%`,
        message: `Close to the monthly limit. Consider slowing down.`,
      });
    } else if (b.projectedOverrun) {
      generated.push({
        kind: "budget_projected_overrun",
        severity: "warning",
        title: `${name} likely to overshoot`,
        message: `At current pace you may exceed this month's budget.`,
      });
    }
  }

  // Phase 10 — smart budgets, survival, emergency, goals, bills, spikes
  const smartBgts = smartBudgetStatuses(
    activeBudgets,
    state.transactions,
    state.recurringRules,
    today,
  );
  for (const s of smartBgts) {
    const cap = budgetLimitPaise(s.budget);
    const cat = state.categories.find((c) => c.id === s.budget.categoryId);
    const name = cat?.name ?? "Category";
    if (s.burnRisk === "high") {
      generated.push({
        kind: "budget_burn_high",
        severity: "danger",
        title: `${name} spending ahead of the month`,
        message: `${s.percentUsed.toFixed(0)}% of budget used vs ${s.dayProgressPct.toFixed(0)}% of month elapsed — variable pace is hot.`,
        linkHref: "/",
      });
    }
    if (s.adjustedMonthEndProjectedPaise > cap && s.percentUsed < 100 && cap > 0) {
      generated.push({
        kind: "budget_smart_overrun",
        severity: "warning",
        title: `${name} may still overrun`,
        message: `Variable-pace projection ~${formatMoney(s.adjustedMonthEndProjectedPaise)} vs ${formatMoney(cap)} limit (fixed recurring already softened where matched).`,
        linkHref: "/budgets",
      });
    }
  }

  const efi = buildEmergencyFundIntel(
    state.transactions,
    state.categories,
    state.investments,
    state.goals,
    today,
  );
  if (efi.monthlyEssentialPaise > 0 && efi.monthsCovered < 3) {
    generated.push({
      kind: "emergency_fund_low",
      severity: efi.monthsCovered < 1.5 ? "danger" : "warning",
      title: "Emergency fund runway thin",
      message: `~${efi.monthsCovered.toFixed(1)} month(s) of essential spend covered (${formatMoney(efi.emergencyFundAvailablePaise)}).`,
      linkHref: "/",
    });
  }

  const survival = buildCashflowSurvivalReport(
    state.accounts,
    state.transactions,
    state.recurringRules,
    state.loans,
    state.emis,
    state.cards,
    state.goals,
    state.udhari,
    state.ledgerEffects ?? [],
    today,
  );
  const minSafeDaily = 30 * 100; // ₹30 / day
  const coreTight =
    survival.safeDailyCorePaise < minSafeDaily && survival.disposableCorePaise < 20 * minSafeDaily;
  if (coreTight) {
    generated.push({
      kind: "safe_daily_spend_danger",
      severity: "danger",
      title: "Very tight daily cash headroom",
      message:
        survival.udhariPayablePaise > 0
          ? `After dated bills only (excluding open udhari), about ${formatMoney(survival.safeDailyCorePaise)}/day — still very tight.`
          : `Rough safe spend ${formatMoney(survival.safeDailySpendPaise)}/day before next income — check bills and discretionary spend.`,
      linkHref: "/",
    });
  }

  for (const g of state.goals) {
    if (g.status !== "active") continue;
    const intel = buildGoalIntel(g, today);
    if (intel.onTrackStatus === "behind" || intel.onTrackStatus === "critical") {
      generated.push({
        kind: "goal_shortfall",
        severity: intel.onTrackStatus === "critical" ? "danger" : "warning",
        title: `Goal off track: ${g.title}`,
        message: `Target pace ~${formatMoney(intel.monthlyRequiredPaise)}/mo; gap signal ${formatMoney(intel.shortfallPaise)}.`,
        linkHref: "/goals",
      });
    }
  }

  for (const r of state.recurringRules) {
    if (r.active !== 1) continue;
    if (!["expense", "emi_payment", "cc_payment"].includes(r.type)) continue;
    const due = parseISO(r.nextRunDate);
    const days = Math.round((due.getTime() - nowMs) / (1000 * 60 * 60 * 24));
    if (days >= 0 && days <= 3) {
      generated.push({
        kind: "fixed_bill_due",
        severity: days === 0 ? "warning" : "info",
        title: `Bill due soon: ${r.title}`,
        message: `${formatMoney(recurringRuleAmountPaise(r))} in ${days} day(s).`,
        linkHref: "/",
      });
    }
  }

  const ySp = today.getFullYear();
  const mSp = today.getMonth() + 1;
  const spikeMonthTx = filterByMonth(state.transactions, ySp, mSp);
  const catSpend = new Map<string, number>();
  for (const t of spikeMonthTx) {
    if (t.type !== "expense" || !t.categoryId || t.isDeleted === 1) continue;
    catSpend.set(t.categoryId, (catSpend.get(t.categoryId) ?? 0) + transactionAmountPaise(t));
  }
  for (const [cid, curSpend] of catSpend) {
    let sumPrev = 0;
    let n = 0;
    for (let i = 1; i <= 3; i++) {
      const ref = new Date(ySp, mSp - 1 - i, 1);
      const tx = filterByMonth(state.transactions, ref.getFullYear(), ref.getMonth() + 1);
      sumPrev += tx
        .filter((t) => t.type === "expense" && t.categoryId === cid && t.isDeleted !== 1)
        .reduce((a, t) => a + transactionAmountPaise(t), 0);
      n += 1;
    }
    const avg = n ? sumPrev / n : 0;
    if (avg > 50_000 && curSpend > avg * 1.45) {
      const name = state.categories.find((c) => c.id === cid)?.name ?? "Category";
      generated.push({
        kind: "recurring_expense_spike",
        severity: "warning",
        title: `Spending spike: ${name}`,
        message: `This month ${formatMoney(curSpend)} vs ~${formatMoney(avg)} recent average.`,
        linkHref: "/expenses",
      });
    }
  }

  // Credit card alerts (Phase 7 — ledger-aware utilization + dues)
  const ledgerFx = state.ledgerEffects ?? [];
  let cardStatements: CardStatement[] = [];
  try {
    cardStatements = (await getDB().cardStatements.where("userId").equals(user.id).toArray()).filter((row) => row.isDeleted !== 1);
  } catch {
    cardStatements = [];
  }
  for (const card of state.cards) {
    if (card.type !== "credit") continue;
    const intel = buildCreditCardIntel(card, state.transactions, ledgerFx, today);
    if (!intel) continue;
    const saved = cardStatements
      .filter((row) => row.cardId === card.id)
      .sort((a, b) => b.statementDate.localeCompare(a.statementDate))[0];
    const minimumFact: CardMoneyFact = saved
      ? readCardMoneyFact(saved, "minimumDue")
      : { valuePaise: intel.minimumDuePaise, evidence: "estimated", needsReview: false };

    if (intel.nextDueDateIso) {
      const due = parseISO(intel.nextDueDateIso);
      const days = Math.round((due.getTime() - nowMs) / (1000 * 60 * 60 * 24));
      if (days < 0 && intel.outstandingPaise > 0) {
        generated.push({
          kind: "cc_overdue",
          severity: "danger",
          title: `${card.nickname} payment overdue`,
          message: `${-days} day(s) overdue. Outstanding ${formatMoney(intel.outstandingPaise)}.`,
        });
      } else if (days >= 0 && days <= 3) {
        generated.push({
          kind: "cc_due_soon",
          severity: "warning",
          title: `${card.nickname} due in ${days} day(s)`,
          message: minimumDueAlertMessage(minimumFact, intel.fullDuePaise),
        });
      } else if (days > 3 && days <= 7) {
        generated.push({
          kind: "cc_due_week",
          severity: "info",
          title: `${card.nickname} due in ${days} days`,
          message: `Plan payment before ${due.toLocaleDateString("en-IN")}.`,
        });
      }
    }

    if (intel.risk === "over_limit") {
      generated.push({
        kind: "cc_over_limit",
        severity: "danger",
        title: `${card.nickname} over credit limit`,
        message: `Outstanding ${formatMoney(intel.outstandingPaise)} exceeds limit ${formatMoney(intel.limitPaise)}.`,
      });
    } else if (intel.risk === "danger") {
      generated.push({
        kind: "cc_util_80",
        severity: "danger",
        title: `${card.nickname} utilization ${intel.utilizationPct.toFixed(0)}%`,
        message: `Above 80% — high risk to credit profile.`,
      });
    } else if (intel.risk === "risky") {
      generated.push({
        kind: "cc_util_50",
        severity: "warning",
        title: `${card.nickname} utilization ${intel.utilizationPct.toFixed(0)}%`,
        message: `Between 50–80%. Consider paying down.`,
      });
    } else if (intel.risk === "watch") {
      generated.push({
        kind: "cc_util_30",
        severity: "info",
        title: `${card.nickname} utilization ${intel.utilizationPct.toFixed(0)}%`,
        message: `Between 30–50%. Monitor spend.`,
      });
    }

    if (
      intel.nextDueDateIso &&
      intel.statementBalancePaise > 0 &&
      minimumFact.evidence !== "not_observed" &&
      minimumFact.evidence !== "estimated" &&
      minimumFact.valuePaise != null &&
      minimumFact.valuePaise > 0
    ) {
      const due = parseISO(intel.nextDueDateIso);
      const days = Math.round((due.getTime() - nowMs) / (1000 * 60 * 60 * 24));
      if (days >= 0 && days <= 5) {
        generated.push({
          kind: "cc_min_due",
          severity: "warning",
          title: `${card.nickname}: minimum due soon`,
          message: `Pay at least ${formatMoney(minimumFact.valuePaise)} before due date to avoid late fees (full due ${formatMoney(intel.fullDuePaise)}).`,
        });
      }
    }
  }

  // EMI alerts
  for (const loan of state.loans) {
    const loanEmis = state.emis.filter((e) => e.loanId === loan.id);
    const sum = summarizeLoan(loan, loanEmis);
    if (sum.nextDueDate) {
      const due = parseISO(sum.nextDueDate);
      const days = Math.round((due.getTime() - nowMs) / (1000 * 60 * 60 * 24));
      if (days < 0) {
        generated.push({
          kind: "emi_overdue",
          severity: "danger",
          title: `${loan.lender} EMI overdue`,
          message: `${-days} day(s) overdue — clear soon.`,
        });
      } else if (days <= 3) {
        generated.push({
          kind: "emi_due_soon",
          severity: "warning",
          title: `${loan.lender} EMI in ${days} day(s)`,
          message: `Keep funds ready.`,
        });
      }
    }
  }

  const udhariAlertsOn = state.settings?.warningPreferences?.udhariAlerts !== false;

  if (udhariAlertsOn) {
    for (const r of state.udhari) {
      if (r.status === "settled" || r.status === "written_off" || !r.dueDate) continue;
      const remaining = udhariAmountPaise(r) - udhariSettledPaise(r);
      if (remaining <= 0) continue;
      const due = parseISO(r.dueDate);
      const days = Math.round((due.getTime() - nowMs) / (1000 * 60 * 60 * 24));
      if (days === 0) {
        generated.push({
          kind: "udhari_due_today",
          severity: "warning",
          title: `${r.personName}: udhari due today`,
          message:
            r.type === "receivable"
              ? `Follow up on ${formatMoney(remaining)} owed to you.`
              : `Plan to pay ${formatMoney(remaining)} you owe.`,
          linkHref: "/udhari",
        });
      } else if (days < 0) {
        const od = -days;
        const severity: "warning" | "danger" = od >= 30 ? "danger" : "warning";
        const kind = od >= 30 ? "udhari_overdue_30" : od >= 7 ? "udhari_overdue_7" : "udhari_overdue";
        generated.push({
          kind,
          severity,
          title: `${r.personName}: ${od} day(s) overdue`,
          message:
            r.type === "receivable"
              ? `${formatMoney(remaining)} still pending from them.`
              : `You still owe ${formatMoney(remaining)}.`,
          linkHref: "/udhari",
        });
      }
    }

    const recvTotals = new Map<string, { paise: number; label: string }>();
    for (const r of state.udhari) {
      if (r.type !== "receivable" || r.status === "settled" || r.status === "written_off") continue;
      const rem = udhariAmountPaise(r) - udhariSettledPaise(r);
      if (rem <= 0) continue;
      const k = udhariPersonKey(r.personName, r.phone);
      const prev = recvTotals.get(k);
      const label = (r.personName || "").trim() || r.phone || "Someone";
      recvTotals.set(k, {
        paise: (prev?.paise ?? 0) + rem,
        label: prev?.label ?? label,
      });
    }
    const largeRecvThresholdPaise = 50_000 * 100;
    for (const { paise, label } of recvTotals.values()) {
      if (paise >= largeRecvThresholdPaise) {
        generated.push({
          kind: "udhari_large_receivable",
          severity: "warning",
          title: `Large udhari receivable: ${label}`,
          message: `${formatMoney(paise)} open with this counterparty.`,
          linkHref: "/udhari",
        });
      }
    }

    const cutoffBorrow = new Date(today);
    cutoffBorrow.setDate(cutoffBorrow.getDate() - 180);
    const borrowByPerson = new Map<string, { count: number; label: string }>();
    for (const r of state.udhari) {
      if (r.type !== "payable") continue;
      try {
        const gd = parseISO(r.givenDate);
        if (gd < cutoffBorrow) continue;
      } catch {
        continue;
      }
      const k = udhariPersonKey(r.personName, r.phone);
      const prev = borrowByPerson.get(k);
      const label = (r.personName || "").trim() || r.phone || "this person";
      borrowByPerson.set(k, {
        count: (prev?.count ?? 0) + 1,
        label: prev?.label ?? label,
      });
    }
    for (const { count, label } of borrowByPerson.values()) {
      if (count >= 3) {
        generated.push({
          kind: "udhari_frequent_borrow",
          severity: "info",
          title: `Frequent informal borrowing (${label})`,
          message: `${count} separate udhari (payable) lines in the last 6 months.`,
          linkHref: "/udhari",
        });
      }
    }

    const payable = totalUdhariPayable(state.udhari);
    if (payable > 0) {
      generated.push({
        kind: "udhari_payable",
        severity: "info",
        title: `You owe ${formatMoney(payable)} in udhari`,
        message: `Review the Udhari page to settle pending amounts.`,
        linkHref: "/udhari",
      });
    }
    const recv = totalUdhariReceivable(state.udhari);
    if (recv > 0) {
      generated.push({
        kind: "udhari_receivable",
        severity: "info",
        title: `${formatMoney(recv)} pending from others`,
        message: `Nudge friends/family to settle when possible.`,
        linkHref: "/udhari",
      });
    }
  }

  // Cashflow warnings
  const curMonthTx = filterByMonth(
    state.transactions,
    today.getFullYear(),
    today.getMonth() + 1,
  );
  const monthKpis = calculateFinanceMonthKpis(
    state.ledgerEvents ?? [],
    state.ledgerEffects ?? [],
    today.getFullYear(),
    today.getMonth() + 1,
    curMonthTx,
  );
  const net = monthKpis.operatingSurplusPaise;
  if (net < 0) {
    generated.push({
      kind: "negative_cashflow",
      severity: "danger",
      title: "Negative operating surplus",
      message: "Consumption expense exceeds true income this month.",
    });
  } else if (net < 100_000 && curMonthTx.length > 2) {
    generated.push({
      kind: "low_savings",
      severity: "warning",
      title: "Low operating surplus",
      message: "Surplus after essentials is tight — review discretionary spend.",
    });
  }

  const prefs = state.settings?.warningPreferences;
  const expenseTx = state.transactions.filter((tx) => tx.isDeleted !== 1 && tx.type === "expense");
  const monthKey = (iso: string) => iso.slice(0, 7);
  const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  const sumMonth = (key: string) =>
    expenseTx.reduce((sum, tx) => (monthKey(tx.date) === key ? sum + transactionAmountPaise(tx) : sum), 0);
  const thisSpend = sumMonth(thisMonth);
  const prevSpend = sumMonth(prevMonth);
  if (prevSpend > 0 && expenseTx.filter((tx) => monthKey(tx.date) === thisMonth).length >= 3 && thisSpend > prevSpend * 1.5) {
    generated.push({
      kind: "unusual_spend",
      severity: "warning",
      title: "Spending is higher than last month",
      message: `This month's expenses are ${formatMoney(thisSpend)} versus ${formatMoney(prevSpend)} last month. Review before treating this as a problem.`,
      linkHref: "/expenses",
    });
  }
  const seenDup = new Set<string>();
  for (const tx of expenseTx) {
    const key = `${tx.date}|${transactionAmountPaise(tx)}|${tx.accountId ?? ""}`;
    if (seenDup.has(key)) continue;
    const matches = expenseTx.filter(
      (other) => other.date === tx.date && transactionAmountPaise(other) === transactionAmountPaise(tx) && (other.accountId ?? "") === (tx.accountId ?? ""),
    );
    if (matches.length < 2) continue;
    seenDup.add(key);
    generated.push({
      kind: "duplicate_candidate",
      severity: "info",
      title: "Possible duplicate expense",
      message: `${matches.length} expenses on ${tx.date} share ${formatMoney(transactionAmountPaise(tx))}. This is a candidate only — nothing was deleted.`,
      linkHref: "/transactions",
    });
  }

  const visible = generated.filter((g) => alertPreferenceEnabled(prefs, g.kind));

  // Upsert — merge with existing to preserve dismissed ones
  for (const g of visible) {
    const prior = existing.find(
      (a) => a.kind === g.kind && a.title === g.title,
    );
    if (prior) {
      // Keep existing active alerts stable; dismissed alerts can reappear next month.
      if (!prior.dismissed || sameMonth(prior.triggeredAt, today.toISOString())) continue;
    }
    const created = await alertRepo.create({
      userId: user.id,
      data: {
        ...g,
        dismissed: 0,
        triggeredAt: new Date().toISOString(),
      },
    });
    state.upsertLocal("alerts", created);
  }
}

function sameMonth(aIso: string, bIso: string): boolean {
  const a = parseISO(aIso);
  const b = parseISO(bIso);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}
