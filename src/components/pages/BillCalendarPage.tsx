import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { PersonalPageHeader } from "@/components/layout/PageHeader";
import { RecurringRuleDialog } from "@/components/planning/RecurringRuleDialog";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatINR, formatDate } from "@/lib/format";
import {
  cardEmiInstallmentRepo,
  cardEmiPlanRepo,
  cardStatementRepo,
  insurancePolicyRepo,
  obligationRepo,
  recurringRepo,
} from "@/repositories";
import {
  materializeCardEmiObligations,
  materializeCardStatementObligations,
  materializeInsuranceObligations,
  materializeLoanEmiObligations,
  materializeRecurringObligations,
  materializeUdhariObligations,
  mergeObligationsUnique,
  obligationCalendarSummary,
} from "@/services/obligationEngine";
import {
  completeReminder,
  createCustomObligation,
  createInAppReminder,
  persistProjectedObligations,
  snoozeReminder,
} from "@/services/personalBookWorkflows";
import { useAuthStore } from "@/store/authStore";
import { useDataStore } from "@/store/dataStore";
import { useUIStore } from "@/store/uiStore";
import type { CardEmiInstallment, CardEmiPlan, CardStatement, InsurancePolicy, Obligation, RecurringRule, Reminder } from "@/types";
import { paiseToRupees, rupeesToPaise } from "@/utils/money";
import { useMessages } from "@/i18n/useMessages";

function ruleAmountRupees(rule: RecurringRule): number {
  const paise =
    rule.amountPaise != null && Number.isFinite(rule.amountPaise)
      ? Math.round(rule.amountPaise)
      : rupeesToPaise(rule.amount);
  return paiseToRupees(paise);
}

