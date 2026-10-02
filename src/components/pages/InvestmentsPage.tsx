import { useEffect, useMemo, useState } from "react";
import { PersonalPageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { useDataStore } from "@/store/dataStore";
import { useAuthStore } from "@/store/authStore";
import { investmentRepo, savingsContribRepo } from "@/repositories";
import type { Investment } from "@/types";
import { useUIStore } from "@/store/uiStore";
import { confirm } from "@/store/uiStore";
import { investmentSchema } from "@/services/validators";
import { projectedCorpus, emergencyMonthsCoverage, sumExpense } from "@/services/calculations";
import { INVESTMENT_TYPE_LABELS } from "@/constants";
import { formatINR, formatDate, isoToLocalDate, localDateToIso } from "@/lib/format";
import {
  investmentMonthlyPaise,
  investmentTotalContributedPaise,
  paiseToRupees,
  rupeesToPaise,
} from "@/utils/money";
import { differenceInCalendarMonths, format } from "date-fns";
import { PiggyBank, Pencil, Plus, Trash2, Shield, TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/ui/Table";
import { refsForInvestment } from "@/services/refIntegrity";
import { useMessages } from "@/i18n/useMessages";

export function InvestmentsPage({ embedded = false }: { embedded?: boolean }) {
  const copy = useMessages().copy.investments;
  const user = useAuthStore((s) => s.currentUser);
  const investments = useDataStore((s) => s.investments);
  const transactions = useDataStore((s) => s.transactions);
  const upsertLocal = useDataStore((s) => s.upsertLocal);
  const removeLocal = useDataStore((s) => s.removeLocal);
  const toast = useUIStore((s) => s.toast);

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Investment | null>(null);
  const [contributing, setContributing] = useState<Investment | null>(null);

  const totals = useMemo(() => {
    const totalContributed = investments.reduce(
      (a, i) => a + investmentTotalContributedPaise(i),
      0,
    );
    const monthlyTarget = investments
      .filter((i) => i.status === "active")
      .reduce((a, i) => a + investmentMonthlyPaise(i), 0);
    const emergency = investments
      .filter((i) => i.type === "emergency_fund" || i.type === "sinking_fund")
      .reduce((a, i) => a + investmentTotalContributedPaise(i), 0);
    const avgMonthlyExpense = (() => {
      const last6 = new Date();
      last6.setMonth(last6.getMonth() - 6);
      const recent = transactions.filter((t) => new Date(t.date) >= last6);
      return sumExpense(recent) / 6;
    })();
    const emergencyMonths = emergencyMonthsCoverage(emergency, avgMonthlyExpense);
    return { totalContributed, monthlyTarget, emergency, emergencyMonths };
  }, [investments, transactions]);

  async function handleDelete(id: string) {
    const refs = refsForInvestment(id);
    if (refs.blocking) {
      toast({
        title: copy.cannotDelete,
        description: refs.message,
        kind: "warning",
      });
      return;
    }
    const ok = await confirm({
      title: copy.deleteTitle,
      description: copy.deleteBody,
      destructive: true,
      confirmLabel: copy.deleteConfirm,
    });
    if (!ok) return;
    await investmentRepo.softDelete(id);
    removeLocal("investments", id);
    toast({ title: copy.removed, kind: "info" });
  }

  async function contribute(inv: Investment, amount: number) {
    if (!user) return;
    const updated = await investmentRepo.update(inv.id, {
      totalContributedPaise:
        investmentTotalContributedPaise(inv) + rupeesToPaise(amount),
      totalContributed: paiseToRupees(
        investmentTotalContributedPaise(inv) + rupeesToPaise(amount),
      ),
    });
    if (updated) upsertLocal("investments", updated);
    const c = await savingsContribRepo.create({
      userId: user.id,
      data: {
        investmentId: inv.id,
        date: new Date().toISOString(),
        amount,
        amountPaise: rupeesToPaise(amount),
      },
    });
    upsertLocal("savingsContribs", c);
    toast({
      title: copy.contribAdded,
      description: `${formatINR(amount)} to ${inv.name}`,
      kind: "success",
    });
    setContributing(null);
  }

  return (
    <div>
      {!embedded ? (
        <PersonalPageHeader
          screen="investments"
          actions={
            <Button onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" /> New Bucket
            </Button>
          }
        />
      ) : (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> New Bucket
          </Button>
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total invested</CardDescription>
            <CardTitle className="tabular-nums">{formatINR(paiseToRupees(totals.totalContributed))}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Monthly target</CardDescription>
            <CardTitle className="tabular-nums">{formatINR(paiseToRupees(totals.monthlyTarget))}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Emergency fund</CardDescription>
            <CardTitle className="tabular-nums">{formatINR(paiseToRupees(totals.emergency))}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Months of coverage</CardDescription>
            <CardTitle
              className={
                totals.emergencyMonths >= 6
                  ? "text-income"
                  : totals.emergencyMonths >= 3
                    ? "text-warning"
                    : "text-expense"
              }
            >
              {totals.emergencyMonths.toFixed(1)} mo
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {investments.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<PiggyBank className="h-6 w-6" />}
              title={copy.emptyTitle}
              description={copy.emptyBody}
              action={
                <Button onClick={() => setAdding(true)}>
                  <Plus className="h-4 w-4" /> Add Investment
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {investments.map((inv) => {
            const monthsIn = Math.max(
              1,
              differenceInCalendarMonths(new Date(), new Date(inv.startDate)),
            );
            const expectedByNow = investmentMonthlyPaise(inv) * monthsIn;
            const onTrack = investmentTotalContributedPaise(inv) >= expectedByNow * 0.9;
            const monthsToMaturity = inv.maturityDate
              ? differenceInCalendarMonths(new Date(inv.maturityDate), new Date())
              : 0;
            const projection = inv.expectedReturnRate
              ? projectedCorpus(
                  investmentMonthlyPaise(inv),
                  inv.expectedReturnRate,
                  monthsToMaturity,
                )
              : 0;
            const icon =
              inv.type === "emergency_fund" ? <Shield className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />;
            return (
              <Card key={inv.id}>
                <CardContent className="p-5">
                  <div className="mb-3 flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-goal-soft text-goal">
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="truncate font-semibold">{inv.name}</div>
                        <Badge variant={onTrack ? "success" : "warning"}>
                          {onTrack ? "On track" : "Behind"}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {INVESTMENT_TYPE_LABELS[inv.type]} · {inv.frequency}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-muted-foreground">Contributed</div>
                      <div className="tabular-nums font-semibold">
                        {formatINR(paiseToRupees(investmentTotalContributedPaise(inv)), { decimals: 0 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Monthly target</div>
                      <div className="tabular-nums font-semibold">
                        {formatINR(paiseToRupees(investmentMonthlyPaise(inv)), { decimals: 0 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Started</div>
                      <div>{formatDate(inv.startDate)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Maturity</div>
                      <div>{inv.maturityDate ? formatDate(inv.maturityDate) : "—"}</div>
                    </div>
                    {projection > 0 ? (
                      <div className="col-span-2 rounded-lg bg-goal-soft p-2">
                        <div className="text-muted-foreground">
                          Projected corpus ({inv.expectedReturnRate}% p.a.)
                        </div>
                        <div className="tabular-nums font-semibold text-goal">
                          {formatINR(paiseToRupees(projection), { decimals: 0 })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setContributing(inv)}
                    >
                      Contribute
                    </Button>
                    <div className="flex gap-1">
                      <Button size="icon-sm" variant="ghost" onClick={() => setEditing(inv)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => handleDelete(inv.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <InvestmentForm
        open={adding || !!editing}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
        investment={editing}
        userId={user?.id}
        onSaved={(i) => {
          upsertLocal("investments", i);
          toast({
            title: editing ? copy.updated : copy.added,
            kind: "success",
          });
          setAdding(false);
          setEditing(null);
        }}
      />

      <ContribDialog
        investment={contributing}
        onClose={() => setContributing(null)}
        onSubmit={(amt) => contributing && contribute(contributing, amt)}
      />
    </div>
  );
}

function ContribDialog({
  investment,
  onClose,
  onSubmit,
}: {
  investment: Investment | null;
  onClose: () => void;
  onSubmit: (amount: number) => void;
}) {
  const [amount, setAmount] = useState<number>(investment?.monthlyTarget ?? 0);
  return (
    <Dialog open={!!investment} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Contribute to {investment?.name}</DialogTitle>
        </DialogHeader>
        <Field label="Amount (₹)" required>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(+e.target.value)}
          />
        </Field>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => amount > 0 && onSubmit(amount)} disabled={amount <= 0}>
            Record contribution
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InvestmentForm({
  open,
  onClose,
  investment,
  userId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  investment: Investment | null;
  userId?: string;
  onSaved: (i: Investment) => void;
}) {
  const copy = useMessages().copy.investments;
  const [state, setState] = useState({
    name: investment?.name ?? "",
    type: (investment?.type ?? "sip") as Investment["type"],
    startDate: investment?.startDate
      ? isoToLocalDate(investment.startDate)
      : format(new Date(), "yyyy-MM-dd"),
    frequency: (investment?.frequency ?? "monthly") as Investment["frequency"],
    monthlyTarget: investment?.monthlyTarget ?? 0,
    maturityDate: investment?.maturityDate ? isoToLocalDate(investment.maturityDate) : "",
    expectedReturnRate: investment?.expectedReturnRate ?? 0,
    notes: investment?.notes ?? "",
  });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setState({
      name: investment?.name ?? "",
      type: (investment?.type ?? "sip") as Investment["type"],
      startDate: investment?.startDate
        ? isoToLocalDate(investment.startDate)
        : format(new Date(), "yyyy-MM-dd"),
      frequency: (investment?.frequency ?? "monthly") as Investment["frequency"],
      monthlyTarget: investment?.monthlyTarget ?? 0,
      maturityDate: investment?.maturityDate ? isoToLocalDate(investment.maturityDate) : "",
      expectedReturnRate: investment?.expectedReturnRate ?? 0,
      notes: investment?.notes ?? "",
    });
    setErr(null);
  }, [investment, open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const parse = investmentSchema.safeParse(state);
    if (!parse.success) {
      setErr(parse.error.issues[0]?.message ?? copy.invalid);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...parse.data,
        startDate: localDateToIso(parse.data.startDate),
        maturityDate: parse.data.maturityDate
          ? localDateToIso(parse.data.maturityDate)
          : undefined,
      };
      if (investment) {
        const updated = await investmentRepo.update(
          investment.id,
          payload as unknown as Partial<Investment>,
        );
        if (updated) onSaved(updated);
      } else {
        const created = await investmentRepo.create({
          userId,
          data: {
            ...payload,
            totalContributed: 0,
            status: "active",
          } as unknown as Investment,
        });
        onSaved(created);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : copy.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{investment ? copy.edit : copy.new}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <Field label="Name" required className="col-span-2">
            <Input
              value={state.name}
              onChange={(e) => setState({ ...state, name: e.target.value })}
              placeholder="Axis Bluechip SIP"
            />
          </Field>
          <Field label="Type">
            <Select
              value={state.type}
              onValueChange={(v) => setState({ ...state, type: v as Investment["type"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(INVESTMENT_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Frequency">
            <Select
              value={state.frequency}
              onValueChange={(v) =>
                setState({ ...state, frequency: v as Investment["frequency"] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
                <SelectItem value="oneoff">One-off</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Start date" required>
            <Input
              type="date"
              value={state.startDate}
              onChange={(e) => setState({ ...state, startDate: e.target.value })}
            />
          </Field>
          <Field label="Maturity date">
            <Input
              type="date"
              value={state.maturityDate}
              onChange={(e) => setState({ ...state, maturityDate: e.target.value })}
            />
          </Field>
          <Field label="Monthly target (₹)">
            <Input
              type="number"
              value={state.monthlyTarget}
              onChange={(e) => setState({ ...state, monthlyTarget: +e.target.value })}
            />
          </Field>
          <Field label="Expected return %">
            <Input
              type="number"
              step="0.1"
              value={state.expectedReturnRate}
              onChange={(e) =>
                setState({ ...state, expectedReturnRate: +e.target.value })
              }
            />
          </Field>
          {err ? (
            <div className="col-span-2 rounded-md bg-expense-soft p-2 text-xs text-danger">
              {err}
            </div>
          ) : null}
          <DialogFooter className="col-span-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
