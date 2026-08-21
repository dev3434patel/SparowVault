import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Label";
import { Progress } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";
import { Checkbox } from "@/components/ui/Checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { useDataStore } from "@/store/dataStore";
import { useAuthStore } from "@/store/authStore";
import { budgetRepo } from "@/repositories";
import type { Budget } from "@/types";
import { useUIStore } from "@/store/uiStore";
import { confirm } from "@/store/uiStore";
import { projectMonthEndSpend } from "@/services/calculations";
import { smartBudgetStatuses } from "@/services/smartBudgetEngine";
import { formatINR, formatPercent } from "@/lib/format";
import { budgetLimitPaise, paiseToRupees } from "@/utils/money";
import { Pencil, Plus, Target as TargetIcon, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/Table";
import { budgetSchema } from "@/services/validators";
import { refsForCategory } from "@/services/refIntegrity";

export function BudgetsPage() {
  const user = useAuthStore((s) => s.currentUser);
  const budgets = useDataStore((s) => s.budgets);
  const categories = useDataStore((s) => s.categories);
  const transactions = useDataStore((s) => s.transactions);
  const recurringRules = useDataStore((s) => s.recurringRules);
  const upsertLocal = useDataStore((s) => s.upsertLocal);
  const removeLocal = useDataStore((s) => s.removeLocal);
  const toast = useUIStore((s) => s.toast);

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [adding, setAdding] = useState(false);

  const relevant = budgets.filter(
    (b) => b.period === "monthly" && b.year === year && b.month === month,
  );

  const projectionReferenceDate = useMemo(() => {
    const now = new Date();
    if (year === now.getFullYear() && month === now.getMonth() + 1) return now;
    // For non-current months, use a mid-month reference for stable projections.
    return new Date(year, month - 1, 15);
  }, [year, month]);

  const statuses = useMemo(
    () => smartBudgetStatuses(relevant, transactions, recurringRules, projectionReferenceDate),
    [relevant, transactions, recurringRules, projectionReferenceDate],
  );

  const totalBudget = statuses.reduce((a, s) => a + budgetLimitPaise(s.budget), 0);
  const totalSpent = statuses.reduce((a, s) => a + s.spentPaise, 0);
  const overallProjected = projectMonthEndSpend(totalSpent, projectionReferenceDate);

  const monthNames = [
    "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec",
  ];

  async function handleDelete(id: string) {
    const budget = budgets.find((b) => b.id === id);
    if (budget?.categoryId) {
      const refs = refsForCategory(budget.categoryId);
      if (refs.blocking && refs.count > 0) {
        // Informative only; budget delete itself is allowed.
        toast({
          title: "Budget has linked category activity",
          description: refs.message,
          kind: "info",
        });
      }
    }
    const ok = await confirm({
      title: "Delete this budget?",
      description: "This budget will be removed permanently.",
      destructive: true,
      confirmLabel: "Delete budget",
    });
    if (!ok) return;
    await budgetRepo.softDelete(id);
    removeLocal("budgets", id);
    toast({ title: "Budget removed", kind: "info" });
  }

  return (
    <div>
      <PageHeader
        title="Budget Planner"
        description="Monthly budgets with planned vs actual, projected month-end, carry-forward & rollover."
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> New Budget
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={String(month)} onValueChange={(v) => setMonth(+v)}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthNames.map((m, i) => (
              <SelectItem key={m} value={String(i + 1)}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={(v) => setYear(+v)}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1].map(
              (y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total planned</CardDescription>
            <CardTitle className="tabular-nums">{formatINR(paiseToRupees(totalBudget))}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total spent</CardDescription>
            <CardTitle className="tabular-nums">{formatINR(paiseToRupees(totalSpent))}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Remaining</CardDescription>
            <CardTitle className="tabular-nums">
              {formatINR(paiseToRupees(Math.max(0, totalBudget - totalSpent)))}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Projected month-end</CardDescription>
            <CardTitle className="tabular-nums">{formatINR(paiseToRupees(overallProjected))}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {statuses.length === 0 ? (
          <Card className="lg:col-span-2">
            <CardContent>
              <EmptyState
                icon={<TargetIcon className="h-6 w-6" />}
                title="No budgets set for this month"
                description="Plan budgets by category to stay on track."
                action={
                  <Button onClick={() => setAdding(true)}>
                    <Plus className="h-4 w-4" /> Create Budget
                  </Button>
                }
              />
            </CardContent>
          </Card>
        ) : null}
        {statuses.map((s) => {
          const cat = categories.find((c) => c.id === s.budget.categoryId);
          const tone =
            s.level === "over"
              ? "expense"
              : s.level === "warning"
                ? "warning"
                : s.level === "watch"
                  ? "info"
                  : "income";
          return (
            <Card key={s.budget.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-xl"
                    style={{ backgroundColor: (cat?.color ?? "#64748b") + "22" }}
                  >
                    {cat?.icon ?? "💰"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-semibold">
                        {cat?.name ?? "Category"}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {s.burnRisk !== "ok" ? (
                          <Badge variant={s.burnRisk === "high" ? "danger" : "warning"}>
                            {s.burnRisk}
                          </Badge>
                        ) : null}
                        <Badge variant={tone}>{formatPercent(s.percentUsed, 0)}</Badge>
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                      {formatINR(paiseToRupees(s.spentPaise), { decimals: 0 })} of{" "}
                      {formatINR(paiseToRupees(budgetLimitPaise(s.budget)), { decimals: 0 })}
                      {" · "}
                      {s.dayProgressPct.toFixed(0)}% month elapsed · proj{" "}
                      {formatINR(paiseToRupees(s.adjustedMonthEndProjectedPaise), { decimals: 0 })}
                    </div>
                    <Progress
                      value={Math.min(100, s.percentUsed)}
                      className="mt-2"
                      tone={tone === "info" ? "primary" : tone === "income" ? "income" : tone === "warning" ? "warning" : "expense"}
                    />
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>
                        Projected:{" "}
                        <span className="tabular-nums">
                          {formatINR(paiseToRupees(s.projectedMonthEndPaise), { decimals: 0 })}
                        </span>
                        {s.projectedOverrun ? (
                          <span className="ml-1 text-warning">
                            • likely to overshoot
                          </span>
                        ) : null}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => setEditing(s.budget)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => handleDelete(s.budget.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <BudgetForm
        open={adding || !!editing}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
        budget={editing}
        defaultMonth={month}
        defaultYear={year}
        userId={user?.id}
        onSaved={(b) => {
          upsertLocal("budgets", b);
          toast({
            title: editing ? "Budget updated" : "Budget created",
            kind: "success",
          });
          setAdding(false);
          setEditing(null);
        }}
      />
    </div>
  );
}

function BudgetForm({
  open,
  onClose,
  budget,
  defaultMonth,
  defaultYear,
  userId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  budget: Budget | null;
  defaultMonth: number;
  defaultYear: number;
  userId?: string;
  onSaved: (b: Budget) => void;
}) {
  const allCategories = useDataStore((s) => s.categories);
  const categories = useMemo(
    () => allCategories.filter((c) => c.appliesTo === "expense" || c.appliesTo === "mixed"),
    [allCategories],
  );
  const [state, setState] = useState({
    period: (budget?.period ?? "monthly") as "monthly" | "annual",
    year: budget?.year ?? defaultYear,
    month: budget?.month ?? defaultMonth,
    categoryId: budget?.categoryId ?? "",
    amount: budget?.amount ?? 0,
    mode: (budget?.mode ?? "flexible") as "fixed" | "flexible",
    carryForward: (budget?.carryForward ?? 0) as 0 | 1,
    rolloverSavings: (budget?.rolloverSavings ?? 0) as 0 | 1,
    notes: budget?.notes ?? "",
  });
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setState({
      period: (budget?.period ?? "monthly") as "monthly" | "annual",
      year: budget?.year ?? defaultYear,
      month: budget?.month ?? defaultMonth,
      categoryId: budget?.categoryId ?? "",
      amount: budget?.amount ?? 0,
      mode: (budget?.mode ?? "flexible") as "fixed" | "flexible",
      carryForward: (budget?.carryForward ?? 0) as 0 | 1,
      rolloverSavings: (budget?.rolloverSavings ?? 0) as 0 | 1,
      notes: budget?.notes ?? "",
    });
    setErr(null);
  }, [budget, defaultMonth, defaultYear, open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const parse = budgetSchema.safeParse(state);
    if (!parse.success) {
      setErr(parse.error.issues[0]?.message ?? "Invalid");
      return;
    }
    setErr(null);
    if (budget) {
      const updated = await budgetRepo.update(budget.id, parse.data);
      if (updated) onSaved(updated);
    } else {
      const created = await budgetRepo.create({
        userId,
        data: parse.data as unknown as Budget,
      });
      onSaved(created);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{budget ? "Edit Budget" : "New Budget"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <Field label="Period">
            <Select
              value={state.period}
              onValueChange={(v) =>
                setState({ ...state, period: v as typeof state.period })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Category" required>
            <Select
              value={state.categoryId || undefined}
              onValueChange={(v) => setState({ ...state, categoryId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Year">
            <Input
              type="number"
              value={state.year}
              onChange={(e) => setState({ ...state, year: +e.target.value })}
            />
          </Field>
          {state.period === "monthly" ? (
            <Field label="Month">
              <Input
                type="number"
                min={1}
                max={12}
                value={state.month}
                onChange={(e) => setState({ ...state, month: +e.target.value })}
              />
            </Field>
          ) : (
            <div />
          )}
          <Field label="Amount (₹)" required className="col-span-2">
            <Input
              type="number"
              step="0.01"
              value={state.amount}
              onChange={(e) => setState({ ...state, amount: +e.target.value })}
            />
          </Field>
          <Field label="Mode" className="col-span-2">
            <Select
              value={state.mode}
              onValueChange={(v) => setState({ ...state, mode: v as typeof state.mode })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flexible">Flexible</SelectItem>
                <SelectItem value="fixed">Fixed</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={!!state.carryForward}
              onCheckedChange={(v) =>
                setState({ ...state, carryForward: v ? 1 : 0 })
              }
            />
            Carry-forward unused
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={!!state.rolloverSavings}
              onCheckedChange={(v) =>
                setState({ ...state, rolloverSavings: v ? 1 : 0 })
              }
            />
            Rollover savings
          </label>
          {err ? (
            <div className="col-span-2 rounded-md bg-expense-soft p-2 text-xs text-danger">
              {err}
            </div>
          ) : null}
          <DialogFooter className="col-span-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
