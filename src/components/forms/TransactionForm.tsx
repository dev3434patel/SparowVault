import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { PAYMENT_MODES, TRANSACTION_TYPES } from "@/constants";
import { useDataStore } from "@/store/dataStore";
import { useAuthStore } from "@/store/authStore";
import { transactionRepo } from "@/repositories";
import type { NeedWant, PaymentMode, PersonalBusiness, Transaction, TransactionType } from "@/types";
import { transactionSchema } from "@/services/validators";
import { getTransactionFormPhase6Errors } from "@/services/transactionFormRules";
import {
  buildTransactionPreview,
  newPreviewTransactionId,
  type TransactionPreviewContext,
} from "@/services/transactionPreview";
import { syncEmiPaymentFromTransaction } from "@/services/loanPaymentSync";
import { useUIStore } from "@/store/uiStore";
import { isoToLocalDate, localDateToIso } from "@/lib/format";
import { rupeesToPaise, udhariAmountPaise, udhariSettledPaise } from "@/utils/money";

interface Props {
  initial?: Partial<Transaction>;
  forcedType?: TransactionType;
  onCancel: () => void;
  onSaved?: (t: Transaction) => void;
}

function nowDateInput() {
  return format(new Date(), "yyyy-MM-dd");
}

export function TransactionForm({ initial, forcedType, onCancel, onSaved }: Props) {
  const user = useAuthStore((s) => s.currentUser);
  const accounts = useDataStore((s) => s.accounts);
  const categories = useDataStore((s) => s.categories);
  const cards = useDataStore((s) => s.cards);
  const loans = useDataStore((s) => s.loans);
  const goals = useDataStore((s) => s.goals);
  const udhari = useDataStore((s) => s.udhari);
  const investments = useDataStore((s) => s.investments);
  const emis = useDataStore((s) => s.emis);
  const transactions = useDataStore((s) => s.transactions);
  const upsertLocal = useDataStore((s) => s.upsertLocal);
  const toast = useUIStore((s) => s.toast);

  const initialDate = initial?.date ? isoToLocalDate(initial.date) : nowDateInput();

  const [state, setState] = useState({
    date: initialDate,
    type: (forcedType ?? initial?.type ?? "expense") as TransactionType,
    amount: initial?.amount ?? ("" as number | ""),
    categoryId: initial?.categoryId ?? "",
    accountId: initial?.accountId ?? accounts[0]?.id ?? "",
    toAccountId: initial?.toAccountId ?? "",
    linkedCardId: initial?.linkedCardId ?? "",
    linkedLoanId: initial?.linkedLoanId ?? "",
    linkedGoalId: initial?.linkedGoalId ?? "",
    linkedUdhariId: initial?.linkedUdhariId ?? "",
    linkedSavingsId: initial?.linkedSavingsId ?? "",
    paymentMode: (initial?.paymentMode ?? "upi") as PaymentMode,
    merchantOrPerson: initial?.merchantOrPerson ?? "",
    description: initial?.description ?? "",
    notes: initial?.notes ?? "",
    tags: (initial?.tags ?? []) as string[],
    billAvailable: (initial?.billAvailable ?? 0) as 0 | 1,
    gstApplicable: (initial?.gstApplicable ?? 0) as 0 | 1,
    taxFlag: (initial?.taxFlag ?? 0) as 0 | 1,
    businessOrPersonal: (initial?.businessOrPersonal ?? "personal") as PersonalBusiness,
    needWant: (initial?.needWant ?? "unassigned") as NeedWant,
    fixedVariable: (initial?.fixedVariable ?? "unassigned") as
      | "fixed"
      | "variable"
      | "unassigned",
    plannedUnplanned: (initial?.plannedUnplanned ?? "unassigned") as
      | "planned"
      | "unplanned"
      | "unassigned",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const activeCreditCards = useMemo(
    () => cards.filter((c) => c.type === "credit" && c.isInactive !== 1 && c.isDeleted !== 1),
    [cards],
  );

  const filteredCategories = useMemo(() => {
    if (state.type === "income" || (state.type === "refund" && state.paymentMode !== "credit_card")) {
      return categories.filter(
        (c) => !c.archived && (c.appliesTo === "income" || c.appliesTo === "mixed"),
      );
    }
    if (state.type === "expense" || (state.type === "refund" && state.paymentMode === "credit_card")) {
      return categories.filter(
        (c) => !c.archived && (c.appliesTo === "expense" || c.appliesTo === "mixed"),
      );
    }
    if (state.type === "udhari_write_off") {
      return categories.filter(
        (c) => !c.archived && (c.appliesTo === "expense" || c.appliesTo === "mixed"),
      );
    }
    return categories.filter((c) => !c.archived);
  }, [state.type, state.paymentMode, categories]);

  const udhariLinkChoices = useMemo(() => {
    const openish = (u: (typeof udhari)[0]) =>
      u.status !== "settled" && u.status !== "written_off" && udhariAmountPaise(u) > udhariSettledPaise(u);
    if (state.type === "udhari_collect" || state.type === "udhari_write_off") {
      return udhari.filter((u) => u.type === "receivable" && openish(u));
    }
    if (state.type === "udhari_repay") {
      return udhari.filter((u) => u.type === "payable" && openish(u));
    }
    return udhari;
  }, [udhari, state.type]);

  useEffect(() => {
    if (state.categoryId && !filteredCategories.find((c) => c.id === state.categoryId)) {
      setState((s) => ({ ...s, categoryId: "" }));
    }
  }, [filteredCategories, state.categoryId]);

  const previewDraftId = useMemo(
    () => initial?.id ?? newPreviewTransactionId(),
    [initial?.id],
  );

  const phaseErrors = useMemo(() => getTransactionFormPhase6Errors(state), [state]);

  const canSave = useMemo(() => {
    const z = transactionSchema.safeParse(state);
    const p6 = getTransactionFormPhase6Errors(state);
    return z.success && Object.keys(p6).length === 0;
  }, [state]);

  const previewCtx = useMemo((): TransactionPreviewContext | null => {
    if (!user) return null;
    return {
      userId: user.id,
      draftTransactionId: previewDraftId,
      categories,
      emis,
      accounts,
      cards,
      loans,
      goals,
      investments,
      udhari,
      transactions: transactions.filter((t) => t.userId === user.id),
      omitTransactionId: initial?.id,
    };
  }, [
    user,
    previewDraftId,
    categories,
    emis,
    accounts,
    cards,
    loans,
    goals,
    investments,
    udhari,
    transactions,
    initial?.id,
  ]);

  const preview = useMemo(
    () => (previewCtx ? buildTransactionPreview(state, previewCtx) : null),
    [state, previewCtx],
  );

  useEffect(() => {
    if (state.type !== "cc_payment" && state.paymentMode !== "credit_card" && state.linkedCardId) {
      setState((s) => ({ ...s, linkedCardId: "" }));
    }
  }, [state.paymentMode, state.type, state.linkedCardId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || saving) return;
    setErrors({});
    const parse = transactionSchema.safeParse(state);
    if (!parse.success) {
      const flat: Record<string, string> = {};
      for (const issue of parse.error.issues) {
        flat[issue.path.join(".")] = issue.message;
      }
      setErrors(flat);
      return;
    }
    const p6 = getTransactionFormPhase6Errors(state);
    if (Object.keys(p6).length > 0) {
      setErrors(p6);
      return;
    }
    setSaving(true);
    try {
      const iso = localDateToIso(state.date);
      const payload = {
        ...parse.data,
        date: iso,
        amountPaise: rupeesToPaise(parse.data.amount),
      };
      let saved: Transaction;
      if (initial?.id) {
        const patched = await transactionRepo.update(initial.id, payload as Partial<Transaction>);
        if (!patched) throw new Error("Not found");
        saved = patched;
      } else {
        saved = await transactionRepo.create({
          userId: user.id,
          data: payload as unknown as Transaction,
        });
      }
      upsertLocal("transactions", saved);
      if (saved.type === "emi_payment" && saved.linkedLoanId) {
        const loan = loans.find((x) => x.id === saved.linkedLoanId);
        if (loan) {
          const patched = await syncEmiPaymentFromTransaction(saved, loan, emis);
          if (patched) upsertLocal("emis", patched);
        }
      }
      toast({
        title: initial?.id ? "Transaction updated" : "Transaction added",
        kind: "success",
      });
      onSaved?.(saved);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      setErrors({ _: msg });
    } finally {
      setSaving(false);
    }
  }

  function fieldError(key: string): string | undefined {
    return errors[key] ?? phaseErrors[key];
  }

  const txTypes = forcedType
    ? TRANSACTION_TYPES.filter((t) => t.value === forcedType)
    : TRANSACTION_TYPES;

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Type" required error={fieldError("type")}>
        <Select
          value={state.type}
          onValueChange={(v) => {
            const type = v as TransactionType;
            setState((s) => ({
              ...s,
              type,
              paymentMode: type === "transfer" ? "bank_transfer" : s.paymentMode,
            }));
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {txTypes.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Date" required error={fieldError("date")}>
        <Input
          type="date"
          value={state.date}
          onChange={(e) => setState({ ...state, date: e.target.value })}
        />
      </Field>
      <Field label="Amount (₹)" required error={fieldError("amount")}>
        <Input
          type="number"
          step="0.01"
          inputMode="decimal"
          value={state.amount as number}
          onChange={(e) =>
            setState({ ...state, amount: e.target.value === "" ? "" : +e.target.value })
          }
          placeholder="0.00"
        />
      </Field>
      {state.type === "transfer" ? null : (
        <Field label="Payment Mode" required error={fieldError("paymentMode")}>
          <Select
            value={state.paymentMode}
            onValueChange={(v) => setState({ ...state, paymentMode: v as PaymentMode })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_MODES.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
      <Field
        label={
          (state.type === "expense" || state.type === "refund") && state.paymentMode === "credit_card"
            ? "Tag account (optional — does not move cash)"
            : "Account"
        }
        required={
          !(
            (state.type === "expense" || state.type === "refund") &&
            state.paymentMode === "credit_card"
          ) && state.type !== "udhari_write_off"
        }
        error={fieldError("accountId")}
      >
        <Select
          value={
            (state.type === "expense" || state.type === "refund") && state.paymentMode === "credit_card"
              ? state.accountId || "__none__"
              : state.accountId || undefined
          }
          onValueChange={(v) =>
            setState({
              ...state,
              accountId:
                (state.type === "expense" || state.type === "refund") &&
                state.paymentMode === "credit_card" &&
                v === "__none__"
                  ? ""
                  : v,
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select account" />
          </SelectTrigger>
          <SelectContent>
            {(state.type === "expense" || state.type === "refund") && state.paymentMode === "credit_card" ? (
              <SelectItem value="__none__">None (card only)</SelectItem>
            ) : null}
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {state.type === "transfer" ? (
        <Field label="To Account" required error={fieldError("toAccountId")}>
          <Select
            value={state.toAccountId || undefined}
            onValueChange={(v) => setState({ ...state, toAccountId: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Destination account" />
            </SelectTrigger>
            <SelectContent>
              {accounts
                .filter((a) => a.id !== state.accountId)
                .map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </Field>
      ) : state.type === "udhari_collect" || state.type === "udhari_repay" ? null : (
        <Field
          label="Category"
          required={
            state.type === "income" ||
            state.type === "expense" ||
            state.type === "refund" ||
            state.type === "udhari_write_off"
          }
          error={fieldError("categoryId")}
        >
          <Select
            value={state.categoryId || undefined}
            onValueChange={(v) => setState({ ...state, categoryId: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {filteredCategories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.icon ? <span className="mr-1.5">{c.icon}</span> : null}
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      {state.type === "cc_payment" && activeCreditCards.length ? (
        <Field label="Credit Card" className="sm:col-span-2" required error={fieldError("linkedCardId")}>
          <Select
            value={state.linkedCardId || undefined}
            onValueChange={(v) => setState({ ...state, linkedCardId: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select card" />
            </SelectTrigger>
            <SelectContent>
              {activeCreditCards.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nickname} (•••• {c.last4})
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </Field>
      ) : null}
      {(state.type === "emi_payment" || state.type === "loan_prepayment") && loans.length ? (
        <Field label="Loan" className="sm:col-span-2" required error={fieldError("linkedLoanId")}>
          <Select
            value={state.linkedLoanId || undefined}
            onValueChange={(v) => setState({ ...state, linkedLoanId: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select loan" />
            </SelectTrigger>
            <SelectContent>
              {loans.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.lender}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      ) : null}
      {state.type === "loan_disbursement" && loans.length ? (
        <Field label="Loan" className="sm:col-span-2" required error={fieldError("linkedLoanId")}>
          <Select
            value={state.linkedLoanId || undefined}
            onValueChange={(v) => setState({ ...state, linkedLoanId: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select loan" />
            </SelectTrigger>
            <SelectContent>
              {loans.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.lender}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      ) : null}
      {(state.type === "savings_contribution" || state.type === "goal_withdrawal") && goals.length ? (
        <Field label="Goal" className="sm:col-span-2" required error={fieldError("linkedGoalId")}>
          <Select
            value={state.linkedGoalId || undefined}
            onValueChange={(v) => setState({ ...state, linkedGoalId: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select goal" />
            </SelectTrigger>
            <SelectContent>
              {goals.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.icon} {g.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      ) : null}
      {(state.type === "investment_contribution" || state.type === "investment_sell") && investments.length ? (
        <Field label="Investment" className="sm:col-span-2" required error={fieldError("linkedSavingsId")}>
          <Select
            value={state.linkedSavingsId || undefined}
            onValueChange={(v) => setState({ ...state, linkedSavingsId: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select investment" />
            </SelectTrigger>
            <SelectContent>
              {investments.map((i) => (
                <SelectItem key={i.id} value={i.id}>
                  {i.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      ) : null}
      {(state.type === "expense" || state.type === "refund") &&
      state.paymentMode === "credit_card" &&
      activeCreditCards.length ? (
        <Field label="Credit card used" className="sm:col-span-2" required error={fieldError("linkedCardId")}>
          <Select
            value={state.linkedCardId || undefined}
            onValueChange={(v) => setState({ ...state, linkedCardId: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select card" />
            </SelectTrigger>
            <SelectContent>
              {activeCreditCards.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nickname} (•••• {c.last4})
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </Field>
      ) : null}
      {(state.type === "udhari_given" ||
        state.type === "udhari_received" ||
        state.type === "udhari_collect" ||
        state.type === "udhari_repay" ||
        state.type === "udhari_write_off") &&
      udhariLinkChoices.length ? (
        <Field label="Udhari Record" className="sm:col-span-2" required error={fieldError("linkedUdhariId")}>
          <Select
            value={state.linkedUdhariId || undefined}
            onValueChange={(v) => setState({ ...state, linkedUdhariId: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select udhari record" />
            </SelectTrigger>
            <SelectContent>
              {udhariLinkChoices.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.personName} — {u.type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      ) : null}

      <Field
        label="Merchant / Person"
        className="sm:col-span-2"
        required={
          state.type === "udhari_given" ||
          state.type === "udhari_received" ||
          state.type === "udhari_collect" ||
          state.type === "udhari_repay"
        }
        error={fieldError("merchantOrPerson")}
      >
        <Input
          value={state.merchantOrPerson}
          onChange={(e) => setState({ ...state, merchantOrPerson: e.target.value })}
          placeholder="e.g. Swiggy, HDFC, Rahul"
        />
      </Field>

      <Field label="Description" className="sm:col-span-2">
        <Input
          value={state.description}
          onChange={(e) => setState({ ...state, description: e.target.value })}
          placeholder="Short description"
        />
      </Field>

      <Field label="Tags (comma-separated)" className="sm:col-span-2">
        <Input
          value={state.tags.join(", ")}
          onChange={(e) =>
            setState({
              ...state,
              tags: e.target.value
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
            })
          }
          placeholder="e.g. family, festive"
        />
      </Field>

      <Field label="Notes" className="sm:col-span-2">
        <Textarea
          value={state.notes}
          onChange={(e) => setState({ ...state, notes: e.target.value })}
          placeholder="Optional notes"
          rows={2}
        />
      </Field>

      <div className="col-span-1 grid grid-cols-1 gap-3 rounded-md border border-border bg-surface p-3 sm:col-span-2 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={!!state.billAvailable}
            onCheckedChange={(c) => setState({ ...state, billAvailable: c ? 1 : 0 })}
          />
          Bill available
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={!!state.gstApplicable}
            onCheckedChange={(c) => setState({ ...state, gstApplicable: c ? 1 : 0 })}
          />
          GST applicable
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={!!state.taxFlag}
            onCheckedChange={(c) => setState({ ...state, taxFlag: c ? 1 : 0 })}
          />
          Tax relevant
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={state.businessOrPersonal === "business"}
            onCheckedChange={(c) =>
              setState({ ...state, businessOrPersonal: c ? "business" : "personal" })
            }
          />
          Business (not personal)
        </label>
      </div>

      <Field label="Need / Want">
        <Select
          value={state.needWant}
          onValueChange={(v) =>
            setState({ ...state, needWant: v as typeof state.needWant })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            <SelectItem value="need">Need</SelectItem>
            <SelectItem value="want">Want</SelectItem>
            <SelectItem value="luxury">Luxury</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Fixed / Variable">
        <Select
          value={state.fixedVariable}
          onValueChange={(v) =>
            setState({ ...state, fixedVariable: v as typeof state.fixedVariable })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            <SelectItem value="fixed">Fixed</SelectItem>
            <SelectItem value="variable">Variable</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      {preview?.lines.length ? (
        <div className="sm:col-span-2 space-y-2 rounded-md border border-border bg-muted/30 p-3 text-sm leading-relaxed">
          <div className="font-medium text-foreground">Before you save</div>
          <ul className="list-inside list-disc space-y-1 text-muted-foreground">
            {preview.lines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {errors._ ? (
        <div className="sm:col-span-2 rounded-md bg-expense-soft p-3 text-sm text-danger">
          {errors._}
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:col-span-2 sm:flex-row sm:items-center sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={saving} disabled={!canSave}>
          {initial?.id ? "Save Changes" : "Add Transaction"}
        </Button>
      </div>
    </form>
  );
}

