import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Field } from "@/components/ui/Label";
import { Progress } from "@/components/ui/Progress";
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
import { goalRepo, goalContribRepo, transactionRepo } from "@/repositories";
import type { Account, Goal } from "@/types";
import { useUIStore } from "@/store/uiStore";
import { confirm } from "@/store/uiStore";
import { goalSchema } from "@/services/validators";
import { buildGoalIntel, goalPriorityTier } from "@/services/goalEngine";
import { fundedGoalTransferEffect, goalEarmarkEffect } from "@/services/statements/goalFunding";
import { format } from "date-fns";
import {
  Pencil,
  Plus,
  Target,
  Trash2,
  TrendingUp,
  PartyPopper,
  IndianRupee,
} from "lucide-react";
import { formatINR, formatDate, formatPercent, isoToLocalDate, localDateToIso } from "@/lib/format";
import { formatMoney, goalSavedPaise, goalTargetPaise } from "@/utils/money";
import { GOAL_TYPE_LABELS } from "@/constants";
import { EmptyState } from "@/components/ui/Table";
import { refsForGoal } from "@/services/refIntegrity";

const GOAL_ICON_PRESETS = ["🎯", "📱", "💻", "🏍️", "🚗", "✈️", "🏠", "💍", "🎓", "🧰", "🛟", "💰"];
const GOAL_COLOR_PRESETS = ["#8b5cf6", "#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6", "#6366f1"];

