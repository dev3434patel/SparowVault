import { useCallback, useEffect, useMemo, useState } from "react";
import { companyApi } from "@/company/api/client";
import { periodRange } from "@/company/lib/fy";
import { companyAllows } from "@/company/auth/companyCan";
import { voucherListAmountPaise } from "@/company/finance/voucherListAmount";
import { useCompanyStore } from "@/company/store/companyStore";
import type { CompanyVoucher } from "@/company/types";

export type PeriodKind = "today" | "week" | "month" | "quarter" | "fy";

type WidgetErr = string | null;

export type FlowChartPoint = { day: string; in: number; out: number };
export type AgeingBucket = { name: string; amount: number };
export type TopParty = { partyId: string; name: string; outstanding: number; side: string };
export type RecentVoucher = {
  id: string;
  date: string;
  type: string;
  narration: string;
  amountPaise: number;
  status: string;
};

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function sumOutstanding(
  bills: Array<{ outstandingPaise?: number; dueDate?: string | null; status?: string }>,
) {
  return bills.reduce((a, b) => a + Number(b.outstandingPaise ?? 0), 0);
}

export function overdueAmount(
  bills: Array<{ outstandingPaise?: number; dueDate?: string | null }>,
  asOf: string,
) {
  return bills.reduce((a, b) => {
    const due = b.dueDate;
    if (due && due < asOf && Number(b.outstandingPaise ?? 0) > 0) return a + Number(b.outstandingPaise);
    return a;
  }, 0);
}

/** A failed widget is not an empty book, even when every figure is still zero. */
export function dashboardBookLooksEmpty(input: {
  loading: boolean;
  cash: number;
  ar: number;
  ap: number;
  moneyIn: number;
  moneyOut: number;
  recentCount: number;
  widgetErrors: Array<string | null | undefined>;
}): boolean {
  if (input.loading) return false;
  if (input.widgetErrors.some((message) => Boolean(message))) return false;
  return (
    input.cash === 0 &&
    input.ar === 0 &&
    input.ap === 0 &&
    input.moneyIn === 0 &&
    input.moneyOut === 0 &&
    input.recentCount === 0
  );
}

export function dueWithinDays(
  bills: Array<{ outstandingPaise?: number; dueDate?: string | null }>,
  asOf: string,
  days: number,
) {
  const end = new Date(asOf);
  end.setDate(end.getDate() + days);
  const endIso = end.toISOString().slice(0, 10);
  return bills.reduce((a, b) => {
    const due = b.dueDate;
    if (due && due >= asOf && due <= endIso) return a + Number(b.outstandingPaise ?? 0);
    return a;
  }, 0);
}