export function BillCalendarPage() {
  const copy = useMessages().ui.bills;
  const common = useMessages().ui.common;
  const frequency = useMessages().copy.recurring;
  const user = useAuthStore((s) => s.currentUser);
  const recurringRules = useDataStore((s) => s.recurringRules);
  const upsertLocal = useDataStore((s) => s.upsertLocal);
  const loans = useDataStore((s) => s.loans);
  const emis = useDataStore((s) => s.emis);
  const cards = useDataStore((s) => s.cards);
  const udhari = useDataStore((s) => s.udhari);
  const [statements, setStatements] = useState<CardStatement[]>([]);
  const [emiPlans, setEmiPlans] = useState<CardEmiPlan[]>([]);
  const [emiInstallments, setEmiInstallments] = useState<CardEmiInstallment[]>([]);
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [customObligations, setCustomObligations] = useState<Obligation[]>([]);
  const toast = useUIStore((s) => s.toast);
  const today = useMemo(() => new Date(), []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringRule | null>(null);
  const [pausingId, setPausingId] = useState<string | null>(null);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDate, setReminderDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reminderLink, setReminderLink] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [customDate, setCustomDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [customAmount, setCustomAmount] = useState("");
  const [view, setView] = useState<"list" | "week" | "month">("list");
  const reminders = useDataStore((s) => s.reminders);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    let cancelled = false;
    void Promise.all([
      cardStatementRepo.list(userId),
      cardEmiPlanRepo.list(userId),
      cardEmiInstallmentRepo.list(userId),
      insurancePolicyRepo.list(userId),
      obligationRepo.list(userId),
    ]).then(([nextStatements, nextPlans, nextInstallments, nextPolicies, nextObligations]) => {
      if (cancelled) return;
      setStatements(nextStatements);
      setEmiPlans(nextPlans);
      setEmiInstallments(nextInstallments);
      setPolicies(nextPolicies);
      setCustomObligations(nextObligations.filter((row) => row.isDeleted !== 1 && row.sourceType === "custom" && row.status !== "paid"));
    }).catch(() => {
      if (!cancelled) {
        toast({ title: copy.loadFailed, kind: "error" });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user, toast]);

  const rules = useMemo(
    () =>
      recurringRules.filter((rule) => rule.isDeleted !== 1 && (!user || rule.userId === user.id)),
    [recurringRules, user],
  );

  const obligations = useMemo(() => {
    if (!user) return [];
    const recurring = materializeRecurringObligations(recurringRules, user.id, today);
    const loanEmis = materializeLoanEmiObligations(loans, emis, user.id, today);
    const cardStatements = materializeCardStatementObligations(statements, cards, user.id, today);
    const cardEmis = materializeCardEmiObligations(emiInstallments, emiPlans, user.id, today);
    const udhariDues = materializeUdhariObligations(udhari, user.id, today);
    const premiums = materializeInsuranceObligations(policies, user.id, today);
    return mergeObligationsUnique(customObligations, [...recurring, ...loanEmis, ...cardStatements, ...cardEmis, ...udhariDues, ...premiums]);
  }, [user, recurringRules, loans, emis, cards, udhari, statements, emiInstallments, emiPlans, policies, customObligations, today]);

  const visibleObligations = useMemo(() => {
    if (view === "list") return obligations;
    const horizon = view === "week" ? 7 : 30;
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + horizon);
    const endKey = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
    const startKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    return obligations.filter((row) => row.dueDate >= startKey && row.dueDate <= endKey);
  }, [obligations, view, today]);

  const summary = obligationCalendarSummary(obligations, today);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(rule: RecurringRule) {
    setEditing(rule);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
  }

  async function toggleActive(rule: RecurringRule) {
    if (pausingId) return;
    setPausingId(rule.id);
    try {
      const updated = await recurringRepo.update(rule.id, { active: rule.active === 1 ? 0 : 1 });
      if (updated) {
        upsertLocal("recurringRules", updated);
        toast({
          title: updated.active === 1 ? copy.ruleResumed : copy.rulePaused,
          kind: "success",
        });
      }
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : copy.ruleUpdateFailed,
        kind: "error",
      });
    } finally {
      setPausingId(null);
    }
  }

  async function saveOccurrences() {
    if (!user) return;
    try {
      const saved = await persistProjectedObligations(user.id, obligations);
      toast({
        title: saved.length ? copy.datesSaved.replace("{n}", String(saved.length)) : copy.datesAlready,
        description: copy.dateNotExpense,
        kind: "success",
      });
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : copy.datesFailed,
        kind: "error",
      });
    }
  }

  async function addReminder() {
    if (!user) return;
    try {
      const saved = await createInAppReminder(user.id, {
        title: reminderTitle,
        dueDate: reminderDate,
        linkedId: reminderLink.trim() || undefined,
      });
      upsertLocal("reminders", saved);
      setReminderTitle("");
      setReminderLink("");
      toast({
        title: copy.reminderSaved,
        description: copy.reminderSavedBody,
        kind: "success",
      });
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : copy.reminderFailed, kind: "error" });
    }
  }

  async function addCustomDue() {
    if (!user) return;
    try {
      const saved = await createCustomObligation(user.id, {
        title: customTitle,
        dueDate: customDate,
        amountPaise: rupeesToPaise(Number(customAmount)),
      });
      setCustomObligations((current) => mergeObligationsUnique(current, [saved]));
      setCustomTitle("");
      setCustomAmount("");
      toast({
        title: copy.customSaved,
        description: `${saved.title} · ${copy.dateNotExpense}`,
        kind: "success",
      });
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : copy.datesFailed, kind: "error" });
    }
  }

  async function snooze(reminder: Reminder) {
    try {
      const updated = await snoozeReminder(reminder, 1);
      if (updated) upsertLocal("reminders", updated);
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : copy.snoozeFailed, kind: "error" });
    }
  }

  async function finishReminder(reminder: Reminder) {
    const updated = await completeReminder(reminder);
    if (updated) upsertLocal("reminders", updated);
  }

  return (
    <div className="space-y-6">
      <PersonalPageHeader
        screen="billCalendar"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void saveOccurrences()}>
              {copy.saveDates}
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> {copy.newRule}
            </Button>
          </div>
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{copy.next7}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatINR(paiseToRupees(summary.next7DaysPaise))}</p>
            <p className="text-sm text-muted-foreground">{summary.count7} {copy.items}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{copy.next30}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatINR(paiseToRupees(summary.next30DaysPaise))}</p>
            <p className="text-sm text-muted-foreground">{summary.count30} {copy.items}</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{copy.reminders}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Field label={copy.title} className="min-w-[180px] flex-1">
              <Input value={reminderTitle} onChange={(e) => setReminderTitle(e.target.value)} />
            </Field>
            <Field label={copy.due}>
              <Input type="date" value={reminderDate} onChange={(e) => setReminderDate(e.target.value)} />
            </Field>
            <Field label={copy.linkedRecord} className="min-w-[140px]">
              <Input value={reminderLink} onChange={(e) => setReminderLink(e.target.value)} placeholder={copy.linkedOptional} />
            </Field>
            <div className="flex items-end">
              <Button type="button" onClick={() => void addReminder()}>{copy.addReminder}</Button>
            </div>
          </div>
          {reminders.filter((r) => r.isDeleted !== 1 && r.done !== 1).map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 text-sm">
              <span>{r.title} · {formatDate(r.dueDate)}</span>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => void snooze(r)}>{common.snooze}</Button>
                <Button size="sm" variant="outline" onClick={() => void finishReminder(r)}>{common.done}</Button>
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">{copy.inAppOnly}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{copy.upcoming}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(["list", "week", "month"] as const).map((key) => (
              <Button key={key} type="button" size="sm" variant={view === key ? "default" : "outline"} onClick={() => setView(key)}>
                {copy[key]}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Field label={copy.customTitle} className="min-w-[160px] flex-1">
              <Input value={customTitle} onChange={(event) => setCustomTitle(event.target.value)} />
            </Field>
            <Field label={copy.due}>
              <Input type="date" value={customDate} onChange={(event) => setCustomDate(event.target.value)} />
            </Field>
            <Field label={copy.customAmount}>
              <Input value={customAmount} onChange={(event) => setCustomAmount(event.target.value)} inputMode="decimal" />
            </Field>
            <div className="flex items-end">
              <Button type="button" variant="outline" onClick={() => void addCustomDue()}>{copy.addCustom}</Button>
            </div>
          </div>
          {visibleObligations.length === 0 ? (
            <p className="text-muted-foreground">{copy.noDues}</p>
          ) : (
            visibleObligations.map((o) => (
              <div key={o.id} className="flex items-center justify-between border-b py-2 last:border-0">
                <div>
                  <div className="font-medium">{o.title}</div>
                  <div className="text-sm text-muted-foreground">{formatDate(o.dueDate)} · {o.sourceType}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatINR(paiseToRupees(o.amountPaise))}</div>
                  {o.sourceType === "card_statement" && o.title.includes("minimum due unknown") ? (
                    <div className="text-xs text-muted-foreground">Statement balance. Minimum due was not on the statement.</div>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{copy.rules}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rules.length === 0 ? (
            <p className="text-muted-foreground">{copy.noRules}</p>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between gap-3 border-b py-2 last:border-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{rule.title}</span>
                    <Badge variant={rule.active === 1 ? "success" : "warning"}>
                      {rule.active === 1 ? common.active : common.paused}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {frequency[rule.frequency]} · {copy.starts} {formatDate(rule.nextRunDate)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatINR(ruleAmountRupees(rule))}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(rule)}>
                    {common.edit}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pausingId === rule.id}
                    onClick={() => void toggleActive(rule)}
                  >
                    {rule.active === 1 ? copy.pause : copy.resume}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <RecurringRuleDialog
        open={dialogOpen}
        onClose={closeDialog}
        rule={editing}
        userId={user?.id}
        onSaved={(saved) => {
          upsertLocal("recurringRules", saved);
          toast({
            title: editing ? copy.ruleUpdated : copy.ruleSaved,
            kind: "success",
          });
          closeDialog();
        }}
      />
    </div>
  );
}
