import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { recurringRepo } from "@/repositories";
import type { PaymentMode, RecurringRule, TransactionType } from "@/types";
import { paiseToRupees, rupeesToPaise } from "@/utils/money";
import { useMessages } from "@/i18n/useMessages";

const DEFAULT_TYPE: TransactionType = "expense";
const DEFAULT_PAYMENT_MODE: PaymentMode = "auto_debit";

/** Frequencies the form offers. `daily` stays available only when editing a rule that already uses it. */
const FORM_FREQUENCIES: RecurringRule["frequency"][] = ["weekly", "monthly", "quarterly", "yearly"];

function todayLocalISO(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function amountFieldValue(rule: RecurringRule): string {
  const paise =
    rule.amountPaise != null && Number.isFinite(rule.amountPaise)
      ? Math.round(rule.amountPaise)
      : rupeesToPaise(rule.amount);
  return String(paiseToRupees(paise));
}

function calendarParts(isoDate: string): { dayOfMonth: number; dayOfWeek: number } {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  return { dayOfMonth: date.getDate(), dayOfWeek: date.getDay() };
}

export function RecurringRuleDialog({
  open,
  onClose,
  rule,
  onSaved,
  userId,
}: {
  open: boolean;
  onClose: () => void;
  rule: RecurringRule | null;
  onSaved: (rule: RecurringRule) => void;
  userId?: string;
}) {
  const copy = useMessages().copy.recurring;
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<RecurringRule["frequency"]>("monthly");
  const [startDate, setStartDate] = useState(todayLocalISO);
  const [active, setActive] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (rule) {
      setName(rule.title);
      setAmount(amountFieldValue(rule));
      setFrequency(rule.frequency);
      setStartDate(rule.nextRunDate.slice(0, 10));
      setActive(rule.active === 1);
    } else {
      setName("");
      setAmount("");
      setFrequency("monthly");
      setStartDate(todayLocalISO());
      setActive(true);
    }
    setErr(null);
    setSaving(false);
  }, [open, rule]);

  const frequencyOptions: RecurringRule["frequency"][] =
    rule?.frequency === "daily" ? ["daily", ...FORM_FREQUENCIES] : FORM_FREQUENCIES;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!userId || saving) return;
    const title = name.trim();
    if (!title) {
      setErr(copy.nameRequired);
      return;
    }
    const amountPaise = rupeesToPaise(amount);
    if (amountPaise <= 0) {
      setErr(copy.amountRequired);
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      setErr(copy.startRequired);
      return;
    }
    const { dayOfMonth, dayOfWeek } = calendarParts(startDate);
    const persisted = {
      title,
      amount: paiseToRupees(amountPaise),
      amountPaise,
      frequency,
      nextRunDate: startDate,
      dayOfMonth,
      dayOfWeek,
      active: (active ? 1 : 0) as 0 | 1,
    };
    setErr(null);
    setSaving(true);
    try {
      if (rule) {
        const updated = await recurringRepo.update(rule.id, persisted);
        if (updated) onSaved(updated);
        else setErr(copy.updateFailed);
      } else {
        const created = await recurringRepo.create({
          userId,
          data: {
            ...persisted,
            type: DEFAULT_TYPE,
            paymentMode: DEFAULT_PAYMENT_MODE,
          },
        });
        onSaved(created);
      }
    } catch (error) {
      setErr(error instanceof Error ? error.message : copy.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{rule ? copy.edit : copy.new}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Field label={copy.name} required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Rent"
            />
          </Field>
          <Field label={copy.amount} required>
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </Field>
          <Field
            label={copy.frequency}
            hint={
              frequency === "monthly"
                ? copy.monthlyHint
                : copy.otherHint
            }
          >
            <Select value={frequency} onValueChange={(v) => setFrequency(v as RecurringRule["frequency"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {frequencyOptions.map((value) => (
                  <SelectItem key={value} value={value}>
                    {copy[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={copy.start} required hint={copy.startHint}>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={active} onCheckedChange={(v) => setActive(v === true)} />
            Active
          </label>
          <p className="text-xs text-muted-foreground">
            Uncheck to pause. A paused rule stays saved and is not turned into an expense.
          </p>
          {err ? <div className="rounded-md bg-expense-soft p-2 text-xs text-danger">{err}</div> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={saving}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