export function useDashboardData() {
  const companyId = useCompanyStore((s) => s.activeCompanyId);
  const workspace = useCompanyStore((s) => s.workspace);
  const contextEpoch = useCompanyStore((s) => s.contextEpoch);
  const permissions = useCompanyStore((s) => s.permissions);
  const permissionsState = useCompanyStore((s) => s.permissionsState);
  const showApprovals = companyAllows(permissionsState, permissions, "approve_voucher");

  const [period, setPeriod] = useState<PeriodKind>("month");
  const range = useMemo(
    () => periodRange(period, workspace?.financialYearStartMonth ?? 4),
    [period, workspace?.financialYearStartMonth],
  );

  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<string>("");
  const [cash, setCash] = useState(0);
  const [cashBankSplit, setCashBankSplit] = useState({ cash: 0, bank: 0 });
  const [ar, setAr] = useState(0);
  const [ap, setAp] = useState(0);
  const [arOverdue, setArOverdue] = useState(0);
  const [apOverdue, setApOverdue] = useState(0);
  const [arSoon, setArSoon] = useState(0);
  const [apSoon, setApSoon] = useState(0);
  const [moneyIn, setMoneyIn] = useState(0);
  const [moneyOut, setMoneyOut] = useState(0);
  const [income, setIncome] = useState(0);
  const [expense, setExpense] = useState(0);
  const [profit, setProfit] = useState(0);
  const [approvals, setApprovals] = useState(0);
  const [onAccount, setOnAccount] = useState(0);
  const [flowChart, setFlowChart] = useState<FlowChartPoint[]>([]);
  const [ageing, setAgeing] = useState<AgeingBucket[]>([]);
  const [topParties, setTopParties] = useState<TopParty[]>([]);
  const [recent, setRecent] = useState<RecentVoucher[]>([]);
  const [errs, setErrs] = useState<Record<string, WidgetErr>>({});

  const load = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const asOf = todayIso();
    const nextErrs: Record<string, WidgetErr> = {};

    try {
      const settled = await Promise.allSettled([
        companyApi.report(companyId, "trial-balance", undefined, undefined, { asOf }),
        companyApi.listBills(companyId, "RECEIVABLE"),
        companyApi.listBills(companyId, "PAYABLE"),
        companyApi.report(companyId, "day-book", range.from, range.to),
        companyApi.report(companyId, "profit-loss", range.from, range.to),
        showApprovals ? companyApi.listApprovals(companyId) : Promise.resolve(null),
        companyApi.report(companyId, "ageing", undefined, undefined, { side: "receivable", asOf }),
        companyApi.listVouchers(companyId, { from: range.from, to: range.to }),
      ]);

      if (settled[0].status === "fulfilled") {
        const tb = ((settled[0].value as { data?: unknown }).data ?? []) as Array<{
          ledgerCode?: string;
          closingDebitPaise?: number;
          closingCreditPaise?: number;
        }>;
        let cashAmt = 0;
        let bankAmt = 0;
        for (const row of tb) {
          const code = String(row.ledgerCode ?? "");
          const bal = Number(row.closingDebitPaise ?? 0) - Number(row.closingCreditPaise ?? 0);
          if (code === "CASH_IN_HAND") cashAmt += bal;
          else if (code.startsWith("BANK_") || code === "BANK_PRIMARY") bankAmt += bal;
        }
        setCash(cashAmt + bankAmt);
        setCashBankSplit({ cash: cashAmt, bank: bankAmt });
      } else {
        nextErrs.cash = "Could not load Cash & Bank";
      }

      if (settled[1].status === "fulfilled") {
        const bills = settled[1].value as Array<{
          outstandingPaise?: number;
          dueDate?: string | null;
          partyId?: string;
          partyName?: string;
          status?: string;
        }>;
        setAr(sumOutstanding(bills));
        setArOverdue(overdueAmount(bills, asOf));
        setArSoon(dueWithinDays(bills, asOf, 7));
        const onAcc = bills
          .filter(
            (b) =>
              String(b.status ?? "").toUpperCase().includes("ON_ACCOUNT") ||
              String(b.status ?? "") === "ON_ACCOUNT",
          )
          .reduce((a, b) => a + Number(b.outstandingPaise ?? 0), 0);
        setOnAccount(onAcc);
        const byParty = new Map<string, { name: string; outstanding: number }>();
        for (const b of bills) {
          if (!b.partyId || !(b.outstandingPaise ?? 0)) continue;
          const cur = byParty.get(b.partyId) ?? {
            name: b.partyName ?? b.partyId.slice(0, 8),
            outstanding: 0,
          };
          cur.outstanding += Number(b.outstandingPaise);
          byParty.set(b.partyId, cur);
        }
        setTopParties(
          [...byParty.entries()]
            .map(([partyId, v]) => ({
              partyId,
              name: v.name,
              outstanding: v.outstanding,
              side: "AR",
            }))
            .sort((a, b) => b.outstanding - a.outstanding)
            .slice(0, 5),
        );
      } else {
        nextErrs.ar = "Could not load Receivables";
      }

      if (settled[2].status === "fulfilled") {
        const bills = settled[2].value as Array<{ outstandingPaise?: number; dueDate?: string | null }>;
        setAp(sumOutstanding(bills));
        setApOverdue(overdueAmount(bills, asOf));
        setApSoon(dueWithinDays(bills, asOf, 7));
      } else {
        nextErrs.ap = "Could not load Payables";
      }

      if (settled[3].status === "fulfilled") {
        const rows = ((settled[3].value as { data?: unknown }).data ?? []) as Array<Record<string, unknown>>;
        let inn = 0;
        let out = 0;
        const byDay = new Map<string, { in: number; out: number }>();
        for (const v of rows) {
          const type = String(v.voucher_type ?? v.voucherType ?? "").toUpperCase();
          const amt = Number(
            v.debitTotalPaise ?? v.amountPaise ?? v.total_debit_paise ?? v.totalDebitPaise ?? 0,
          );
          const day = String(v.voucher_date ?? v.voucherDate ?? "").slice(0, 10);
          const bucket = byDay.get(day) ?? { in: 0, out: 0 };
          if (type === "RECEIPT") {
            inn += amt;
            bucket.in += amt;
          }
          if (type === "PAYMENT") {
            out += amt;
            bucket.out += amt;
          }
          byDay.set(day, bucket);
        }
        setMoneyIn(inn);
        setMoneyOut(out);
        setFlowChart(
          [...byDay.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-14)
            .map(([day, v]) => ({ day: day.slice(5), in: v.in / 100, out: v.out / 100 })),
        );
      } else {
        nextErrs.flow = "Could not load money in/out";
      }

      if (settled[4].status === "fulfilled") {
        const data = (settled[4].value as { data?: Record<string, unknown> }).data ?? {};
        const inc = Number(data.totalIncomePaise ?? data.total_income_paise ?? 0);
        const exp = Number(data.totalExpensePaise ?? data.total_expense_paise ?? 0);
        const net = Number(data.netProfitPaise ?? data.net_profit_paise ?? inc - exp);
        setIncome(inc);
        setExpense(exp);
        setProfit(net);
      } else {
        nextErrs.pnl = "Could not load Profit & Loss";
      }

      if (settled[5].status === "fulfilled") {
        const rows = settled[5].value;
        if (Array.isArray(rows)) setApprovals(rows.length);
      } else if (showApprovals) {
        nextErrs.approvals = "Could not load approvals";
      }

      if (settled[6].status === "fulfilled") {
        const data = (settled[6].value as { data?: { buckets?: unknown } }).data;
        const raw = data?.buckets;
        const labels: Record<string, string> = {
          notDue: "Not due",
          d0_15: "0–15",
          d16_30: "16–30",
          d31_60: "31–60",
          d61_90: "61–90",
          d90plus: "90+",
        };
        if (Array.isArray(raw)) {
          setAgeing(
            raw.map((b: { label?: string; name?: string; amountPaise?: number; totalPaise?: number }) => ({
              name: String(b.label ?? b.name ?? "Bucket"),
              amount: Number(b.amountPaise ?? b.totalPaise ?? 0) / 100,
            })),
          );
        } else if (raw && typeof raw === "object") {
          setAgeing(
            Object.entries(raw as Record<string, number>).map(([k, v]) => ({
              name: labels[k] ?? k,
              amount: Number(v ?? 0) / 100,
            })),
          );
        } else {
          setAgeing([]);
        }
      } else {
        nextErrs.ageing = "Could not load ageing";
      }

      if (settled[7].status === "fulfilled") {
        const vouchers = settled[7].value as CompanyVoucher[];
        setRecent(
          vouchers.slice(0, 10).map((v) => ({
            id: String(v.id),
            date: String(v.voucherDate ?? ""),
            type: String(v.voucherType ?? ""),
            narration: String(v.narration ?? ""),
            amountPaise: voucherListAmountPaise(v),
            status: String(v.status ?? "POSTED"),
          })),
        );
      } else {
        nextErrs.recent = "Could not load recent vouchers";
      }

      setErrs(nextErrs);
      setRefreshedAt(new Date().toLocaleTimeString());
    } catch (e) {
      setErrs({ cash: e instanceof Error ? e.message : "Dashboard failed to load" });
    } finally {
      setLoading(false);
    }
  }, [companyId, range.from, range.to, showApprovals]);

  useEffect(() => {
    void load();
  }, [load, contextEpoch]);

  const initialLoading = loading && !refreshedAt;
  const isEmpty = dashboardBookLooksEmpty({
    loading,
    cash,
    ar,
    ap,
    moneyIn,
    moneyOut,
    recentCount: recent.length,
    widgetErrors: Object.values(errs),
  });

  return {
    workspace,
    period,
    setPeriod,
    range,
    loading,
    initialLoading,
    load,
    refreshedAt,
    cash,
    cashBankSplit,
    ar,
    ap,
    arOverdue,
    apOverdue,
    arSoon,
    apSoon,
    moneyIn,
    moneyOut,
    income,
    expense,
    profit,
    approvals,
    onAccount,
    flowChart,
    ageing,
    topParties,
    recent,
    errs,
    showApprovals,
    isEmpty,
  };
}
