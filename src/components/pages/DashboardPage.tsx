import { useMemo, useState, type ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/layout/PageHeader";
import { useDataStore } from "@/store/dataStore";
import { useAuthStore } from "@/store/authStore";
import {
  budgetStatuses,
  categoryBreakdown,
  computeFinancialHealth,
  deriveAccountBalanceFromAccount,
  emergencyMonthsCoverage,
  filterByMonth,
  monthlyTrend,
  savingsRate,
  summarizeCardHealth,
  summarizeLoan,
  sumIncome,
  sumExpense,
  totalUdhariPayable,
  totalUdhariReceivable,
} from "@/services/calculations";
import { calculateLedgerMonthKpis, hasUsableLedger } from "@/services/ledgerCalculations";
import {
  calculateFinanceMonthKpis,
  calculateConsolidatedNetWorthPaise,
  operatingSurplusRate,
} from "@/services/financeKpiEngine";
import { PaydayCashflowPanel } from "@/components/finance/PaydayCashflowPanel";
import { buildCashflowSurvivalReport } from "@/services/cashflowSurvivalEngine";
import { buildEmergencyFundIntel } from "@/services/emergencyFundEngine";
import { summarizeGoalsAtRisk } from "@/services/goalEngine";
import {
  personalDashboardSections,
  sharedFamilyKpis,
} from "@/services/personalBookWorkflows";
import { smartBudgetStatuses } from "@/services/smartBudgetEngine";
import { useMessages } from "@/i18n/useMessages";
import { formatDate, formatINR, formatINRCompact, formatPercent, formatRelativeDue } from "@/lib/format";
import { endOfMonth, startOfMonth } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { useUIStore } from "@/store/uiStore";
import {
  attachCategoryIcons,
  expenseBreakdownWithDistinctChartColors,
  hideDeletedCategorySlices,
} from "@/services/categoryColorEngine";
import type { ExplainMetricSpec } from "@/components/explain/ExplainMetricDrawer";
import { ExplainMetricTrigger } from "@/components/explain/ExplainMetricDrawer";
import { Progress } from "@/components/ui/Progress";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useNavStore } from "@/store/navStore";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CreditCard,
  IndianRupee,
  PiggyBank,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Wallet,
  ArrowRight,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { SafeChart } from "@/components/charts/SafeChart";
import {
  budgetLimitPaise,
  emiPaymentOutstandingPaise,
  goalSavedPaise,
  goalTargetPaise,
  investmentTotalContributedPaise,
  paiseToRupees,
  transactionAmountPaise,
} from "@/utils/money";

