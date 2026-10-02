import { Button } from "@/components/ui/Button";
import { ActionTile, EmptyState, PageHeader } from "@/company/components/PageChrome";
import { AttentionSection } from "@/company/components/dashboard/AttentionSection";
import { KpiSection } from "@/company/components/dashboard/KpiSection";
import { RecentVouchers } from "@/company/components/dashboard/RecentVouchers";
import { type PeriodKind, useDashboardData } from "@/company/hooks/useDashboardData";
import { fyLabelFromStartMonth } from "@/company/lib/fy";
import { companyNavigate, companyPath } from "@/company/routes";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  FileSpreadsheet,
  PieChart,
  Users,
} from "lucide-react";
import { useI18n } from "@/company/i18n/react";
import { lazy, Suspense } from "react";
import { SkeletonChart } from "@/company/components/CompanySkeleton";

/** Recharts only loads with the dashboard chart section. */
const CashFlowChart = lazy(() =>
  import("@/company/components/dashboard/CashFlowChart").then((m) => ({ default: m.CashFlowChart })),
);

export function DashboardPage() {
  const { t } = useI18n();
  const {
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
  } = useDashboardData();

  const fy = workspace ? fyLabelFromStartMonth(workspace.financialYearStartMonth) : "";

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("dashboard.title")}
        subtitle={
          <span>
            {workspace?.displayName ?? t("dashboard.company")}
            {fy ? ` · ${fy}` : ""}
            {" · "}
            {range.label} ({range.from} → {range.to})
            {refreshedAt ? ` · ${t("common.refreshed", { time: refreshedAt })}` : ""}
          </span>
        }
        actions={
          <div className="inline-flex flex-wrap rounded-xl border border-border bg-card p-0.5 shadow-[var(--shadow-card)]">
            {(["today", "week", "month", "quarter", "fy"] as PeriodKind[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={
                  period === p
                    ? "rounded-lg bg-[hsl(var(--primary))] px-3 py-1.5 text-xs font-semibold text-[hsl(var(--primary-foreground))]"
                    : "rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                }
              >
                {t(`dashboard.period.${p}`)}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <ActionTile
          label={t("dashboard.moneyReceived")}
          hint={t("dashboard.moneyReceivedHint")}
          tone="in"
          icon={<ArrowDownLeft className="h-4 w-4 text-[hsl(var(--income))]" />}
          onClick={() => companyNavigate(companyPath("quick-received"))}
        />
        <ActionTile
          label={t("dashboard.moneyPaid")}
          hint={t("dashboard.moneyPaidHint")}
          tone="out"
          icon={<ArrowUpRight className="h-4 w-4 text-[hsl(var(--expense))]" />}
          onClick={() => companyNavigate(companyPath("quick-paid"))}
        />
        <ActionTile
          label={t("dashboard.transfer")}
          hint={t("dashboard.transferHint")}
          tone="accent"
          icon={<ArrowLeftRight className="h-4 w-4 text-[hsl(var(--info))]" />}
          onClick={() => companyNavigate(companyPath("quick-transfer"))}
        />
        <ActionTile
          label={t("dashboard.newParty")}
          hint={t("dashboard.newPartyHint")}
          icon={<Users className="h-4 w-4" />}
          onClick={() => companyNavigate(companyPath("parties"))}
        />
        <ActionTile
          label={t("dashboard.journal")}
          hint={t("dashboard.journalHint")}
          icon={<FileSpreadsheet className="h-4 w-4" />}
          onClick={() => companyNavigate(companyPath("quick-journal"))}
        />
        <ActionTile
          label={t("dashboard.reports")}
          hint={t("dashboard.reportsHint")}
          icon={<PieChart className="h-4 w-4" />}
          onClick={() => companyNavigate(companyPath("reports"))}
        />
      </div>

      {isEmpty ? (
        <EmptyState
          title={t("dashboard.emptyTitle")}
          body={t("dashboard.emptyBody")}
          actions={
            <>
              <Button onClick={() => companyNavigate(companyPath("parties"))}>{t("parties.addFirst")}</Button>
              <Button variant="secondary" onClick={() => companyNavigate(companyPath("quick-received"))}>
                {t("dashboard.moneyReceived")}
              </Button>
              <Button variant="outline" onClick={() => companyNavigate(companyPath("ledgers"))}>
                {t("nav.cashBank")}
              </Button>
            </>
          }
        />
      ) : null}

      <KpiSection
        period={period}
        loading={loading}
        initialLoading={initialLoading}
        load={load}
        errs={errs}
        cash={cash}
        cashBankSplit={cashBankSplit}
        ar={ar}
        ap={ap}
        arOverdue={arOverdue}
        apOverdue={apOverdue}
        arSoon={arSoon}
        apSoon={apSoon}
        moneyIn={moneyIn}
        moneyOut={moneyOut}
        income={income}
        expense={expense}
        profit={profit}
      />

      <AttentionSection
        arOverdue={arOverdue}
        apOverdue={apOverdue}
        showApprovals={showApprovals}
        approvals={approvals}
        onAccount={onAccount}
        load={load}
        figuresUnverified={Boolean(errs.ar || errs.ap || errs.approvals || errs.cash || errs.flow || errs.pnl)}
      />

      <Suspense fallback={<SkeletonChart className="h-56" />}>
        <CashFlowChart initialLoading={initialLoading} errs={errs} flowChart={flowChart} ageing={ageing} load={load} />
      </Suspense>

      <RecentVouchers
        initialLoading={initialLoading}
        topParties={topParties}
        recent={recent}
        partiesError={errs.ar}
        recentError={errs.recent}
      />
    </div>
  );
}
