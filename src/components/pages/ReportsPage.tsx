import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/Table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { useDataStore } from "@/store/dataStore";
import { useAuthStore } from "@/store/authStore";
import {
  categoryBreakdown,
  filterByMonth,
  monthlyTrend,
  summarizeLoan,
  sumExpense,
  sumIncome,
} from "@/services/calculations";
import {
  calculateExpenseView,
  calculateLedgerMonthKpis,
  hasUsableLedger,
} from "@/services/ledgerCalculations";
import {
  diagnoseLedgerCoverage,
  ledgerDiagnosticTotal,
} from "@/services/ledgerDiagnostics";
import { explainCategorySpend } from "@/services/financeLedgerExplain";
import { formatINR, formatPercent } from "@/lib/format";
import {
  cardCreditLimitPaise,
  paiseToRupees,
  transactionAmountPaise,
} from "@/utils/money";
import {
  AreaChart,
  Area,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { Download } from "lucide-react";
import { exportModuleToSheet, buildCAWorkbook, downloadBuffer } from "@/exports/xlsxExporter";
import { SafeChart } from "@/components/charts/SafeChart";
import { useCloudAppStore } from "@/store/cloudAppStore";
import { buildCashflowSurvivalReport } from "@/services/cashflowSurvivalEngine";
import { buildEmergencyFundIntel } from "@/services/emergencyFundEngine";

export function ReportsPage() {
  const user = useAuthStore((s) => s.currentUser);
  const effectiveFeatures = useCloudAppStore((s) => s.effectiveFeatures);
  const transactions = useDataStore((s) => s.transactions);
  const categories = useDataStore((s) => s.categories);
  const cards = useDataStore((s) => s.cards);
  const loans = useDataStore((s) => s.loans);
  const emis = useDataStore((s) => s.emis);
  const ledgerEvents = useDataStore((s) => s.ledgerEvents);
  const ledgerEffects = useDataStore((s) => s.ledgerEffects);
  const [monthsBack, setMonthsBack] = useState<number>(6);

  const accounts = useDataStore((s) => s.accounts);
  const recurringRules = useDataStore((s) => s.recurringRules);
  const goals = useDataStore((s) => s.goals);
  const goalContribs = useDataStore((s) => s.goalContribs);
  const budgets = useDataStore((s) => s.budgets);
  const savingsContribs = useDataStore((s) => s.savingsContribs);
  const udhari = useDataStore((s) => s.udhari);
  const investments = useDataStore((s) => s.investments);

  const today = useMemo(() => new Date(), []);
  const useLedgerViews = hasUsableLedger(ledgerEvents, ledgerEffects);
  const trendRaw = useMemo(() => {
    const transactionTrend = monthlyTrend(transactions, monthsBack, today);
    if (!useLedgerViews) return transactionTrend;
    return transactionTrend.map((r) => {
      const [yearText, monthText] = r.monthKey.split("-");
      const kpi = calculateLedgerMonthKpis(
        ledgerEvents,
        ledgerEffects,
        Number(yearText),
        Number(monthText),
      );
      return {
        ...r,
        incomePaise: kpi.incomePaise,
        expensePaise: kpi.expensePaise,
        netPaise: kpi.netPaise,
      };
    });
  }, [transactions, monthsBack, today, useLedgerViews, ledgerEvents, ledgerEffects]);
  const trend = useMemo(
    () =>
      trendRaw.map((r) => ({
        ...r,
        income: paiseToRupees(r.incomePaise),
        expense: paiseToRupees(r.expensePaise),
        net: paiseToRupees(r.netPaise),
      })),
    [trendRaw],
  );

  const thisMonth = useMemo(
    () => filterByMonth(transactions, today.getFullYear(), today.getMonth() + 1),
    [transactions, today],
  );
  const lastMonthDate = useMemo(
    () => new Date(today.getFullYear(), today.getMonth() - 1, 1),
    [today],
  );
  const lastMonth = useMemo(
    () =>
      filterByMonth(transactions, lastMonthDate.getFullYear(), lastMonthDate.getMonth() + 1),
    [transactions, lastMonthDate],
  );

  const catBreakdownRaw = useMemo(
    () => categoryBreakdown(thisMonth, categories).slice(0, 10),
    [thisMonth, categories],
  );
  const catBreakdown = useMemo(
    () =>
      catBreakdownRaw.map((c) => ({
        ...c,
        amount: paiseToRupees(c.amountPaise),
      })),
    [catBreakdownRaw],
  );

  // Top merchants
  const merchantMap = new Map<string, number>();
  for (const t of thisMonth.filter((t) => t.type === "expense")) {
    if (!t.merchantOrPerson) continue;
    merchantMap.set(
      t.merchantOrPerson,
      (merchantMap.get(t.merchantOrPerson) ?? 0) + transactionAmountPaise(t),
    );
  }
  const topMerchants = Array.from(merchantMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Need vs Want
  const needWant = thisMonth
    .filter((t) => t.type === "expense")
    .reduce(
      (acc, t) => {
        if (t.needWant === "need") acc.need += transactionAmountPaise(t);
        else if (t.needWant === "want" || t.needWant === "luxury") acc.want += transactionAmountPaise(t);
        else acc.unassigned += transactionAmountPaise(t);
        return acc;
      },
      { need: 0, want: 0, unassigned: 0 },
    );

  // Fixed vs Variable
  const fixedVar = thisMonth
    .filter((t) => t.type === "expense")
    .reduce(
      (acc, t) => {
        if (t.fixedVariable === "fixed") acc.fixed += transactionAmountPaise(t);
        else if (t.fixedVariable === "variable") acc.variable += transactionAmountPaise(t);
        else acc.unassigned += transactionAmountPaise(t);
        return acc;
      },
      { fixed: 0, variable: 0, unassigned: 0 },
    );

  // Payment mode split
  const modeMap = new Map<string, number>();
  for (const t of thisMonth.filter((t) => t.type === "expense")) {
    modeMap.set(t.paymentMode, (modeMap.get(t.paymentMode) ?? 0) + transactionAmountPaise(t));
  }
  const modeData = Array.from(modeMap.entries()).map(([mode, amountPaise]) => ({
    mode,
    amount: paiseToRupees(amountPaise),
  }));

  // Year over year
  const years = Array.from(
    new Set([
      ...transactions.map((t) => t.date.slice(0, 4)),
      ...ledgerEvents.map((e) => e.eventDate.slice(0, 4)),
    ]),
  ).sort();
  const yoy = years.map((y) => {
    const yt = transactions.filter((t) => t.date.startsWith(y));
    let inc = sumIncome(yt);
    let exp = sumExpense(yt);
    if (useLedgerViews) {
      inc = 0;
      exp = 0;
      for (let monthNo = 1; monthNo <= 12; monthNo += 1) {
        const kpi = calculateLedgerMonthKpis(ledgerEvents, ledgerEffects, Number(y), monthNo);
        inc += kpi.incomePaise;
        exp += kpi.expensePaise;
      }
    }
    return {
      year: y,
      income: paiseToRupees(inc),
      expense: paiseToRupees(exp),
      savings: paiseToRupees(inc - exp),
    };
  });

  const thisLedgerKpi = calculateLedgerMonthKpis(
    ledgerEvents,
    ledgerEffects,
    today.getFullYear(),
    today.getMonth() + 1,
  );
  const lastLedgerKpi = calculateLedgerMonthKpis(
    ledgerEvents,
    ledgerEffects,
    lastMonthDate.getFullYear(),
    lastMonthDate.getMonth() + 1,
  );
  const mom = {
    thisIncome: useLedgerViews ? thisLedgerKpi.incomePaise : sumIncome(thisMonth),
    thisExpense: useLedgerViews ? thisLedgerKpi.expensePaise : sumExpense(thisMonth),
    lastIncome: useLedgerViews ? lastLedgerKpi.incomePaise : sumIncome(lastMonth),
    lastExpense: useLedgerViews ? lastLedgerKpi.expensePaise : sumExpense(lastMonth),
  };
  const incomeChange =
    mom.lastIncome > 0 ? ((mom.thisIncome - mom.lastIncome) / mom.lastIncome) * 100 : 0;
  const expenseChange =
    mom.lastExpense > 0
      ? ((mom.thisExpense - mom.lastExpense) / mom.lastExpense) * 100
      : 0;

  const ledgerExpenseThisMonth = useMemo(() => {
    const y = today.getFullYear();
    const m = today.getMonth() + 1;
    return calculateExpenseView(ledgerEvents, ledgerEffects, y, m);
  }, [ledgerEvents, ledgerEffects, today]);

  const ledgerExplainTopCategory = useMemo(() => {
    const top = catBreakdownRaw[0];
    if (!top) return null;
    return explainCategorySpend(
      top.categoryId,
      today.getFullYear(),
      today.getMonth() + 1,
      transactions,
      ledgerEvents,
      ledgerEffects,
    );
  }, [catBreakdownRaw, transactions, ledgerEvents, ledgerEffects, today]);

  const resilience = useMemo(() => {
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
    const emergency = buildEmergencyFundIntel(
      transactions,
      categories,
      investments,
      goals,
      today,
    );
    return { survival, emergency };
  }, [
    accounts,
    transactions,
    recurringRules,
    loans,
    emis,
    cards,
    goals,
    udhari,
    investments,
    categories,
    ledgerEffects,
    today,
  ]);

  const ledgerDiagnostics = useMemo(() => {
    if (!user) return null;
    return diagnoseLedgerCoverage({
      userId: user.id,
      transactions,
      events: ledgerEvents,
      effects: ledgerEffects,
      accounts,
      cards,
      loans,
      goals,
      investments,
      udhari,
      categories,
    });
  }, [
    user,
    transactions,
    ledgerEvents,
    ledgerEffects,
    accounts,
    cards,
    loans,
    goals,
    investments,
    udhari,
    categories,
  ]);

  if (effectiveFeatures.advanced_reports === false) {
    return (
      <div>
        <PageHeader title="Reports & Analytics" description="Upgrade plan to unlock advanced reports." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        description="Deep insights into your money flows, trends, and ratios."
        actions={
          <Select
            value={String(monthsBack)}
            onValueChange={(v) => setMonthsBack(+v)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Last 3 months</SelectItem>
              <SelectItem value="6">Last 6 months</SelectItem>
              <SelectItem value="12">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <Card className="mb-4 print:border print:shadow-none">
        <CardHeader>
          <CardTitle>Report library</CardTitle>
          <CardDescription>
            Everyday summaries vs chartered-accountant exports. Cashflow, expense totals, and net worth are
            separate lenses — do not mix card payments into expense totals when reconciling GST.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm md:grid-cols-2">
          <div className="space-y-2 rounded-lg border border-border p-3">
            <div className="font-medium">Normal reports (in app)</div>
            <ul className="list-inside list-disc text-muted-foreground">
              <li>Where money went — category &amp; merchant tables below</li>
              <li>Money left — resilience card (safe daily / emergency)</li>
              <li>Bills coming — matches survival breakdown on dashboard</li>
              <li>Debt summary — loan &amp; card sections in this page</li>
              <li>Goals &amp; udhari — goal widgets + informal lending tables</li>
            </ul>
          </div>
          <div className="space-y-3 rounded-lg border border-border p-3">
            <div className="font-medium">CA workbook (Excel)</div>
            <p className="text-xs text-muted-foreground">
              Includes transaction master, monthly cashflow, category ledger, account ledger, registers,
              amortization per loan, interest paid, business/personal split, GST/tax flags, and bills-missing.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                const { buffer, filename } = buildCAWorkbook({
                  transactions,
                  categories,
                  accounts,
                  cards,
                  budgets,
                  goals,
                  goalContribs,
                  loans,
                  emis,
                  udhari,
                  investments,
                  savingsContribs,
                });
                downloadBuffer(buffer, filename);
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Download CA workbook
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Cashflow &amp; resilience (Phase 10)</CardTitle>
          <CardDescription>Survival window, emergency runway vs essentials — same engine as the dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <div className="rounded-lg bg-surface-2 p-3">
            <div className="text-xs text-muted-foreground">Safe daily (all commitments)</div>
            <div className="text-lg font-semibold tabular-nums">
              {formatINR(paiseToRupees(resilience.survival.safeDailySpendPaise))}
            </div>
            {resilience.survival.udhariPayablePaise > 0 ? (
              <div className="mt-1 text-xs text-muted-foreground">
                Excl. udhari: {formatINR(paiseToRupees(resilience.survival.safeDailyCorePaise))}/day ·{" "}
                {resilience.survival.daysUntilNextIncome}d window
              </div>
            ) : (
              <div className="mt-1 text-xs text-muted-foreground">
                {resilience.survival.daysUntilNextIncome} day window
              </div>
            )}
          </div>
          <div className="rounded-lg bg-surface-2 p-3">
            <div className="text-xs text-muted-foreground">Emergency (essentials-based)</div>
            <div className="text-lg font-semibold tabular-nums">
              {resilience.emergency.monthsCovered.toFixed(1)} mo
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Fund {formatINR(paiseToRupees(resilience.emergency.emergencyFundAvailablePaise))} · Essentials ~{" "}
              {formatINR(paiseToRupees(resilience.emergency.monthlyEssentialPaise))}/mo
            </div>
          </div>
          <p className="text-xs text-muted-foreground md:col-span-2">
            {resilience.survival.narrativeLines[0]}
          </p>
        </CardContent>
      </Card>

      <Card className="mb-4 border-dashed">
        <CardHeader>
          <CardTitle>Ledger (Phase 5)</CardTitle>
          <CardDescription>
            {useLedgerViews
              ? "Dashboard and report KPIs are using financial_events / financial_effects."
              : "No usable ledger rows loaded yet; reports are using transaction fallback."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex flex-wrap gap-6 tabular-nums">
            <span>
              Ledger expense:{" "}
              <strong>{formatINR(paiseToRupees(ledgerExpenseThisMonth), { decimals: 2 })}</strong>
            </span>
            <span>
              Transaction roll-up:{" "}
              <strong>{formatINR(paiseToRupees(mom.thisExpense), { decimals: 2 })}</strong>
            </span>
          </div>
          {ledgerExplainTopCategory && catBreakdownRaw[0] && (
            <div className="text-muted-foreground">
              <p className="font-medium text-foreground">
                Explain top category ({catBreakdownRaw[0].categoryName})
              </p>
              <p>
                Included effects: {ledgerExplainTopCategory.included.length} · Excluded rows:{" "}
                {ledgerExplainTopCategory.excluded.length}
              </p>
              {ledgerExplainTopCategory.excluded.length > 0 && (
                <ul className="mt-1 list-inside list-disc text-xs">
                  {ledgerExplainTopCategory.excluded.slice(0, 5).map((x) => (
                    <li key={x.transactionId}>
                      {x.transactionId.slice(0, 12)}… — {x.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {ledgerDiagnostics ? (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Ledger Coverage Diagnostic</CardTitle>
            <CardDescription>
              {ledgerDiagnosticTotal(ledgerDiagnostics) === 0
                ? "No source-of-truth coverage gaps detected for the loaded user data."
                : `${ledgerDiagnosticTotal(ledgerDiagnostics)} issue(s) need ledger cleanup.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-3">
            {[
              ["Transactions without financial event", ledgerDiagnostics.transactionsWithoutFinancialEvent],
              ["Events without effects", ledgerDiagnostics.eventsWithoutEffects],
              ["Effects with invalid target", ledgerDiagnostics.effectsWithInvalidTarget],
              ["Credit-card tx missing card", ledgerDiagnostics.creditCardTransactionsMissingCard],
              ["EMI tx missing loan", ledgerDiagnostics.emiTransactionsMissingLoan],
              ["Udhari tx missing person", ledgerDiagnostics.udhariTransactionsMissingPerson],
            ].map(([label, rows]) => (
              <div key={label as string} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{label as string}</span>
                  <span className="tabular-nums">{(rows as typeof ledgerDiagnostics.transactionsWithoutFinancialEvent).length}</span>
                </div>
                {(rows as typeof ledgerDiagnostics.transactionsWithoutFinancialEvent).length > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {(rows as typeof ledgerDiagnostics.transactionsWithoutFinancialEvent).slice(0, 3).map((row) => (
                      <li key={row.id}>
                        {row.id.slice(0, 16)}: {row.reason}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-2 text-xs text-muted-foreground">Clear</div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="spending">Spending</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="ratios">Ratios</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Income vs Expense</CardTitle>
                <CardDescription>Monthly trend</CardDescription>
              </CardHeader>
              <CardContent>
                <SafeChart className="h-[300px]">
                  {({ width, height }) => (
                    <AreaChart width={width} height={height} data={trend}>
                      <defs>
                        <linearGradient id="rep-inc" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--income))" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="hsl(var(--income))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="rep-exp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--expense))" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="hsl(var(--expense))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                      <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                        }}
                        formatter={(v) => formatINR(Number(v), { decimals: 0 })}
                      />
                      <Area
                        type="monotone"
                        dataKey="income"
                        stroke="hsl(var(--income))"
                        fill="url(#rep-inc)"
                      />
                      <Area
                        type="monotone"
                        dataKey="expense"
                        stroke="hsl(var(--expense))"
                        fill="url(#rep-exp)"
                      />
                    </AreaChart>
                  )}
                </SafeChart>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Month-over-Month</CardTitle>
                <CardDescription>vs last month</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <KpiRow
                  label="Income"
                  value={paiseToRupees(mom.thisIncome)}
                  change={incomeChange}
                  positiveGood
                />
                <KpiRow
                  label="Expense"
                  value={paiseToRupees(mom.thisExpense)}
                  change={expenseChange}
                  positiveGood={false}
                />
                <KpiRow
                  label="Savings"
                  value={paiseToRupees(mom.thisIncome - mom.thisExpense)}
                  change={
                    mom.lastIncome - mom.lastExpense > 0
                      ? ((mom.thisIncome -
                          mom.thisExpense -
                          (mom.lastIncome - mom.lastExpense)) /
                          (mom.lastIncome - mom.lastExpense)) *
                        100
                      : 0
                  }
                  positiveGood
                />
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Year-over-Year Summary</CardTitle>
                <CardDescription>Annual income vs expense</CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportModuleToSheet("YoY_Summary", yoy)}
              >
                <Download className="h-4 w-4" /> Export
              </Button>
            </CardHeader>
            <CardContent>
              <SafeChart className="h-[260px]">
                {({ width, height }) => (
                  <BarChart width={width} height={height} data={yoy}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                      }}
                      formatter={(v) => formatINR(Number(v), { decimals: 0 })}
                    />
                    <Legend />
                    <Bar dataKey="income" fill="hsl(var(--income))" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="expense" fill="hsl(var(--expense))" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="savings" fill="hsl(var(--goal))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                )}
              </SafeChart>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="spending">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Categories</CardTitle>
                <CardDescription>This month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center gap-4 lg:flex-row">
                  <SafeChart className="h-[220px] w-full lg:w-1/2">
                    {({ width, height }) => (
                      <PieChart width={width} height={height}>
                        <Pie
                          data={catBreakdown}
                          dataKey="amount"
                          nameKey="categoryName"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                        >
                          {catBreakdown.map((c, i) => (
                            <Cell key={i} fill={c.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v) => formatINR(Number(v), { decimals: 0 })}
                          contentStyle={{
                            background: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 8,
                          }}
                        />
                      </PieChart>
                    )}
                  </SafeChart>
                  <div className="flex-1 space-y-1">
                    {catBreakdown.map((c) => (
                      <div
                        key={c.categoryId}
                        className="flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded"
                            style={{ backgroundColor: c.color }}
                          />
                          <span className="truncate">{c.categoryName}</span>
                        </div>
                        <div className="tabular-nums">
                          {formatINR(c.amount, { decimals: 0 })} •{" "}
                          {formatPercent(c.percent, 0)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Merchants</CardTitle>
                <CardDescription>This month</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    {topMerchants.map(([m, a], i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{m}</TableCell>
                        <TableCell className="tabular-nums text-right">
                          {formatINR(paiseToRupees(a), { decimals: 0 })}
                        </TableCell>
                      </TableRow>
                    ))}
                    {topMerchants.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={2}
                          className="text-center text-muted-foreground"
                        >
                          No merchant data
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Need vs Want</CardTitle>
              </CardHeader>
              <CardContent>
                <SplitBar
                  parts={[
                    {
                      label: "Need",
                      value: paiseToRupees(needWant.need),
                      color: "hsl(var(--income))",
                    },
                    {
                      label: "Want",
                      value: paiseToRupees(needWant.want),
                      color: "hsl(var(--expense))",
                    },
                    {
                      label: "Unassigned",
                      value: paiseToRupees(needWant.unassigned),
                      color: "hsl(var(--muted-foreground))",
                    },
                  ]}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fixed vs Variable</CardTitle>
              </CardHeader>
              <CardContent>
                <SplitBar
                  parts={[
                    {
                      label: "Fixed",
                      value: paiseToRupees(fixedVar.fixed),
                      color: "hsl(var(--info))",
                    },
                    {
                      label: "Variable",
                      value: paiseToRupees(fixedVar.variable),
                      color: "hsl(var(--warning))",
                    },
                    {
                      label: "Unassigned",
                      value: paiseToRupees(fixedVar.unassigned),
                      color: "hsl(var(--muted-foreground))",
                    },
                  ]}
                />
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Payment Mode Split</CardTitle>
                <CardDescription>This month</CardDescription>
              </CardHeader>
              <CardContent>
                <SafeChart className="h-[240px]">
                  {({ width, height }) => (
                    <BarChart width={width} height={height} data={modeData} layout="vertical">
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                      <YAxis
                        dataKey="mode"
                        type="category"
                        stroke="hsl(var(--muted-foreground))"
                        width={110}
                      />
                      <Tooltip
                        formatter={(v) => formatINR(Number(v), { decimals: 0 })}
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                        }}
                      />
                      <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  )}
                </SafeChart>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Net Cashflow Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <SafeChart className="h-[320px]">
                {({ width, height }) => (
                  <LineChart width={width} height={height} data={trend}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      formatter={(v) => formatINR(Number(v), { decimals: 0 })}
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="net"
                      stroke="hsl(var(--goal))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                )}
              </SafeChart>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ratios">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(() => {
              const totalEMI = loans.reduce((a, l) => {
                if (l.status !== "active") return a;
                const s = summarizeLoan(
                  l,
                  emis.filter((e) => e.loanId === l.id),
                );
                return a + s.emiPaise;
              }, 0);
              const dti = mom.thisIncome > 0 ? (totalEMI / mom.thisIncome) * 100 : 0;
              const totalLimit = cards
                .filter((c) => c.type === "credit")
                .reduce((a, c) => a + cardCreditLimitPaise(c), 0);
              const totalOutstanding = cards
                .filter((c) => c.type === "credit")
                .reduce((a, c) => {
                  const expenses = transactions
                    .filter((t) => t.linkedCardId === c.id && t.type === "expense")
                    .reduce((x, t) => x + transactionAmountPaise(t), 0);
                  const pays = transactions
                    .filter((t) => t.linkedCardId === c.id && t.type === "cc_payment")
                    .reduce((x, t) => x + transactionAmountPaise(t), 0);
                  return a + Math.max(0, expenses - pays);
                }, 0);
              const util = totalLimit > 0 ? (totalOutstanding / totalLimit) * 100 : 0;
              const savingsRate =
                mom.thisIncome > 0
                  ? ((mom.thisIncome - mom.thisExpense) / mom.thisIncome) * 100
                  : 0;

              return [
                <RatioCard
                  key="sr"
                  title="Savings Rate"
                  value={formatPercent(savingsRate, 0)}
                  target="> 20% healthy"
                  good={savingsRate >= 20}
                />,
                <RatioCard
                  key="dti"
                  title="Debt-to-Income"
                  value={formatPercent(dti, 0)}
                  target="< 30% healthy"
                  good={dti < 30}
                />,
                <RatioCard
                  key="cu"
                  title="Credit Utilization"
                  value={formatPercent(util, 0)}
                  target="< 30% healthy"
                  good={util < 30}
                />,
              ];
            })()}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiRow({
  label,
  value,
  change,
  positiveGood,
}: {
  label: string;
  value: number;
  change: number;
  positiveGood: boolean;
}) {
  const isPositiveChange = change >= 0;
  const good = positiveGood ? isPositiveChange : !isPositiveChange;
  return (
    <div className="flex items-center justify-between rounded-lg bg-surface-2 p-3">
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="tabular-nums text-lg font-semibold">
          {formatINR(value, { decimals: 0 })}
        </div>
      </div>
      <div
        className={`text-xs tabular-nums ${good ? "text-income" : "text-expense"}`}
      >
        {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(1)}%
      </div>
    </div>
  );
}

function SplitBar({
  parts,
}: {
  parts: { label: string; value: number; color: string }[];
}) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-3">
        {parts.map((p, i) => (
          <div
            key={i}
            style={{
              backgroundColor: p.color,
              width: total > 0 ? `${(p.value / total) * 100}%` : "0%",
            }}
          />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        {parts.map((p) => (
          <div key={p.label}>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded" style={{ backgroundColor: p.color }} />
              <span className="text-muted-foreground">{p.label}</span>
            </div>
            <div className="tabular-nums font-medium">
              {formatINR(p.value, { decimals: 0 })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RatioCard({
  title,
  value,
  target,
  good,
}: {
  title: string;
  value: string;
  target: string;
  good: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle
          className={good ? "text-income" : "text-expense"}
        >
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xs text-muted-foreground">{target}</div>
      </CardContent>
    </Card>
  );
}