export function DashboardPage() {
  const user = useAuthStore((s) => s.currentUser);
  const setActive = useNavStore((s) => s.setActive);
  const dashboardMode = useUIStore((s) => s.dashboardMode);
  const setDashboardMode = useUIStore((s) => s.setDashboardMode);
  const chartAccessibility = useUIStore((s) => s.chartAccessibility);
  const setPendingTransactionFilters = useUIStore((s) => s.setPendingTransactionFilters);
  const transactions = useDataStore((s) => s.transactions);
  const budgets = useDataStore((s) => s.budgets);
  const categories = useDataStore((s) => s.categories);
  const accounts = useDataStore((s) => s.accounts);
  const cards = useDataStore((s) => s.cards);
  const loans = useDataStore((s) => s.loans);
  const emis = useDataStore((s) => s.emis);
  const udhari = useDataStore((s) => s.udhari);
  const goals = useDataStore((s) => s.goals);
  const investments = useDataStore((s) => s.investments);
  const recurringRules = useDataStore((s) => s.recurringRules);
  const alerts = useDataStore((s) => s.alerts);
  const ledgerEvents = useDataStore((s) => s.ledgerEvents);
  const ledgerEffects = useDataStore((s) => s.ledgerEffects);
  const aiSuggestions = useDataStore((s) => s.aiSuggestions);

  const today = useMemo(() => new Date(), []);
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  const stats = useMemo(() => {
    const curTx = filterByMonth(transactions, year, month);
    const useLedgerKpis = hasUsableLedger(ledgerEvents, ledgerEffects);
    const financeKpis = calculateFinanceMonthKpis(
      ledgerEvents,
      ledgerEffects,
      year,
      month,
      curTx,
    );
    const totalIncome = financeKpis.trueIncomePaise;
    const totalExpense = financeKpis.consumptionExpensePaise;
    const net = financeKpis.operatingSurplusPaise;
    const rate = operatingSurplusRate(net, totalIncome);

    const activeBudgets = budgets.filter((b) =>
      b.period === "monthly"
        ? b.year === year && b.month === month
        : b.year === year,
    );
    const ledgerBudgetCtx = useLedgerKpis
      ? { events: ledgerEvents, effects: ledgerEffects, useLedger: true }
      : undefined;
    const bgts = budgetStatuses(activeBudgets, transactions, today, ledgerBudgetCtx);
    const smartBgts = smartBudgetStatuses(activeBudgets, transactions, recurringRules, today);
    const worstSmartBudget = [...smartBgts].sort((a, b) => b.usageVsTimeRatio - a.usageVsTimeRatio)[0];
    const survival = buildCashflowSurvivalReport(
      accounts,
      transactions,
      recurringRules,
      loans,
      emis,
      cards,
      goals,
      udhari,
      ledgerEffects ?? [],
      today,
    );
    const emergencyIntel = buildEmergencyFundIntel(
      transactions,
      categories,
      investments,
      goals,
      today,
    );
    const goalsAtRiskAll = summarizeGoalsAtRisk(goals, today, 50);
    const goalsAtRisk = goalsAtRiskAll.slice(0, 4);
    const budgetUsage =
      bgts.length === 0
        ? 0
        : (bgts.reduce((acc, b) => acc + b.spentPaise, 0) /
            Math.max(
              1,
              bgts.reduce((acc, b) => acc + budgetLimitPaise(b.budget), 0),
            )) *
          100;

    const bankEstimate = accounts
      .filter((a) => a.type !== "cash")
      .reduce(
        (acc, a) => acc + deriveAccountBalanceFromAccount(a.id, a, transactions),
        0,
      );

    const emiThisMonth = emis
      .filter((e) => {
        const d = new Date(e.dueDate);
        return d.getFullYear() === year && d.getMonth() + 1 === month;
      })
      .reduce((acc, e) => acc + emiPaymentOutstandingPaise(e), 0);

    const ccHealth = cards
      .filter((c) => c.type === "credit")
      .map((c) => summarizeCardHealth(c, transactions, today, ledgerEffects));
    const upcomingCCDue = ccHealth.reduce((acc, h) => acc + h.statementBalancePaise, 0);

    const totalLiabilities =
      loans.reduce((acc, l) => {
        const s = summarizeLoan(
          l,
          emis.filter((e) => e.loanId === l.id),
        );
        return acc + s.outstandingPrincipalPaise;
      }, 0) +
      ccHealth.reduce((a, h) => a + h.outstandingBalancePaise, 0);

    // Emergency fund months
    const emergencyInv = investments.filter((i) => i.type === "emergency_fund");
    const emergencyFund = emergencyInv.reduce((a, i) => a + investmentTotalContributedPaise(i), 0);
    const avg6MoExpense =
      monthlyTrend(transactions, 6, today).reduce((a, b) => a + b.expensePaise, 0) / 6;
    const emergencyMonths = emergencyMonthsCoverage(emergencyFund, avg6MoExpense);
    const emergencyHealthMonths =
      emergencyIntel.monthlyEssentialPaise > 0
        ? Math.max(emergencyMonths, emergencyIntel.monthsCovered)
        : emergencyMonths;

    // Goal progress aggregate
    const totalGoalTarget = goals.reduce((a, g) => a + goalTargetPaise(g), 0);
    const totalGoalSaved = goals.reduce((a, g) => a + goalSavedPaise(g), 0);
    const activeGoals = goals.filter((g) => g.status === "active");
    const goalOnTrackPct =
      activeGoals.length === 0
        ? 100
        : ((activeGoals.length - goalsAtRiskAll.length) / activeGoals.length) * 100;

    const health = computeFinancialHealth({
      savingsRatePct: rate,
      overduePayments:
        emis.filter((e) => e.status === "overdue").length +
        udhari.filter(
          (u) =>
            u.dueDate &&
            new Date(u.dueDate) < today &&
            u.status !== "settled" &&
            u.status !== "written_off",
        ).length,
      avgCreditUtilizationPct:
        ccHealth.length === 0
          ? 0
          : ccHealth.reduce((a, h) => a + h.utilization, 0) / ccHealth.length,
      budgetAdherencePct:
        bgts.length === 0
          ? 100
          : (bgts.filter((b) => b.level === "ok" || b.level === "watch").length /
              bgts.length) *
            100,
      goalOnTrackPct,
      emergencyMonthsCoverage: emergencyHealthMonths,
      debtToIncomeRatio:
        totalIncome > 0 ? (emiThisMonth + upcomingCCDue) / Math.max(1, totalIncome) : 0,
    });

    const trend = monthlyTrend(transactions, 6, today).map((r) => ({
      ...r,
      income: paiseToRupees(r.incomePaise),
      expense: paiseToRupees(r.expensePaise),
      net: paiseToRupees(r.netPaise),
    }));
    const udhariReceivable = totalUdhariReceivable(udhari);
    const udhariPayable = totalUdhariPayable(udhari);

    const cashInHand = accounts
      .filter((a) => a.type === "cash")
      .reduce(
        (acc, a) => acc + deriveAccountBalanceFromAccount(a.id, a, transactions),
        0,
      );

    const catBreakRaw = hideDeletedCategorySlices(categoryBreakdown(curTx, categories), categories);
    const catDistinct = attachCategoryIcons(
      expenseBreakdownWithDistinctChartColors(catBreakRaw, chartAccessibility, 5),
      categories,
    );
    const catBreak = catDistinct.map((c) => ({
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      color: c.chartColor,
      amountPaise: c.amountPaise,
      percent: c.percent,
      amount: paiseToRupees(c.amountPaise),
      icon: c.categoryIcon ?? "🧾",
    }));

    const investAssets = investments
      .filter((i) => i.isDeleted !== 1 && i.status === "active")
      .reduce((a, i) => a + investmentTotalContributedPaise(i), 0);
    const assetTotalPaise = bankEstimate + cashInHand + investAssets;
    const netWorthPaise =
      useLedgerKpis
        ? calculateConsolidatedNetWorthPaise(accounts, investments, ledgerEffects, transactions)
        : assetTotalPaise - totalLiabilities;
    const debtToAssetPct =
      assetTotalPaise > 0 ? (100 * totalLiabilities) / assetTotalPaise : 0;
    const bizExpensePaise = sumExpense(curTx.filter((t) => t.businessOrPersonal === "business"));
    const personalExpensePaise = sumExpense(curTx.filter((t) => t.businessOrPersonal === "personal"));
    const taxFlagCount = curTx.filter((t) => t.taxFlag === 1).length;
    const missingBillCount = curTx.filter(
      (t) =>
        t.type === "expense" &&
        t.businessOrPersonal === "business" &&
        t.billAvailable !== 1,
    ).length;

    return {
      totalIncome,
      totalExpense,
      net,
      rate,
      financeKpis,
      calculationSource: financeKpis.source,
      budgetUsage,
      bankEstimate,
      cashInHand,
      emiThisMonth,
      upcomingCCDue,
      totalLiabilities,
      emergencyFund,
      emergencyMonths,
      avg6MoExpense,
      totalGoalTarget,
      totalGoalSaved,
      goalOnTrackPct,
      trend,
      catBreak,
      ccHealth,
      udhariReceivable,
      udhariPayable,
      health,
      survival,
      emergencyIntel,
      smartBgts,
      worstSmartBudget,
      goalsAtRisk,
      netWorthPaise,
      debtToAssetPct,
      bizExpensePaise,
      personalExpensePaise,
      taxFlagCount,
      missingBillCount,
      assetTotalPaise,
      investAssets,
      billsDueCount: survival.breakdown.filter((b) => b.amountPaise > 0).length,
    };
  }, [
    transactions,
    budgets,
    categories,
    accounts,
    cards,
    loans,
    emis,
    udhari,
    goals,
    investments,
    recurringRules,
    ledgerEvents,
    ledgerEffects,
    year,
    month,
    today,
    chartAccessibility,
  ]);

  const topSuggestion = useMemo(() => {
    const now = new Date();
    return aiSuggestions.find(
      (s) => s.status === "active" && !s.isDeleted && new Date(s.expiresAt) >= now,
    );
  }, [aiSuggestions]);

  const messages = useMessages();
  const d = messages.ui.dashboard;
  const kpi = messages.copy.dashboardKpi;
  const greeting = useMemo(() => {
    const h = today.getHours();
    if (h < 12) return messages.dashboard.morning;
    if (h < 17) return messages.dashboard.afternoon;
    return messages.dashboard.evening;
  }, [today, messages]);

  const recentTx = transactions.slice(0, 6);
  const activeAlerts = alerts.filter((a) => !a.dismissed).slice(0, 4);
  const isNewUser =
    transactions.length === 0 &&
    (accounts.length === 0 ||
      categories.filter((c) => c.isDeleted !== 1 && c.archived !== 1).length === 0);

  const drillMonthFrom = startOfMonth(today).toISOString().slice(0, 10);
  const drillMonthTo = endOfMonth(today).toISOString().slice(0, 10);

  function drillCategorySpend(row: (typeof stats.catBreak)[number]) {
    if (row.categoryId === "__others__") {
      setPendingTransactionFilters({
        types: ["expense"],
        dateFrom: drillMonthFrom,
        dateTo: drillMonthTo,
      });
    } else {
      setPendingTransactionFilters({
        types: ["expense"],
        categoryIds: [row.categoryId],
        dateFrom: drillMonthFrom,
        dateTo: drillMonthTo,
      });
    }
    setActive("transactions");
  }

  return (
    <div className="dashboard-print-root space-y-6 print:text-black">
      <PageHeader
        title={`${greeting}, ${user?.displayName?.split(" ")[0] ?? d.there}.`}
        description={`${messages.dashboard.snapshotFor} ${formatDate(today, "MMMM yyyy")}.`}
        actions={
          <>
            <Select value={dashboardMode} onValueChange={(v) => setDashboardMode(v as typeof dashboardMode)}>
              <SelectTrigger className="h-8 w-[130px] text-xs no-print">
                <SelectValue placeholder={d.mode} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="essential">{messages.modes.essential}</SelectItem>
                <SelectItem value="family">{messages.modes.family}</SelectItem>
                <SelectItem value="wealth">{messages.modes.wealth}</SelectItem>
                <SelectItem value="basic">{messages.modes.basic}</SelectItem>
                <SelectItem value="normal">{messages.modes.normal}</SelectItem>
                <SelectItem value="premium">{messages.modes.premium}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setActive("reports")}>
              <TrendingUp className="h-4 w-4" /> {d.reports}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setActive("export")}>
              {d.export}
            </Button>
          </>
        }
      />

      {isNewUser ? (
        <Card className="border-dashed border-primary/40 bg-primary/5">
          <CardHeader>
            <CardTitle>{d.startBasics}</CardTitle>
            <CardDescription>
              {d.startBasicsBody}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setActive("accounts")}>{d.addAccount}</Button>
            <Button size="sm" variant="outline" onClick={() => setActive("categories")}>{d.reviewCategories}</Button>
            <Button size="sm" variant="outline" onClick={() => setActive("transactions")}>{d.addTransaction}</Button>
          </CardContent>
        </Card>
      ) : null}

      {dashboardMode === "basic" ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            icon={<Wallet className="h-4 w-4" />}
            label={kpi.moneyLeft}
            value={formatINR(paiseToRupees(stats.survival.disposableAfterBillsPaise))}
            tone="info"
            explainSpec={{
              title: kpi.moneyLeft,
              formula:
                "Cash in spendable accounts + expected income in window − EMIs, recurring bills, card minimums, goal auto-debits, and udhari payable counted in this window.",
              included: [
                "Cash-style and bank accounts marked spendable in the survival engine",
                "Next recurring income amount if dated within the window",
                "Dated outflows due before that income (or within ~30 days if no income rule)",
              ],
              excluded: [
                "Credit card limits (not treated as cash)",
                "Investment balances unless realized as cash in an account",
              ],
              excludedRecords: [
                {
                  label: "Credit-card bill payments",
                  reason:
                    "Card payment is debt settlement. The expense was recorded when the purchase happened.",
                },
              ],
              sourceEngine: "cashflowSurvivalEngine",
              lastUpdated: today.toISOString(),
              confusionNote:
                "This is a planning snapshot, not your bank’s cleared balance. Pending debits may still post.",
            }}
          />
          <KpiCard
            icon={<IndianRupee className="h-4 w-4" />}
            label={kpi.safeDaily}
            value={`${formatINR(paiseToRupees(stats.survival.safeDailyCorePaise))}/day`}
            tone="income"
            explainSpec={{
              title: kpi.safeDaily,
              formula:
                "(Cash + expected inflow − dated bills excluding informal udhari lump) ÷ days in the window.",
              included: ["EMI, recurring bills, card minimums due in window", "Goal auto-debits scheduled"],
              excluded: ["Informal udhari payable (shown separately so daily spend is not forced to ₹0)"],
            }}
          />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{d.bills}</CardTitle>
              <CardDescription>{d.checklist}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between border-b border-border py-1">
                <span className="text-muted-foreground">{d.billWindow}</span>
                <span className="font-medium tabular-nums">{stats.billsDueCount}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">{d.emiDue}</span>
                <button
                  type="button"
                  className="font-medium tabular-nums text-primary hover:underline"
                  onClick={() => setActive("loans")}
                >
                  {formatINR(paiseToRupees(stats.emiThisMonth))}
                </button>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">{d.cardBalance}</span>
                <button
                  type="button"
                  className="font-medium tabular-nums text-primary hover:underline"
                  onClick={() => setActive("cards")}
                >
                  {formatINR(paiseToRupees(stats.upcomingCCDue))}
                </button>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">{d.udhariOwe}</span>
                <button
                  type="button"
                  className="font-medium tabular-nums text-primary hover:underline"
                  onClick={() => setActive("udhari")}
                >
                  {formatINR(paiseToRupees(stats.udhariPayable))}
                </button>
              </div>
            </CardContent>
          </Card>
          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{d.topSuggestion}</CardTitle>
              <CardDescription>{d.suggestionFrom}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm">
              {topSuggestion ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-medium">{topSuggestion.title}</div>
                    <p className="mt-1 text-muted-foreground">{topSuggestion.reason}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setActive("suggestions")}>
                    Open suggestions
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No active suggestions yet.{" "}
                  <button
                    type="button"
                    className="text-primary underline-offset-4 hover:underline"
                    onClick={() => setActive("suggestions")}
                  >
                    Refresh suggestions
                  </button>
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard
            icon={<ArrowUpRight className="h-4 w-4" />}
            label={kpi.trueIncome}
            value={formatINR(paiseToRupees(stats.totalIncome))}
            tone="income"
            onClick={() => setActive("income")}
            explainSpec={{
              title: kpi.trueIncomeTitle,
              formula:
                "Sum of genuine income effects from the ledger (salary, business, interest, etc.).",
              included: ["Income-category ledger effects dated this month"],
              excluded: [
                "Purchase refunds — treated as contra-expense, not income",
                "Loan proceeds, transfers, udhari repayments, investment redemptions",
              ],
              sourceEngine: stats.calculationSource === "ledger" ? "financeKpiEngine" : "calculations.sumIncome",
              lastUpdated: today.toISOString(),
            }}
          />
          <KpiCard
            icon={<ArrowDownRight className="h-4 w-4" />}
            label={kpi.consumption}
            value={formatINR(paiseToRupees(stats.totalExpense))}
            tone="expense"
            onClick={() => setActive("expenses")}
            explainSpec={{
              title: kpi.consumptionTitle,
              formula:
                "Sum of expense-category ledger effects (purchases, interest, fees, bad debt).",
              included: ["Recorded consumption and financing charges dated this month"],
              excluded: [
                "Credit-card bill payments — debt settlement only",
                "Loan principal repayment, transfers, investments, savings moves",
              ],
              excludedRecords: [
                {
                  label: "Credit-card bill payments",
                  reason:
                    "Card payment is debt settlement. The expense was recorded when the purchase happened.",
                },
              ],
              sourceEngine: stats.calculationSource === "ledger" ? "financeKpiEngine" : "calculations.sumExpense",
              lastUpdated: today.toISOString(),
            }}
          />
          <KpiCard
            icon={<PiggyBank className="h-4 w-4" />}
            label={kpi.surplus}
            value={formatINR(paiseToRupees(stats.net))}
            tone={stats.net >= 0 ? "income" : "expense"}
            sub={`${formatPercent(stats.rate)} of true income`}
            explainSpec={{
              title: kpi.surplus,
              formula: "True income − consumption expense. Money generated before reallocating among assets and liabilities.",
              included: ["Genuine income minus consumption and financing charges in P&L view"],
              excluded: ["Transfers, principal repayments, and asset moves — see net liquid change"],
            }}
          />
          <KpiCard
            icon={<Wallet className="h-4 w-4" />}
            label={kpi.bankCash}
            value={formatINRCompact(paiseToRupees(stats.bankEstimate + stats.cashInHand))}
            tone="info"
            sub={`Cash ${formatINRCompact(paiseToRupees(stats.cashInHand))}`}
            onClick={() => setActive("accounts")}
            explainSpec={{
              title: kpi.bankCash,
              formula:
                "Sum of derived balances for non-cash spendable account types + cash-type accounts, from posted transactions.",
              included: ["Bank, UPI wallet, savings, current, etc. per account rules"],
              excluded: ["Credit card limits; credit balances use liability engine elsewhere"],
            }}
          />
        </div>
      )}

      {(dashboardMode === "essential" || dashboardMode === "family" || dashboardMode === "basic") && (
        <PaydayCashflowPanel
          liquidAvailablePaise={stats.bankEstimate + stats.cashInHand}
          reliableExpectedIncomePaise={0}
          committedOutflowsPaise={Math.max(0, stats.survival.cashAvailablePaise - stats.survival.disposableAfterBillsPaise)}
          safetyBufferPaise={Math.max(0, Math.round((stats.bankEstimate + stats.cashInHand) * 0.1))}
          daysUntilHorizon={Math.max(1, stats.survival.daysUntilNextIncome || 30)}
          onOpenBills={() => setActive("bill-calendar")}
        />
      )}

      {personalDashboardSections(dashboardMode).includes("essentials") ? (
        <Card>
          <CardHeader>
            <CardTitle>{messages.modes.essential}</CardTitle>
            <CardDescription>{d.essentialBody}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs text-muted-foreground">{messages.dashboard.bankAndCash}</div>
              <div className="text-lg font-semibold">{formatINR(paiseToRupees(stats.bankEstimate + stats.cashInHand))}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{d.moneyLeft}</div>
              <div className="text-lg font-semibold">{formatINR(paiseToRupees(stats.survival.disposableAfterBillsPaise))}</div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {personalDashboardSections(dashboardMode).includes("family") ? (
        <Card>
          <CardHeader>
            <CardTitle>{messages.modes.family}</CardTitle>
            <CardDescription>{d.familyBody}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-lg font-semibold">
              {formatINR(paiseToRupees(sharedFamilyKpis(transactions).surplusPaise))} surplus
            </div>
            <Button variant="outline" size="sm" onClick={() => setActive("household")}>{d.openHousehold}</Button>
          </CardContent>
        </Card>
      ) : null}

      {personalDashboardSections(dashboardMode).includes("wealth") ? (
        <Card>
          <CardHeader>
            <CardTitle>{messages.modes.wealth}</CardTitle>
            <CardDescription>
              {d.wealthBody}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs text-muted-foreground">{d.netWorth}</div>
              <div className="text-lg font-semibold">{formatINR(paiseToRupees(stats.netWorthPaise))}</div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setActive("savings")}>{d.openWealth}</Button>
          </CardContent>
        </Card>
      ) : null}

      {dashboardMode === "premium" ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 print:grid-cols-2">
          <KpiCard
            icon={<ShieldCheck className="h-4 w-4" />}
            label={kpi.netWorth}
            value={formatINRCompact(paiseToRupees(stats.netWorthPaise))}
            tone={stats.netWorthPaise >= 0 ? "income" : "expense"}
            explainSpec={{
              title: "Approximate net worth",
              formula: "(Bank & cash-style balances + active investment contributions tracked) − (loan principal outstanding + card liability).",
              included: ["Liquid-style accounts", "Recorded investment contributions", "Outstanding loan principal", "Card outstanding"],
              excluded: ["Property, vehicles, and assets not modeled in SparowVault"],
              confusionNote: "This is a working-stiff snapshot from ledger data, not a full balance sheet.",
            }}
          />
          <KpiCard
            icon={<CreditCard className="h-4 w-4" />}
            label={kpi.debtAssets}
            value={formatPercent(stats.debtToAssetPct, 0)}
            tone={stats.debtToAssetPct > 60 ? "expense" : "info"}
            explainSpec={{
              title: kpi.debtAssetsTitle,
              formula: "(Total liabilities ÷ max(total assets,1)) × 100.",
              included: ["Loan outstanding principal", "Credit card outstanding"],
              excluded: ["Informal udhari in headline assets unless included elsewhere"],
            }}
          />
          <KpiCard
            icon={<AlertCircle className="h-4 w-4" />}
            label={kpi.taxRows}
            value={String(stats.taxFlagCount)}
            tone="warning"
            explainSpec={{
              title: kpi.taxRowsTitle,
              formula: "Count of transactions in this month with taxFlag = yes.",
              included: ["Rows you marked tax-relevant"],
              excluded: ["Business expenses without tax flag"],
            }}
          />
          <KpiCard
            icon={<Banknote className="h-4 w-4" />}
            label={kpi.businessPersonal}
            value={`${formatINRCompact(paiseToRupees(stats.bizExpensePaise))} / ${formatINRCompact(paiseToRupees(stats.personalExpensePaise))}`}
            tone="info"
            sub={`Missing bills (biz): ${stats.missingBillCount}`}
            explainSpec={{
              title: kpi.businessPersonalTitle,
              formula: "Separate sums of expense transactions tagged business vs personal this month.",
              included: ["Expense type rows with matching tag"],
              excluded: ["Mixed tag split 50/50 — here counted only when explicitly personal or business"],
            }}
          />
        </div>
      ) : null}

      {/* Phase 10 — survival, emergency, smart budget, goal risk */}
      {dashboardMode === "family" ? (
        <Card>
          <CardHeader>
            <CardTitle>{messages.modes.family}</CardTitle>
            <CardDescription>{d.familyShared}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="sm" onClick={() => setActive("household")}>{d.openHousehold}</Button>
          </CardContent>
        </Card>
      ) : null}

      {dashboardMode === "wealth" ? (
        <Card>
          <CardHeader>
            <CardTitle>{messages.modes.wealth}</CardTitle>
            <CardDescription>{d.wealthSeparate}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="sm" onClick={() => setActive("savings")}>{d.openSavings}</Button>
          </CardContent>
        </Card>
      ) : null}

      {dashboardMode !== "basic" && dashboardMode !== "essential" ? (
      <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{d.survival}</CardTitle>
            <CardDescription>{d.survivalBody}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-surface-2 p-3">
                <div className="text-xs text-muted-foreground">{d.headroom}</div>
                <div className="text-lg font-semibold tabular-nums text-income">
                  {formatINR(paiseToRupees(stats.survival.disposableAfterBillsPaise))}
                </div>
              </div>
              <div className="rounded-lg bg-surface-2 p-3">
                <div className="text-xs text-muted-foreground">{d.daysWindow}</div>
                <div className="text-lg font-semibold tabular-nums">
                  {stats.survival.daysUntilNextIncome}
                </div>
              </div>
              <div className="rounded-lg bg-surface-2 p-3">
                <div className="text-xs text-muted-foreground">{d.safeDay}</div>
                <div className="text-lg font-semibold tabular-nums text-primary">
                  {formatINR(paiseToRupees(stats.survival.safeDailySpendPaise))}
                </div>
                {stats.survival.udhariPayablePaise > 0 ? (
                  <div className="mt-1 text-[10px] leading-tight text-muted-foreground">
                    Core (excl. udhari):{" "}
                    {formatINR(paiseToRupees(stats.survival.safeDailyCorePaise))}/day
                  </div>
                ) : null}
              </div>
              <div className="rounded-lg bg-surface-2 p-3">
                <div className="text-xs text-muted-foreground">{d.cashBank}</div>
                <div className="text-lg font-semibold tabular-nums">
                  {formatINRCompact(paiseToRupees(stats.survival.cashAvailablePaise))}
                </div>
              </div>
            </div>
            {stats.survival.breakdown.length > 0 ? (
              <div>
                <div className="mb-1 text-xs font-medium text-muted-foreground">{d.billsWindow}</div>
                <ul className="max-h-28 space-y-1 overflow-y-auto text-xs">
                  {stats.survival.breakdown.slice(0, 6).map((b, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span className="truncate">{b.label}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {formatINRCompact(paiseToRupees(b.amountPaise))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="text-xs leading-relaxed text-muted-foreground">
              {stats.survival.narrativeLines[0]}
            </p>
            {stats.survival.narrativeLines.slice(1).map((line, i) => (
              <p key={i} className="text-xs leading-relaxed text-muted-foreground">
                {line}
              </p>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{d.safety}</CardTitle>
            <CardDescription>{d.safetyBody}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-muted-foreground">{d.emergency}</span>
                <Badge
                  variant={
                    stats.emergencyIntel.monthsCovered >= 6
                      ? "success"
                      : stats.emergencyIntel.monthsCovered >= 3
                        ? "warning"
                        : "danger"
                  }
                >
                  {stats.emergencyIntel.monthsCovered.toFixed(1)} mo covered
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Essentials ≈ {formatINRCompact(paiseToRupees(stats.emergencyIntel.monthlyEssentialPaise))}
                /mo · Fund {formatINRCompact(paiseToRupees(stats.emergencyIntel.emergencyFundAvailablePaise))}
                {stats.emergencyIntel.shortfallVsTargetPaise > 0 ? (
                  <span className="text-expense">
                    {" "}
                    · Short {formatINRCompact(paiseToRupees(stats.emergencyIntel.shortfallVsTargetPaise))} to{" "}
                    {stats.emergencyIntel.targetMonths} mo target
                  </span>
                ) : null}
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-muted-foreground">{d.budgetPace}</span>
                {stats.worstSmartBudget ? (
                  <Badge
                    variant={
                      stats.worstSmartBudget.burnRisk === "high"
                        ? "danger"
                        : stats.worstSmartBudget.burnRisk === "watch"
                          ? "warning"
                          : "outline"
                    }
                  >
                    {stats.worstSmartBudget.burnRisk}
                  </Badge>
                ) : null}
              </div>
              {stats.worstSmartBudget ? (
                <div className="text-xs text-muted-foreground">
                  {categories.find((c) => c.id === stats.worstSmartBudget.budget.categoryId)?.name ??
                    "Category"}
                  : {stats.worstSmartBudget.percentUsed.toFixed(0)}% used vs{" "}
                  {stats.worstSmartBudget.dayProgressPct.toFixed(0)}% of month elapsed (time ratio{" "}
                  {stats.worstSmartBudget.usageVsTimeRatio.toFixed(2)}×)
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">{d.noBudgets}</div>
              )}
            </div>
            <div>
              <div className="mb-1 text-muted-foreground">{d.goalRisk}</div>
              {stats.goalsAtRisk.length === 0 ? (
                <div className="text-xs text-success">{d.goalsOnPace}</div>
              ) : (
                <ul className="space-y-1 text-xs">
                  {stats.goalsAtRisk.map((g) => (
                    <li key={g.goalId} className="flex justify-between gap-2">
                      <span className="truncate font-medium">{g.title}</span>
                      <span className="shrink-0 text-warning">{g.onTrackStatus}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={() => setActive("goals")}>
              Open goals <ArrowRight className="h-3 w-3" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Health score + Trend */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <HealthCard breakdown={stats.health} />
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>{d.incomeExpense}</CardTitle>
              <CardDescription>{d.last6}</CardDescription>
            </div>
            <Badge variant="info">
              Avg exp/mo: {formatINRCompact(paiseToRupees(stats.avg6MoExpense))}
            </Badge>
          </CardHeader>
          <CardContent>
            <SafeChart className="h-[260px] min-w-0 w-full">
              {({ width, height }) => (
                <AreaChart width={width} height={height} data={stats.trend}>
                  <defs>
                    <linearGradient id="incomeG" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="hsl(var(--income))"
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="100%"
                        stopColor="hsl(var(--income))"
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient id="expenseG" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="hsl(var(--expense))"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="100%"
                        stopColor="hsl(var(--expense))"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="label"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatINRCompact(Number(v), false)}
                  />
                  <Tooltip
                    cursor={{ stroke: "hsl(var(--border))" }}
                    formatter={(v) => formatINR(Number(v))}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="hsl(var(--income))"
                    fill="url(#incomeG)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stroke="hsl(var(--expense))"
                    fill="url(#expenseG)"
                    strokeWidth={2}
                  />
                </AreaChart>
              )}
            </SafeChart>
          </CardContent>
        </Card>
      </div>
      </>
      ) : null}

      {/* Next due / Budgets / Category */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{d.upcoming}</CardTitle>
            <CardDescription>{d.upcomingBody}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <DueRow
              icon={<Banknote className="h-4 w-4" />}
              label={kpi.emiMonth}
              value={formatINR(paiseToRupees(stats.emiThisMonth))}
              onClick={() => setActive("loans")}
            />
            <DueRow
              icon={<CreditCard className="h-4 w-4" />}
              label={kpi.cardDue}
              value={formatINR(paiseToRupees(stats.upcomingCCDue))}
              sub={
                stats.ccHealth[0]?.nextDueDate
                  ? formatRelativeDue(stats.ccHealth[0].nextDueDate)
                  : undefined
              }
              onClick={() => setActive("cards")}
            />
            <DueRow
              icon={<IndianRupee className="h-4 w-4" />}
              label={kpi.udhariIn}
              value={formatINR(paiseToRupees(stats.udhariReceivable))}
              onClick={() => setActive("udhari")}
            />
            <DueRow
              icon={<IndianRupee className="h-4 w-4" />}
              label={kpi.udhariOut}
              value={formatINR(paiseToRupees(stats.udhariPayable))}
              onClick={() => setActive("udhari")}
            />
            <DueRow
              icon={<AlertCircle className="h-4 w-4" />}
              label={kpi.liabilities}
              value={formatINR(paiseToRupees(stats.totalLiabilities))}
              tone="warning"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>{d.topSpend}</CardTitle>
              <CardDescription>{d.thisMonth}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setActive("reports")}>
              View all <ArrowRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            {stats.catBreak.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No spending yet this month
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <p className="text-[11px] text-muted-foreground no-print">
                  Tap a slice to open this month&apos;s matching expenses.
                </p>
                <div className="flex items-center gap-3">
                <SafeChart className="h-[160px] min-w-0 w-[160px]">
                  {({ width, height }) => (
                    <PieChart width={width} height={height}>
                      <Pie
                        data={stats.catBreak}
                        dataKey="amount"
                        nameKey="categoryName"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                        stroke="hsl(var(--card))"
                        cursor="pointer"
                        onClick={(e) => {
                          const row = e?.payload as (typeof stats.catBreak)[number] | undefined;
                          if (row) drillCategorySpend(row);
                        }}
                      >
                        {stats.catBreak.map((d, i) => (
                          <Cell key={i} fill={d.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatINR(Number(v))} />
                    </PieChart>
                  )}
                </SafeChart>
                <div className="flex-1 space-y-1.5">
                  {stats.catBreak.map((c) => (
                    <button
                      type="button"
                      key={c.categoryId}
                      className="no-print flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-left text-xs hover:bg-surface-2"
                      onClick={() => drillCategorySpend(c)}
                    >
                      <span className="text-base leading-none">{c.icon}</span>
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="min-w-0 flex-1 truncate font-medium">{c.categoryName}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {formatINR(c.amount, { decimals: 0 })}
                      </span>
                      <span className="shrink-0 tabular-nums">{formatPercent(c.percent, 0)}</span>
                    </button>
                  ))}
                </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>{d.goalProgress}</CardTitle>
              <CardDescription>
                {formatINRCompact(paiseToRupees(stats.totalGoalSaved))} of{" "}
                {formatINRCompact(paiseToRupees(stats.totalGoalTarget))}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setActive("goals")}>
              View <ArrowRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {goals.slice(0, 4).map((g) => {
              const pct = Math.min(
                100,
                (goalSavedPaise(g) / Math.max(1, goalTargetPaise(g))) * 100,
              );
              return (
                <div key={g.id}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium">
                      {g.icon} {g.title}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatPercent(pct, 0)}
                    </span>
                  </div>
                  <Progress value={pct} tone="goal" height={6} />
                </div>
              );
            })}
            {goals.length === 0 ? (
              <div className="py-2 text-center text-sm text-muted-foreground">
                No goals yet.{" "}
                <button
                  onClick={() => setActive("goals")}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Create one
                </button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Budgets + Trend bar + Alerts + Recent */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>{d.budgetUsage}</CardTitle>
              <CardDescription>
                {stats.budgetUsage > 0
                  ? `${formatPercent(stats.budgetUsage, 0)} used overall`
                  : "No active budgets"}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setActive("budgets")}>
              Manage <ArrowRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <BudgetList />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{d.alerts}</CardTitle>
            <CardDescription>{d.alertsBody}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeAlerts.length === 0 ? (
              <div className="flex items-center gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-income" />
                Nothing urgent — you're on track.
              </div>
            ) : (
              activeAlerts.map((a) => (
                <div
                  key={a.id}
                  className={cn(
                    "rounded-md border-l-4 p-3 text-sm",
                    a.severity === "danger" &&
                      "border-l-danger bg-expense-soft",
                    a.severity === "warning" &&
                      "border-l-warning bg-warning-soft",
                    a.severity === "info" &&
                      "border-l-info bg-info-soft",
                    a.severity === "success" &&
                      "border-l-income bg-income-soft",
                  )}
                >
                  <div className="font-medium">{a.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.message}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>{d.recent}</CardTitle>
              <CardDescription>{d.recentBody}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setActive("transactions")}>
              View all <ArrowRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {recentTx.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No transactions yet.
                </div>
              ) : (
                recentTx.map((t) => {
                  const cat = categories.find((c) => c.id === t.categoryId);
                  const isCashIn =
                    t.type === "income" ||
                    t.type === "refund" ||
                    t.type === "udhari_received" ||
                    t.type === "loan_disbursement" ||
                    t.type === "udhari_collect";
                  return (
                    <div key={t.id} className="flex items-center gap-3 py-2.5">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base"
                        style={{ backgroundColor: (cat?.color ?? "#64748b") + "22" }}
                      >
                        {cat?.icon ?? "💳"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {t.merchantOrPerson || t.description || cat?.name || "Transaction"}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {formatDate(t.date, "dd MMM")} • {cat?.name ?? "—"} •{" "}
                          {t.paymentMode}
                        </div>
                      </div>
                      <div
                        className={cn(
                          "tabular-nums text-sm font-semibold",
                          isCashIn ? "text-income" : "text-expense",
                        )}
                      >
                        {isCashIn ? "+" : "−"}
                        {formatINR(paiseToRupees(transactionAmountPaise(t)))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  tone = "info",
  onClick,
  explainSpec,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone?: "income" | "expense" | "info" | "warning" | "goal";
  onClick?: () => void;
  explainSpec?: ExplainMetricSpec;
}) {
  const [exOpen, setExOpen] = useState(false);
  const toneCls =
    tone === "income"
      ? "text-income bg-income-soft"
      : tone === "expense"
        ? "text-expense bg-expense-soft"
        : tone === "warning"
          ? "text-warning bg-warning-soft"
          : tone === "goal"
            ? "text-goal bg-goal-soft"
            : "text-info bg-info-soft";
  return (
    <Card
      className={cn(
        "relative transition-all",
        onClick && "cursor-pointer hover:shadow-(--shadow-elevated)",
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            {label}
          </span>
          <div className="flex items-center gap-0.5">
            {explainSpec ? (
              <div onClick={(e) => e.stopPropagation()}>
                <ExplainMetricTrigger spec={explainSpec} open={exOpen} onOpenChange={setExOpen} />
              </div>
            ) : null}
            <span
              className={cn("flex h-7 w-7 items-center justify-center rounded-md", toneCls)}
            >
              {icon}
            </span>
          </div>
        </div>
        <div className="text-lg font-semibold tabular-nums md:text-xl">{value}</div>
        {sub ? (
          <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function DueRow({
  icon,
  label,
  value,
  sub,
  onClick,
  tone = "info",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub?: string;
  onClick?: () => void;
  tone?: "info" | "warning" | "expense";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-md border border-border p-2.5 text-left transition-colors",
        onClick ? "hover:bg-surface-2" : "cursor-default",
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-md",
          tone === "warning"
            ? "bg-warning-soft text-warning"
            : tone === "expense"
              ? "bg-expense-soft text-expense"
              : "bg-info-soft text-info",
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="truncate text-sm font-semibold tabular-nums">{value}</div>
        {sub ? (
          <div className="text-[11px] text-muted-foreground">{sub}</div>
        ) : null}
      </div>
    </button>
  );
}

function HealthCard({
  breakdown,
}: {
  breakdown: ReturnType<typeof computeFinancialHealth>;
}) {
  const d = useMessages().ui.dashboard;
  const tone =
    breakdown.total >= 70
      ? "income"
      : breakdown.total >= 55
        ? "info"
        : breakdown.total >= 40
          ? "warning"
          : "expense";
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          {d.health}
        </CardTitle>
        <CardDescription>{d.healthBody}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-4xl font-bold tabular-nums">{breakdown.total}</div>
            <Badge variant={tone} className="mt-1">
              {breakdown.grade}
            </Badge>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            out of 100
          </div>
        </div>
        <SafeChart className="mt-4 h-[110px] min-w-0">
          {({ width, height }) => (
            <BarChart
              width={width}
              height={height}
              data={[
                { k: "Savings", v: breakdown.savings, m: 22 },
                { k: "Overdue", v: breakdown.overdue, m: 14 },
                { k: "Card used", v: breakdown.creditUtilization, m: 14 },
                { k: "Budget", v: breakdown.budgetDiscipline, m: 14 },
                { k: "Goals", v: breakdown.goals, m: 12 },
                { k: "EmFund", v: breakdown.emergencyFund, m: 14 },
                { k: "DTI", v: breakdown.debtToIncome, m: 10 },
              ]}
              margin={{ top: 6, bottom: 0, left: 0, right: 0 }}
            >
              <XAxis
                dataKey="k"
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                interval={0}
              />
              <Tooltip />
              <Bar dataKey="m" fill="hsl(var(--surface-3))" radius={3} />
              <Bar dataKey="v" fill="hsl(var(--primary))" radius={3} />
              <Legend wrapperStyle={{ display: "none" }} />
            </BarChart>
          )}
        </SafeChart>
      </CardContent>
    </Card>
  );
}

function BudgetList() {
  const setActive = useNavStore((s) => s.setActive);
  const budgets = useDataStore((s) => s.budgets);
  const txs = useDataStore((s) => s.transactions);
  const categories = useDataStore((s) => s.categories);
  const today = useMemo(() => new Date(), []);
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const bgts = useMemo(() => {
    const activeBudgets = budgets.filter((b) =>
      b.period === "monthly"
        ? b.year === year && b.month === month
        : b.year === year,
    );
    return budgetStatuses(activeBudgets, txs, today);
  }, [budgets, txs, today, year, month]);
  if (bgts.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        No active budgets.{" "}
        <button
          onClick={() => setActive("budgets")}
          className="text-primary underline-offset-4 hover:underline"
        >
          Create one
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {bgts.slice(0, 6).map((b) => {
        const cat = categories.find((c) => c.id === b.budget.categoryId);
        const tone: "income" | "warning" | "expense" | "goal" =
          b.level === "over"
            ? "expense"
            : b.level === "warning"
              ? "warning"
              : b.level === "watch"
                ? "goal"
                : "income";
        return (
          <div key={b.budget.id}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium">
                {cat?.icon ?? "🧾"} {cat?.name ?? "Category"}
              </span>
              <span className="text-muted-foreground tabular-nums">
                {formatINR(paiseToRupees(b.spentPaise), { decimals: 0 })} /{" "}
                {formatINR(paiseToRupees(budgetLimitPaise(b.budget)), { decimals: 0 })}
              </span>
            </div>
            <Progress
              value={Math.min(100, b.percentUsed)}
              tone={tone === "income" ? "income" : tone === "warning" ? "warning" : tone === "expense" ? "expense" : "goal"}
              height={6}
            />
          </div>
        );
      })}
    </div>
  );
}
