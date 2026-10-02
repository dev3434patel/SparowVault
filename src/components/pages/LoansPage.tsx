import { useEffect, useMemo, useState } from "react";
import { PersonalPageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  EmptyState,
} from "@/components/ui/Table";
import { useDataStore } from "@/store/dataStore";
import { useAuthStore } from "@/store/authStore";
import { loanRepo } from "@/repositories";
import type { EMIPayment, Loan } from "@/types";
import { useUIStore } from "@/store/uiStore";
import { confirm } from "@/store/uiStore";
import { loanSchema } from "@/services/validators";
import { planCapMessage, snapshotFromEffectiveFeatures } from "@/services/modulePolicy";
import { useMessages } from "@/i18n/useMessages";
import { useCloudAppStore } from "@/store/cloudAppStore";
import {
  amortizationSchedule,
  calculateEMI,
  sumIncome,
  summarizeLoan,
} from "@/services/calculations";
import { buildCreditCardIntel } from "@/services/cardEngine";
import {
  buildDebtSummary,
  buildEmiPaymentIntelligence,
  calculateForeclosureBreakdown,
  importedLoanConfidence,
  isImportedLoanLifecycle,
  loanInterestMethodLabel,
  simulatePrepaymentOptions,
} from "@/services/loanEngine";
import { LOAN_TYPE_LABELS } from "@/constants";
import { formatINR, formatDate, formatPercent, isoToLocalDate, localDateToIso } from "@/lib/format";
import {
  emiPaymentPaidPaise,
  paiseToRupees,
  rupeesToPaise,
  safeParseMoneyInput,
} from "@/utils/money";
import { Landmark, Pencil, Plus, Trash2, Ban } from "lucide-react";
import { format } from "date-fns";
import { refsForLoan } from "@/services/refIntegrity";

