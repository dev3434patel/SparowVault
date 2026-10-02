import { KpiCard } from "@/company/components/KpiCard";
import { CompanyMoney } from "@/company/components/CompanyMoney";
import { SkeletonKpiRow } from "@/company/components/CompanySkeleton";
import { companyNavigate, companyPath } from "@/company/routes";
import type { PeriodKind } from "@/company/hooks/useDashboardData";
import { useI18n } from "@/company/i18n/react";

type KpiSectionProps = {
  period: PeriodKind;
  loading: boolean;
  initialLoading: boolean;
  load: () => void | Promise<void>;
  errs: Record<string, string | null>;
  cash: number;
  cashBankSplit: { cash: number; bank: number };
  ar: number;
  ap: number;
  arOverdue: number;
  apOverdue: number;
  arSoon: number;
  apSoon: number;
  moneyIn: number;
  moneyOut: number;
  income: number;
  expense: number;
  profit: number;
};

export function KpiSection({
  period,
  loading,
  initialLoading,
  load,
  errs,
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
}: KpiSectionProps) {
  const { t } = useI18n();
  return (
    <>
      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t("dashboard.liquidPosition")}</h2>
        {initialLoading ? (
          <SkeletonKpiRow count={4} />
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard
              label={t("dashboard.cashBank")}
              paise={cash}
              loading={loading}
              error={errs.cash}
              onRetry={load}
              semantic="debit"
              subline={
                <>
                  {t("dashboard.bank")} <CompanyMoney paise={cashBankSplit.bank} className="text-[11px] font-medium" /> · {t("dashboard.cash")}{" "}
                  <CompanyMoney paise={cashBankSplit.cash} className="text-[11px] font-medium" />
                </>
              }
              definition={t("dashboard.kpiCashBank")}
              onClick={() => companyNavigate(companyPath("cash-bank"))}
            />
            <KpiCard
              label={t("dashboard.receivables")}
              paise={ar}
              loading={loading}
              error={errs.ar}
              onRetry={load}
              semantic={arOverdue > 0 ? "overdue" : "credit"}
              subline={
                <>
                  {t("dashboard.overdueLabel")} <CompanyMoney paise={arOverdue} semantic="overdue" className="text-[11px] font-medium" /> ·
                  {t("dashboard.due7d")} <CompanyMoney paise={arSoon} className="text-[11px] font-medium" />
                </>
              }
              definition={t("dashboard.kpiReceivables")}
              onClick={() => companyNavigate(companyPath("receivables"))}
            />
            <KpiCard
              label={t("dashboard.payables")}
              paise={ap}
              loading={loading}
              error={errs.ap}
              onRetry={load}
              semantic={apOverdue > 0 ? "overdue" : "neutral"}
              subline={
                <>
                  {t("dashboard.overdueLabel")} <CompanyMoney paise={apOverdue} semantic="overdue" className="text-[11px] font-medium" /> ·
                  {t("dashboard.due7d")} <CompanyMoney paise={apSoon} className="text-[11px] font-medium" />
                </>
              }
              definition={t("dashboard.kpiPayables")}
              onClick={() => companyNavigate(companyPath("payables"))}
            />
            <KpiCard
              label={t("dashboard.netParty")}
              paise={ar - ap}
              loading={loading}
              error={errs.ar || errs.ap}
              onRetry={load}
              semantic={ar - ap >= 0 ? "profit" : "loss"}
              subline={t("dashboard.netPartySub")}
              definition={t("dashboard.kpiNetParty")}
              onClick={() => companyNavigate(companyPath("parties"))}
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {t("dashboard.kpiPeriod", { label: t(`dashboard.period.${period}`) })}
        </h2>
        {initialLoading ? (
          <SkeletonKpiRow count={5} />
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <KpiCard
              label={t("dashboard.moneyIn")}
              paise={moneyIn}
              loading={loading}
              error={errs.flow}
              onRetry={load}
              semantic="credit"
              definition={t("dashboard.kpiMoneyIn")}
              onClick={() => companyNavigate(companyPath("day-book"))}
            />
            <KpiCard
              label={t("dashboard.moneyOut")}
              paise={moneyOut}
              loading={loading}
              error={errs.flow}
              onRetry={load}
              semantic="debit"
              definition={t("dashboard.kpiMoneyOut")}
              onClick={() => companyNavigate(companyPath("day-book"))}
            />
            <KpiCard
              label={t("dashboard.income")}
              paise={income}
              loading={loading}
              error={errs.pnl}
              onRetry={load}
              semantic="profit"
              definition={t("dashboard.kpiIncome")}
              onClick={() => companyNavigate(companyPath("report-view", { reportKey: "profit-loss" }))}
            />
            <KpiCard
              label={t("dashboard.expense")}
              paise={expense}
              loading={loading}
              error={errs.pnl}
              onRetry={load}
              semantic="loss"
              definition={t("dashboard.kpiExpense")}
              onClick={() => companyNavigate(companyPath("report-view", { reportKey: "profit-loss" }))}
            />
            <KpiCard
              label={t("dashboard.profit")}
              paise={Math.abs(profit)}
              loading={loading}
              error={errs.pnl}
              onRetry={load}
              semantic={profit >= 0 ? "profit" : "loss"}
              definition={t("dashboard.kpiProfit")}
              onClick={() => companyNavigate(companyPath("report-view", { reportKey: "profit-loss" }))}
            />
          </div>
        )}
      </div>
    </>
  );
}