export function GoalsPage() {
  const user = useAuthStore((s) => s.currentUser);
  const goals = useDataStore((s) => s.goals);
  const accounts = useDataStore((s) => s.accounts);
  const upsertLocal = useDataStore((s) => s.upsertLocal);
  const removeLocal = useDataStore((s) => s.removeLocal);
  const toast = useUIStore((s) => s.toast);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [adding, setAdding] = useState(false);
  const [contributing, setContributing] = useState<Goal | null>(null);

  const sorted = [...goals].sort((a, b) => a.priority - b.priority);

  async function handleDelete(id: string) {
    const refs = refsForGoal(id);
    if (refs.blocking) {
      toast({
        title: "Cannot delete goal",
        description: refs.message,
        kind: "warning",
      });
      return;
    }
    const ok = await confirm({
      title: "Delete this goal?",
      description: "This goal will be removed permanently.",
      destructive: true,
      confirmLabel: "Delete goal",
    });
    if (!ok) return;
    await goalRepo.softDelete(id);
    removeLocal("goals", id);
    toast({ title: "Goal removed", kind: "info" });
  }

  async function contribute(g: Goal, amount: number, mode: "earmark" | "funded_transfer", sourceAccountId?: string) {
    if (!user) return;
    const amountPaise = Math.round(amount * 100);
    if (mode === "earmark") {
      const effect = goalEarmarkEffect(amountPaise);
      if (effect.sourceAccountBalanceDeltaPaise !== 0 || effect.netWorthDeltaPaise !== 0) {
        throw new Error("Earmark must not move bank cash or change net worth");
      }
      const updated = await goalRepo.update(g.id, {
        currentSaved: g.currentSaved + amount,
        savedAmountPaise: (g.savedAmountPaise ?? Math.round(g.currentSaved * 100)) + amountPaise,
        status: g.currentSaved + amount >= g.targetAmount ? "completed" : g.status,
        linkedAccountId: sourceAccountId || g.linkedAccountId,
      });
      if (updated) upsertLocal("goals", updated);
      const contrib = await goalContribRepo.create({
        userId: user.id,
        data: {
          goalId: g.id,
          date: new Date().toISOString(),
          amount,
          amountPaise,
          sourceAccountId: sourceAccountId || g.linkedAccountId,
          notes: "fundingMode:earmark",
          fundingMode: "earmark",
        },
      });
      upsertLocal("goalContribs", contrib);
      toast({
        title: "Funds earmarked",
        description: `${formatINR(amount)} reserved for ${g.title} (bank balance unchanged)`,
        kind: "success",
      });
      setContributing(null);
      return;
    }

    if (!sourceAccountId || sourceAccountId === g.linkedAccountId) {
      toast({ title: "Choose a distinct source account for a funded transfer", kind: "error" });
      return;
    }
    const effect = fundedGoalTransferEffect(amountPaise);
    const source = accounts.find((a) => a.id === sourceAccountId);
    const destId = g.linkedAccountId;
    if (!source || !destId) {
      toast({ title: "Goal needs a linked destination account for funded transfers", kind: "error" });
      return;
    }
    const transfer = await transactionRepo.create({
      userId: user.id,
      data: {
        type: "transfer",
        date: new Date().toISOString(),
        amount,
        amountPaise,
        accountId: sourceAccountId,
        toAccountId: destId,
        paymentMode: "bank_transfer",
        businessOrPersonal: "personal",
        description: `Goal funding: ${g.title}`,
        merchantOrPerson: "",
        billAvailable: 0,
        gstApplicable: 0,
        taxFlag: 0,
        needWant: "unassigned",
        fixedVariable: "unassigned",
        plannedUnplanned: "unassigned",
        linkedGoalId: g.id,
        notes: "fundingMode:funded_transfer",
      },
    });
    upsertLocal("transactions", transfer);
    const updated = await goalRepo.update(g.id, {
      currentSaved: g.currentSaved + amount,
      savedAmountPaise: (g.savedAmountPaise ?? Math.round(g.currentSaved * 100)) + amountPaise,
      status: g.currentSaved + amount >= g.targetAmount ? "completed" : g.status,
    });
    if (updated) upsertLocal("goals", updated);
    const contrib = await goalContribRepo.create({
      userId: user.id,
      data: {
        goalId: g.id,
        date: new Date().toISOString(),
        amount,
        amountPaise,
        sourceAccountId,
        transactionId: transfer.id,
        notes: `fundingMode:funded_transfer;netWorthDelta:${effect.netWorthDeltaPaise}`,
        fundingMode: "funded_transfer",
      },
    });
    upsertLocal("goalContribs", contrib);
    toast({
      title: "Funded transfer recorded",
      description: `${formatINR(amount)} moved toward ${g.title} (net worth unchanged)`,
      kind: "success",
    });
    setContributing(null);
  }

  return (
    <div>
      <PageHeader
        title="Goals & Planned Purchases"
        description="Save deliberately for the things that matter — phone, marriage, emergency, travel."
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> New Goal
          </Button>
        }
      />

      {sorted.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<Target className="h-6 w-6" />}
              title="No goals yet"
              description="Create goals to plan major purchases or build reserves."
              action={
                <Button onClick={() => setAdding(true)}>
                  <Plus className="h-4 w-4" /> New Goal
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((g) => {
            const p = buildGoalIntel(g);
            const isComplete = goalSavedPaise(g) >= goalTargetPaise(g);
            return (
              <Card key={g.id} className="relative overflow-hidden">
                {isComplete ? (
                  <div className="absolute right-2 top-2">
                    <Badge variant="success" className="shadow-sm">
                      <PartyPopper className="h-3 w-3" /> Completed
                    </Badge>
                  </div>
                ) : null}
                <CardContent className="p-5">
                  <div className="mb-3 flex items-start gap-3">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
                      style={{ backgroundColor: g.color + "22", color: g.color }}
                    >
                      {g.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{g.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {GOAL_TYPE_LABELS[g.goalType]} · {goalPriorityTier(g.priority)}
                      </div>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="tabular-nums">
                        {formatMoney(goalSavedPaise(g))} /{" "}
                        {formatMoney(goalTargetPaise(g))}
                      </span>
                      <span className="tabular-nums font-medium">
                        {formatPercent(p.completionPercent, 0)}
                      </span>
                    </div>
                    <Progress
                      value={p.completionPercent}
                      tone={
                        isComplete
                          ? "income"
                          : p.onTrackStatus === "behind" || p.onTrackStatus === "critical"
                            ? "warning"
                            : "goal"
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground">Target by</div>
                      <div className="font-medium">{formatDate(g.targetDate)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">
                        Months left
                      </div>
                      <div className="font-medium">{p.monthsLeft}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">
                        Monthly required
                      </div>
                      <div className="font-medium tabular-nums">
                        {formatMoney(p.monthlyRequiredPaise)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Remaining</div>
                      <div className="font-medium tabular-nums">{formatMoney(p.remainingPaise)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Weekly / daily pace</div>
                      <div className="font-medium tabular-nums">
                        {formatMoney(p.weeklyRequiredPaise)}/wk · {formatMoney(p.dailyRequiredPaise)}/day
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Status</div>
                      <div className="font-medium capitalize">{p.onTrackStatus.replace("_", " ")}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setContributing(g)}
                      disabled={isComplete}
                    >
                      <TrendingUp className="h-4 w-4" /> Contribute
                    </Button>
                    <div className="flex gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => setEditing(g)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => handleDelete(g.id)}
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

      <GoalForm
        open={adding || !!editing}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
        goal={editing}
        userId={user?.id}
        onSaved={(g) => {
          upsertLocal("goals", g);
          toast({ title: editing ? "Goal updated" : "Goal created", kind: "success" });
          setAdding(false);
          setEditing(null);
        }}
      />

      <ContributeDialog
        goal={contributing}
        onClose={() => setContributing(null)}
        onSubmit={(amt, mode, sourceAccountId) => contributing && contribute(contributing, amt, mode, sourceAccountId)}
        accounts={accounts}
      />
    </div>
  );
}

function ContributeDialog({
  goal,
  onClose,
  onSubmit,
  accounts,
}: {
  goal: Goal | null;
  onClose: () => void;
  onSubmit: (amount: number, mode: "earmark" | "funded_transfer", sourceAccountId?: string) => void;
  accounts: Account[];
}) {
  const [amount, setAmount] = useState<number>(0);
  const [mode, setMode] = useState<"earmark" | "funded_transfer">("earmark");
  const [sourceAccountId, setSourceAccountId] = useState<string>(goal?.linkedAccountId ?? "");
  useEffect(() => {
    setAmount(0);
    setMode("earmark");
    setSourceAccountId(goal?.linkedAccountId ?? "");
  }, [goal?.id, goal?.linkedAccountId]);
  const activeAccounts = accounts.filter((a) => !a.isDeleted && !a.isInactive);
  return (
    <Dialog open={!!goal} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Contribute to {goal?.title}</DialogTitle>
        </DialogHeader>
        <Field label="Funding mode" required>
          <Select value={mode} onValueChange={(v) => setMode(v as "earmark" | "funded_transfer")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="earmark">Earmark existing funds (no cash movement)</SelectItem>
              <SelectItem value="funded_transfer">Funded transfer between accounts</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Source account" required={mode === "funded_transfer"}>
          <Select value={sourceAccountId} onValueChange={setSourceAccountId}>
            <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
            <SelectContent>
              {activeAccounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Amount (₹)" required>
          <div className="relative">
            <IndianRupee className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="number"
              className="pl-8"
              value={amount}
              onChange={(e) => setAmount(+e.target.value)}
            />
          </div>
        </Field>
        <p className="text-xs text-muted-foreground">
          {mode === "earmark"
            ? "Earmarking reserves money already in an account. Bank balance and net worth stay the same."
            : "A funded transfer posts one transfer between distinct owned accounts. Net worth stays the same."}
        </p>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => amount > 0 && onSubmit(amount, mode, sourceAccountId || undefined)}
            disabled={amount <= 0 || (mode === "funded_transfer" && !sourceAccountId)}
          >
            {mode === "earmark" ? "Earmark funds" : "Record funded transfer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GoalForm({
  open,
  onClose,
  goal,
  userId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  goal: Goal | null;
  userId?: string;
  onSaved: (g: Goal) => void;
}) {
  const [state, setState] = useState({
    title: goal?.title ?? "",
    goalType: goal?.goalType ?? "custom",
    targetAmount: goal?.targetAmount ?? 0,
    targetDate: goal?.targetDate
      ? isoToLocalDate(goal.targetDate)
      : format(new Date(Date.now() + 180 * 864e5), "yyyy-MM-dd"),
    currentSaved: goal?.currentSaved ?? 0,
    priority: goal?.priority ?? 3,
    icon: goal?.icon ?? "🎯",
    color: goal?.color ?? "#8b5cf6",
    autoContributionEnabled: goal?.autoContribution?.enabled ?? false,
    autoContributionAmount: goal?.autoContribution?.amount ?? 0,
    autoContributionDay: goal?.autoContribution?.dayOfMonth ?? 1,
    status: goal?.status ?? "active",
    notes: goal?.notes ?? "",
  });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setState({
      title: goal?.title ?? "",
      goalType: goal?.goalType ?? "custom",
      targetAmount: goal?.targetAmount ?? 0,
      targetDate: goal?.targetDate
        ? isoToLocalDate(goal.targetDate)
        : format(new Date(Date.now() + 180 * 864e5), "yyyy-MM-dd"),
      currentSaved: goal?.currentSaved ?? 0,
      priority: goal?.priority ?? 3,
      icon: goal?.icon ?? "🎯",
      color: goal?.color ?? "#8b5cf6",
      autoContributionEnabled: goal?.autoContribution?.enabled ?? false,
      autoContributionAmount: goal?.autoContribution?.amount ?? 0,
      autoContributionDay: goal?.autoContribution?.dayOfMonth ?? 1,
      status: goal?.status ?? "active",
      notes: goal?.notes ?? "",
    });
    setErr(null);
  }, [goal, open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const parse = goalSchema.safeParse(state);
    if (!parse.success) {
      setErr(parse.error.issues[0]?.message ?? "Invalid");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...parse.data,
        targetDate: localDateToIso(parse.data.targetDate),
        startedAt: goal?.startedAt ?? new Date().toISOString(),
        autoContribution: parse.data.autoContributionEnabled
          ? {
              enabled: true,
              amount: parse.data.autoContributionAmount,
              dayOfMonth: parse.data.autoContributionDay,
            }
          : undefined,
      };
      if (goal) {
        const updated = await goalRepo.update(goal.id, payload as unknown as Partial<Goal>);
        if (updated) onSaved(updated);
      } else {
        const created = await goalRepo.create({
          userId,
          data: payload as unknown as Goal,
        });
        onSaved(created);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save goal");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{goal ? "Edit Goal" : "New Goal"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <Field label="Title" required className="col-span-2">
            <Input
              value={state.title}
              onChange={(e) => setState({ ...state, title: e.target.value })}
              placeholder="iPhone 17 Pro"
            />
          </Field>
          <Field label="Goal type">
            <Select
              value={state.goalType}
              onValueChange={(v) =>
                setState({ ...state, goalType: v as typeof state.goalType })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(GOAL_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Priority (1 high — 5 low)">
            <Input
              type="number"
              min={1}
              max={5}
              value={state.priority}
              onChange={(e) =>
                setState({ ...state, priority: +e.target.value as 1 | 2 | 3 | 4 | 5 })
              }
            />
          </Field>
          <Field label="Target amount (₹)" required>
            <Input
              type="number"
              value={state.targetAmount}
              onChange={(e) => setState({ ...state, targetAmount: +e.target.value })}
            />
          </Field>
          <Field label="Target date" required>
            <Input
              type="date"
              value={state.targetDate}
              onChange={(e) => setState({ ...state, targetDate: e.target.value })}
            />
          </Field>
          <Field label="Current saved">
            <Input
              type="number"
              value={state.currentSaved}
              onChange={(e) => setState({ ...state, currentSaved: +e.target.value })}
            />
          </Field>
          <Field label="Icon">
            <Input
              value={state.icon}
              onChange={(e) => setState({ ...state, icon: e.target.value })}
              placeholder="🎯"
            />
          </Field>
          <Field label="Goal style" className="col-span-2">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {GOAL_ICON_PRESETS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setState({ ...state, icon })}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg border text-xl ${
                      state.icon === icon
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-surface-2"
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {GOAL_COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setState({ ...state, color })}
                    className={`h-8 w-8 rounded-full border-2 ${
                      state.color === color ? "border-foreground" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
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