export function LoansPage() {
  const messages = useMessages();
  const fields = messages.fields;
  const copy = messages.copy.loans;
  const user = useAuthStore((s) => s.currentUser);
  const loans = useDataStore((s) => s.loans);
  const emis = useDataStore((s) => s.emis);
  const cards = useDataStore((s) => s.cards);
  const udhari = useDataStore((s) => s.udhari);
  const transactions = useDataStore((s) => s.transactions);
  const ledgerEffects = useDataStore((s) => s.ledgerEffects);
  const upsertLocal = useDataStore((s) => s.upsertLocal);
  const removeLocal = useDataStore((s) => s.removeLocal);
  const toast = useUIStore((s) => s.toast);

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Loan | null>(null);
  const [viewing, setViewing] = useState<Loan | null>(null);

  const summaries = useMemo(() => {
    const m = new Map<string, ReturnType<typeof summarizeLoan>>();
    for (const l of loans) m.set(l.id, summarizeLoan(l, emis.filter((e) => e.loanId === l.id)));
    return m;
  }, [loans, emis]);

  const totals = useMemo(() => {
    let outstanding = 0;
    let monthlyEMI = 0;
    let totalInterest = 0;
    for (const l of loans) {
      const s = summaries.get(l.id);
      if (!s) continue;
      outstanding += s.outstandingPrincipalPaise;
      monthlyEMI += s.emiPaise;
      totalInterest += s.totalInterestPaise;
    }
    return { outstanding, monthlyEMI, totalInterest };
  }, [loans, summaries]);

  const monthlyIncomePaise = useMemo(() => {
    const monthKey = new Date().toISOString().slice(0, 7);
    return sumIncome(
      transactions.filter((t) => t.isDeleted !== 1 && t.date.slice(0, 7) === monthKey),
    );
  }, [transactions]);

  const debtSummary = useMemo(
    () => buildDebtSummary(loans, emis, cards, udhari, ledgerEffects, monthlyIncomePaise),
    [loans, emis, cards, udhari, ledgerEffects, monthlyIncomePaise],
  );

  const upcomingDebtDues = useMemo(() => {
    const rows: Array<{ id: string; label: string; due: string; amountPaise: number }> = [];
    for (const l of loans) {
      if (l.status === "closed" || l.isDeleted === 1) continue;
      const s = summaries.get(l.id);
      if (s?.nextDueDate) {
        rows.push({
          id: `loan:${l.id}`,
          label: `${l.lender} EMI`,
          due: s.nextDueDate,
          amountPaise: s.emiPaise,
        });
      }
    }
    for (const c of cards) {
      if (c.type !== "credit" || c.isDeleted === 1 || c.isInactive === 1) continue;
      const intel = buildCreditCardIntel(c, transactions, ledgerEffects);
      if (intel?.nextDueDateIso && intel.fullDuePaise > 0) {
        rows.push({
          id: `card:${c.id}`,
          label: `${c.nickname} card full due`,
          due: intel.nextDueDateIso,
          amountPaise: intel.fullDuePaise,
        });
      }
    }
    return rows.sort((a, b) => a.due.localeCompare(b.due)).slice(0, 5);
  }, [cards, ledgerEffects, loans, summaries, transactions]);

  const [prepayByLoan, setPrepayByLoan] = useState<Record<string, string>>({});

  async function handleCloseLoan(l: Loan) {
    if (l.status === "closed") return;
    const ok = await confirm({
      title: copy.closeTitle,
      description: copy.closeBody,
      confirmLabel: copy.close,
    });
    if (!ok) return;
    const updated = await loanRepo.update(l.id, { status: "closed" });
    if (updated) {
      upsertLocal("loans", updated);
      toast({ title: copy.closed, kind: "success" });
    }
  }

  async function handleDelete(id: string) {
    const refs = refsForLoan(id);
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
    await loanRepo.softDelete(id);
    removeLocal("loans", id);
    toast({ title: copy.removed, kind: "info" });
  }

  return (
    <div>
      <PersonalPageHeader
        screen="loans"
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> New Loan
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total outstanding</CardDescription>
            <CardTitle className="tabular-nums text-expense">
              {formatINR(paiseToRupees(totals.outstanding))}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Monthly EMI</CardDescription>
            <CardTitle className="tabular-nums">{formatINR(paiseToRupees(totals.monthlyEMI))}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total interest</CardDescription>
            <CardTitle className="tabular-nums">{formatINR(paiseToRupees(totals.totalInterest))}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Active loans</CardDescription>
            <CardTitle>{loans.filter((l) => l.status === "active").length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Debt summary</CardTitle>
          <CardDescription>
            Loans, credit cards, and udhari payable combined into one debt view. EMI burden is
            your monthly loan commitment; debt-to-income compares that EMI load with this month&apos;s income.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4 xl:grid-cols-8">
          <div>
            <div className="text-muted-foreground">Loan outstanding</div>
            <div className="tabular-nums font-semibold">
              {formatINR(paiseToRupees(debtSummary.totalLoanOutstandingPaise), { decimals: 0 })}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Card outstanding</div>
            <div className="tabular-nums font-semibold">
              {formatINR(paiseToRupees(debtSummary.cardOutstandingPaise), { decimals: 0 })}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Udhari payable</div>
            <div className="tabular-nums font-semibold">
              {formatINR(paiseToRupees(debtSummary.udhariPayablePaise), { decimals: 0 })}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Total debt</div>
            <div className="tabular-nums font-semibold text-expense">
              {formatINR(paiseToRupees(debtSummary.totalDebtPaise), { decimals: 0 })}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Priority</div>
            <div className="font-semibold">{debtSummary.highInterestPriority ?? copy.none}</div>
          </div>
          <div>
            <div className="text-muted-foreground">EMI burden</div>
            <div className="tabular-nums font-semibold">
              {formatINR(paiseToRupees(debtSummary.monthlyEmiBurdenPaise), { decimals: 0 })}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Debt-to-income</div>
            <div className="tabular-nums font-semibold">
              {debtSummary.debtToIncomePct === null
                ? copy.addIncome
                : formatPercent(debtSummary.debtToIncomePct, 1)}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Upcoming dues</div>
            <div className="font-semibold">{upcomingDebtDues.length}</div>
          </div>
          <div className="col-span-2 md:col-span-4 xl:col-span-8">
            <div className="text-muted-foreground">Next debt due dates</div>
            {upcomingDebtDues.length === 0 ? (
              <div className="text-xs text-muted-foreground">No upcoming loan or card dues found.</div>
            ) : (
              <div className="mt-1 flex flex-wrap gap-2">
                {upcomingDebtDues.map((due) => (
                  <Badge key={due.id} variant="outline">
                    {due.label}: {formatINR(paiseToRupees(due.amountPaise), { decimals: 0 })} on{" "}
                    {formatDate(due.due)}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {loans.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<Landmark className="h-6 w-6" />}
              title={copy.emptyTitle}
              description={copy.emptyBody}
              action={
                <Button onClick={() => setAdding(true)}>
                  <Plus className="h-4 w-4" /> Add Loan
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {loans.map((l) => {
            const s = summaries.get(l.id);
            if (!s) return null;
            const loanEmis = emis.filter((e) => e.loanId === l.id);
            const pct =
              s.originalPrincipalPaise > 0
                ? (s.principalPaidPaise / s.originalPrincipalPaise) * 100
                : 0;
            const prepKey = prepayByLoan[l.id] ?? "";
            const prepPaise = safeParseMoneyInput(prepKey);
            const prepImpact =
              prepPaise > 0 && l.prepaymentAllowed === 1
                ? simulatePrepaymentOptions(l, loanEmis, prepPaise)
                : null;
            const foreclosure = calculateForeclosureBreakdown(l, loanEmis);
            const confidence = importedLoanConfidence(l);
            const partialRiskCount = loanEmis
              .map((e) => buildEmiPaymentIntelligence(e))
              .filter((e) => e.status === "partial" || e.risk === "high").length;
            return (
              <Card key={l.id}>
                <CardContent className="p-5">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-muted-foreground">
                        {LOAN_TYPE_LABELS[l.loanType]}
                        {isImportedLoanLifecycle(l) ? " · Imported / ongoing" : null}
                      </div>
                      <div className="text-lg font-semibold">{l.lender}</div>
                      <div className="text-xs text-muted-foreground">
                        Original {formatINR(paiseToRupees(s.originalPrincipalPaise), { decimals: 0 })} ·{" "}
                        {l.tenureMonths} mo @ {l.annualInterestRate}% · Due day {l.emiDueDay}
                      </div>
                    </div>
                    <Badge variant={l.status === "active" ? "warning" : "success"}>
                      {l.status}
                    </Badge>
                  </div>
                  <p className="mb-3 rounded-md bg-muted/50 p-2 text-xs leading-relaxed text-muted-foreground">
                    {s.friendlySummaryLine}
                  </p>
                  {partialRiskCount > 0 ? (
                    <p className="mb-3 rounded-md bg-warning-soft p-2 text-xs text-warning">
                      {partialRiskCount} EMI line(s) are partial, late, skipped, or otherwise risky. Partial EMI does not count as a full paid month.
                    </p>
                  ) : null}
                  <div className="mb-3 grid grid-cols-2 gap-3 text-xs md:grid-cols-3">
                    <div>
                      <div className="text-muted-foreground">Current principal</div>
                      <div className="tabular-nums font-semibold text-expense">
                        {formatINR(paiseToRupees(s.outstandingPrincipalPaise), { decimals: 0 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Principal paid</div>
                      <div className="tabular-nums font-medium text-income">
                        {formatINR(paiseToRupees(s.principalPaidPaise), { decimals: 0 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Interest paid</div>
                      <div className="tabular-nums font-medium">
                        {formatINR(paiseToRupees(s.interestPaidPaise), { decimals: 0 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Rem. interest (est.)</div>
                      <div className="tabular-nums font-medium">
                        {formatINR(paiseToRupees(s.remainingInterestEstimatePaise), { decimals: 0 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Next EMI</div>
                      <div className="tabular-nums font-semibold">
                        {formatINR(paiseToRupees(s.emiPaise), { decimals: 0 })}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {s.nextDueDate ? formatDate(s.nextDueDate) : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Overdue</div>
                      <div className="tabular-nums font-medium text-expense">
                        {s.overdueEmiCount > 0
                          ? `${s.overdueEmiCount} · ${formatINR(paiseToRupees(s.overdueAmountPaise), { decimals: 0 })}`
                          : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Rem. tenure (est.)</div>
                      <div className="font-medium">{s.monthsPending} mo</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Foreclosure (est.)</div>
                      <div className="tabular-nums text-xs">
                        {formatINR(paiseToRupees(s.foreclosureEstimatePaise), { decimals: 0 })}
                      </div>
                    </div>
                  </div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Principal repaid</span>
                    <span className="tabular-nums">{formatPercent(pct, 0)}</span>
                  </div>
                  <Progress value={Math.min(100, pct)} tone="income" />
                  {l.prepaymentAllowed === 1 && l.status === "active" ? (
                    <div className="mt-3 flex flex-wrap items-end gap-2 rounded-md border border-border p-2">
                      <Field label={fields.prepayment} className="min-w-[140px] flex-1">
                        <Input
                          inputMode="decimal"
                          placeholder="e.g. 50000"
                          value={prepKey}
                          onChange={(e) =>
                            setPrepayByLoan((m) => ({ ...m, [l.id]: e.target.value }))
                          }
                        />
                      </Field>
                      {prepImpact && prepPaise > 0 ? (
                        <div className="text-xs text-muted-foreground">
                          Option A reduce tenure saves (est.):{" "}
                          <span className="font-medium text-income tabular-nums">
                            {formatINR(paiseToRupees(prepImpact.optionReduceTenure.interestDeltaPaise), { decimals: 0 })}
                          </span>
                          <span className="mx-1">·</span>
                          ~{prepImpact.optionReduceTenure.newRemainingTenureMonths} mo left at current EMI
                          <br />
                          Option B reduce EMI:{" "}
                          <span className="font-medium tabular-nums">
                            {formatINR(paiseToRupees(prepImpact.optionReduceEmi.newEmiPaise), { decimals: 0 })}/mo
                          </span>
                          <br />
                          {prepImpact.explanation}
                          <br />
                          Reduce tenure means keep EMI similar and finish earlier. Reduce EMI means keep
                          tenure similar and lower monthly pressure.
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="mt-3 rounded-md border border-border p-2 text-xs text-muted-foreground">
                    <div>{loanInterestMethodLabel(l)}</div>
                    {isImportedLoanLifecycle(l) ? (
                      <div>
                        Imported loan confidence: <span className="font-medium">{confidence}</span>
                      </div>
                    ) : null}
                    <div>
                      Foreclosure estimate: principal{" "}
                      {formatINR(paiseToRupees(foreclosure.outstandingPrincipalPaise), { decimals: 0 })}
                      {" + "}interest{" "}
                      {formatINR(paiseToRupees(foreclosure.accruedInterestPaise), { decimals: 0 })}
                      {" + "}charges{" "}
                      {formatINR(paiseToRupees(foreclosure.foreclosureChargePaise + foreclosure.pendingPenaltyFeePaise), { decimals: 0 })}
                      {" = "}
                      <span className="font-semibold text-foreground">
                        {formatINR(paiseToRupees(foreclosure.finalClosureAmountPaise), { decimals: 0 })}
                      </span>
                    </div>
                    <div>
                      Foreclosure means closing the loan early. This estimate adds remaining principal,
                      one-month accrued interest, foreclosure charges, and pending penalties/fees.
                    </div>
                    <div>{foreclosure.reminder}</div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <Button size="sm" variant="outline" onClick={() => setViewing(l)}>
                      Schedule &amp; history
                    </Button>
                    <div className="flex flex-wrap gap-1">
                      {l.status === "active" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleCloseLoan(l)}
                          title={copy.close}
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                      <Button size="icon-sm" variant="ghost" onClick={() => setEditing(l)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon-sm" variant="ghost" onClick={() => handleDelete(l.id)}>
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

      <LoanForm
        open={adding || !!editing}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
        loan={editing}
        cards={cards}
        userId={user?.id}
        onSaved={(l) => {
          upsertLocal("loans", l);
          toast({ title: editing ? copy.updated : copy.added, kind: "success" });
          setAdding(false);
          setEditing(null);
        }}
      />

      <AmortDialog
        loan={viewing}
        emis={emis}
        onClose={() => setViewing(null)}
      />
    </div>
  );
}

function AmortDialog({
  loan,
  emis,
  onClose,
}: {
  loan: Loan | null;
  emis: EMIPayment[];
  onClose: () => void;
}) {
  const rows = useMemo(() => (loan ? amortizationSchedule(loan) : []), [loan]);
  const loanEmis = useMemo(
    () => (loan ? emis.filter((e) => e.loanId === loan.id && e.isDeleted !== 1) : []),
    [loan, emis],
  );
  const emiByMonth = useMemo(() => {
    const m = new Map<string, EMIPayment>();
    for (const e of loanEmis) m.set(e.dueDate.slice(0, 7), e);
    return m;
  }, [loanEmis]);

  return (
    <Dialog open={!!loan} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>Amortization — {loan?.lender}</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Advanced view: scheduled principal, interest, and closing balance after each instalment.
            “Paid” reflects stored EMI lines linked to this loan.
          </p>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Scheduled EMI</TableHead>
                <TableHead className="text-right">Principal</TableHead>
                <TableHead className="text-right">Interest</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const ym = r.dueDate.slice(0, 7);
                const hit = emiByMonth.get(ym);
                const paid = hit ? emiPaymentPaidPaise(hit) : 0;
                return (
                  <TableRow key={r.monthIndex}>
                    <TableCell>{r.monthIndex}</TableCell>
                    <TableCell>{formatDate(r.dueDate)}</TableCell>
                    <TableCell className="tabular-nums text-right">
                      {formatINR(paiseToRupees(r.emiPaise), { decimals: 0 })}
                    </TableCell>
                    <TableCell className="tabular-nums text-right text-income">
                      {formatINR(paiseToRupees(r.principalPaise), { decimals: 0 })}
                    </TableCell>
                    <TableCell className="tabular-nums text-right text-expense">
                      {formatINR(paiseToRupees(r.interestPaise), { decimals: 0 })}
                    </TableCell>
                    <TableCell className="tabular-nums text-right font-medium">
                      {formatINR(paiseToRupees(r.balancePaise), { decimals: 0 })}
                    </TableCell>
                    <TableCell className="tabular-nums text-right">
                      {hit ? formatINR(paiseToRupees(paid), { decimals: 0 }) : "—"}
                    </TableCell>
                    <TableCell className="text-center text-xs">
                      {hit?.status ?? "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LoanForm({
  open,
  onClose,
  loan,
  cards,
  userId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  loan: Loan | null;
  cards: Array<{ id: string; nickname: string; bank: string }>;
  userId?: string;
  onSaved: (l: Loan) => void;
}) {
  const messages = useMessages();
  const fields = messages.fields;
  const copy = messages.copy.loans;
  const [state, setState] = useState({
    lender: loan?.lender ?? "",
    loanType: loan?.loanType ?? "personal",
    interestType: loan?.interestType ?? "reducing_balance",
    lifecycleMode: loan?.lifecycleMode ?? "fresh",
    principal: loan?.principal ?? 0,
    disbursedAmount: loan?.disbursedAmount ?? loan?.principal ?? 0,
    startDate: loan?.startDate ? isoToLocalDate(loan.startDate) : format(new Date(), "yyyy-MM-dd"),
    firstEmiDate: loan?.firstEmiDate ? isoToLocalDate(loan.firstEmiDate) : "",
    tenureMonths: loan?.tenureMonths ?? 36,
    annualInterestRate: loan?.annualInterestRate ?? 10,
    emiDueDay: loan?.emiDueDay ?? 5,
    completedEmis: loan?.completedEmis ?? 0,
    remainingEmis: loan?.remainingEmis ?? 0,
    outstandingPrincipal: loan?.outstandingPrincipal ?? 0,
    nextDueDate: loan?.nextDueDate ? isoToLocalDate(loan.nextDueDate) : "",
    emiAmountOverride: loan?.emiAmountOverride ?? 0,
    processingFee: loan?.processingFee ?? 0,
    insuranceCost: loan?.insuranceCost ?? 0,
    prepaymentAllowed: (loan?.prepaymentAllowed ?? 1) as 0 | 1,
    foreclosureCharges: loan?.foreclosureCharges ?? 2,
    linkedCardId: loan?.linkedCardId ?? "",
    blockedAmount: loan?.blockedAmount ?? 0,
    notes: loan?.notes ?? "",
  });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setState({
      lender: loan?.lender ?? "",
      loanType: loan?.loanType ?? "personal",
      interestType: loan?.interestType ?? "reducing_balance",
      lifecycleMode: loan?.lifecycleMode ?? "fresh",
      principal: loan?.principal ?? 0,
      disbursedAmount: loan?.disbursedAmount ?? loan?.principal ?? 0,
      startDate: loan?.startDate
        ? isoToLocalDate(loan.startDate)
        : format(new Date(), "yyyy-MM-dd"),
      firstEmiDate: loan?.firstEmiDate ? isoToLocalDate(loan.firstEmiDate) : "",
      tenureMonths: loan?.tenureMonths ?? 36,
      annualInterestRate: loan?.annualInterestRate ?? 10,
      emiDueDay: loan?.emiDueDay ?? 5,
      completedEmis: loan?.completedEmis ?? 0,
      remainingEmis: loan?.remainingEmis ?? 0,
      outstandingPrincipal: loan?.outstandingPrincipal ?? 0,
      nextDueDate: loan?.nextDueDate ? isoToLocalDate(loan.nextDueDate) : "",
      emiAmountOverride: loan?.emiAmountOverride ?? 0,
      processingFee: loan?.processingFee ?? 0,
      insuranceCost: loan?.insuranceCost ?? 0,
      prepaymentAllowed: (loan?.prepaymentAllowed ?? 1) as 0 | 1,
      foreclosureCharges: loan?.foreclosureCharges ?? 2,
      linkedCardId: loan?.linkedCardId ?? "",
      blockedAmount: loan?.blockedAmount ?? 0,
      notes: loan?.notes ?? "",
    });
    setErr(null);
  }, [loan, open]);

  const importedLifecycle = isImportedLoanLifecycle({
    lifecycleMode: state.lifecycleMode as Loan["lifecycleMode"],
  });

  const emiPreviewPaise = calculateEMI(
    rupeesToPaise(
      importedLifecycle && state.outstandingPrincipal > 0
        ? state.outstandingPrincipal
        : state.principal,
    ),
    state.annualInterestRate,
    importedLifecycle && state.remainingEmis > 0 ? state.remainingEmis : state.tenureMonths,
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const parse = loanSchema.safeParse(state);
    if (!parse.success) {
      setErr(parse.error.issues[0]?.message ?? copy.invalid);
      return;
    }
    setSaving(true);
    try {
      const imported =
        parse.data.lifecycleMode === "existing" ||
        parse.data.lifecycleMode === "ongoing_imported";
      const payload = {
        ...parse.data,
        startDate: localDateToIso(parse.data.startDate),
        firstEmiDate: parse.data.firstEmiDate
          ? localDateToIso(parse.data.firstEmiDate)
          : undefined,
        nextDueDate: parse.data.nextDueDate
          ? localDateToIso(parse.data.nextDueDate)
          : undefined,
        linkedCardId: parse.data.linkedCardId || undefined,
        emiAmountOverride:
          parse.data.emiAmountOverride && parse.data.emiAmountOverride > 0
            ? parse.data.emiAmountOverride
            : undefined,
        outstandingPrincipal:
          imported && parse.data.outstandingPrincipal !== undefined
            ? parse.data.outstandingPrincipal
            : undefined,
        remainingEmis: imported && parse.data.remainingEmis !== undefined ? parse.data.remainingEmis : undefined,
        completedEmis: imported && parse.data.completedEmis !== undefined ? parse.data.completedEmis : undefined,
        blockedAmount:
          parse.data.linkedCardId && parse.data.blockedAmount !== undefined
            ? parse.data.blockedAmount
            : undefined,
      };
      if (!loan) {
        const cap = planCapMessage(
          snapshotFromEffectiveFeatures(useCloudAppStore.getState().effectiveFeatures),
          "loans",
          useDataStore.getState().loans.filter((row) => row.isDeleted !== 1).length,
        );
        if (cap) {
          setErr(cap);
          return;
        }
      }
      if (loan) {
        const updated = await loanRepo.update(loan.id, payload as unknown as Partial<Loan>);
        if (updated) onSaved(updated);
      } else {
        const created = await loanRepo.create({
          userId,
          data: { ...payload, status: "active" } as unknown as Loan,
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
          <DialogTitle>{loan ? copy.edit : copy.new}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <Field label={fields.lender} required className="col-span-2">
            <Input
              value={state.lender}
              onChange={(e) => setState({ ...state, lender: e.target.value })}
              placeholder="HDFC Bank"
            />
          </Field>
          <Field label={fields.loanType}>
            <Select
              value={state.loanType}
              onValueChange={(v) =>
                setState({ ...state, loanType: v as typeof state.loanType })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LOAN_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={fields.trackingMode}>
            <Select
              value={state.lifecycleMode}
              onValueChange={(v) =>
                setState({ ...state, lifecycleMode: v as typeof state.lifecycleMode })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fresh">Fresh new loan</SelectItem>
                <SelectItem value="existing">Already running (legacy)</SelectItem>
                <SelectItem value="ongoing_imported">Ongoing — imported mid-course</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label={fields.interestMethod}>
            <Select
              value={state.interestType}
              onValueChange={(v) => setState({ ...state, interestType: v as typeof state.interestType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reducing_balance">Reducing balance</SelectItem>
                <SelectItem value="flat_interest">Flat interest</SelectItem>
                <SelectItem value="interest_only">Interest only</SelectItem>
                <SelectItem value="custom_manual">Custom / manual</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label={fields.startDate} required>
            <Input
              type="date"
              value={state.startDate}
              onChange={(e) => setState({ ...state, startDate: e.target.value })}
            />
          </Field>
          <Field label={fields.principal} required>
            <Input
              type="number"
              value={state.principal}
              onChange={(e) => setState({ ...state, principal: +e.target.value })}
            />
          </Field>
          <Field label={fields.disbursed}>
            <Input
              type="number"
              min={0}
              value={state.disbursedAmount}
              onChange={(e) => setState({ ...state, disbursedAmount: +e.target.value })}
            />
          </Field>
          <Field label={fields.firstEmi}>
            <Input
              type="date"
              value={state.firstEmiDate}
              onChange={(e) => setState({ ...state, firstEmiDate: e.target.value })}
            />
          </Field>
          <Field label={fields.tenure} required>
            <Input
              type="number"
              value={state.tenureMonths}
              onChange={(e) => setState({ ...state, tenureMonths: +e.target.value })}
            />
          </Field>
          <Field label={fields.interestPct}>
            <Input
              type="number"
              step="0.01"
              value={state.annualInterestRate}
              onChange={(e) =>
                setState({ ...state, annualInterestRate: +e.target.value })
              }
            />
          </Field>
          <Field label={fields.emiDueDay}>
            <Input
              type="number"
              min={1}
              max={28}
              value={state.emiDueDay}
              onChange={(e) => setState({ ...state, emiDueDay: +e.target.value })}
            />
          </Field>
          <Field label={fields.processingFee}>
            <Input
              type="number"
              value={state.processingFee}
              onChange={(e) => setState({ ...state, processingFee: +e.target.value })}
            />
          </Field>
          {importedLifecycle ? (
            <>
              <Field label={fields.completedEmis}>
                <Input
                  type="number"
                  min={0}
                  value={state.completedEmis}
                  onChange={(e) => setState({ ...state, completedEmis: +e.target.value })}
                />
              </Field>
              <Field label={fields.remainingEmis}>
                <Input
                  type="number"
                  min={0}
                  value={state.remainingEmis}
                  onChange={(e) => setState({ ...state, remainingEmis: +e.target.value })}
                />
              </Field>
              <Field label={fields.outstanding}>
                <Input
                  type="number"
                  min={0}
                  value={state.outstandingPrincipal}
                  onChange={(e) =>
                    setState({ ...state, outstandingPrincipal: +e.target.value })
                  }
                />
              </Field>
              <Field label={fields.nextDue}>
                <Input
                  type="date"
                  value={state.nextDueDate}
                  onChange={(e) => setState({ ...state, nextDueDate: e.target.value })}
                />
              </Field>
              <Field label={fields.emiOverride}>
                <Input
                  type="number"
                  min={0}
                  value={state.emiAmountOverride}
                  onChange={(e) => setState({ ...state, emiAmountOverride: +e.target.value })}
                />
              </Field>
            </>
          ) : null}
          <Field label={fields.foreclosure}>
            <Input
              type="number"
              value={state.foreclosureCharges}
              onChange={(e) =>
                setState({ ...state, foreclosureCharges: +e.target.value })
              }
            />
          </Field>
          <Field label={fields.linkedCard}>
            <Select
              value={state.linkedCardId || "__none__"}
              onValueChange={(v) =>
                setState({ ...state, linkedCardId: v === "__none__" ? "" : v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No linked card</SelectItem>
                {cards.map((card) => (
                  <SelectItem key={card.id} value={card.id}>
                    {card.nickname} ({card.bank})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={fields.blockedAmount}>
            <Input
              type="number"
              min={0}
              value={state.blockedAmount}
              onChange={(e) => setState({ ...state, blockedAmount: +e.target.value })}
            />
          </Field>
          <div className="col-span-2 rounded-lg bg-[hsl(var(--primary-soft))] p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                Calculated EMI
              </span>
              <span className="tabular-nums text-base font-semibold text-primary">
                {formatINR(paiseToRupees(emiPreviewPaise), { decimals: 0 })} / month
              </span>
            </div>
          </div>
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
