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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { useDataStore } from "@/store/dataStore";
import { useAuthStore } from "@/store/authStore";
import { cardRepo, cardStatementRepo, transactionRepo } from "@/repositories";
import type { Card as CardT, CardStatement, Transaction } from "@/types";
import { formatCardMoneyFact, readCardMoneyFact } from "@/services/statements/cardMoneyFact";
import { statementReceiptQuery } from "@/services/statements/receiptLink";
import { useNavStore } from "@/store/navStore";
import { useUIStore } from "@/store/uiStore";
import { confirm } from "@/store/uiStore";
import { cardSchema } from "@/services/validators";
import { summarizeCardHealth } from "@/services/calculations";
import { BANK_BRANDS } from "@/constants";
import { formatINR, formatDate, formatPercent } from "@/lib/format";
import { paiseToRupees, transactionAmountPaise } from "@/utils/money";
import { CreditCard, Pencil, Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/Table";
import { refsForCard } from "@/services/refIntegrity";
import {
  buildCardRepairQueue,
  buildCreditCardIntel,
  type CreditCardIntel,
} from "@/services/cardEngine";
import { CardEmiSimulatorDialog } from "@/components/finance/CardEmiSimulatorDialog";
import { CardBooksPanel } from "@/components/finance/CardBooksPanel";
import { planCapMessage, snapshotFromEffectiveFeatures } from "@/services/modulePolicy";
import { useCloudAppStore } from "@/store/cloudAppStore";
import { useMessages } from "@/i18n/useMessages";

export function CardsPage() {
  const messages = useMessages();
  const fields = messages.fields;
  const copy = messages.copy.cards;
  const user = useAuthStore((s) => s.currentUser);
  const cards = useDataStore((s) => s.cards);
  const transactions = useDataStore((s) => s.transactions);
  const accounts = useDataStore((s) => s.accounts);
  const upsertLocal = useDataStore((s) => s.upsertLocal);
  const removeLocal = useDataStore((s) => s.removeLocal);
  const ledgerEffects = useDataStore((s) => s.ledgerEffects);
  const toast = useUIStore((s) => s.toast);
  const [tab, setTab] = useState("credit");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<CardT | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [repairTxn, setRepairTxn] = useState<Transaction | null>(null);
  const [repairCardId, setRepairCardId] = useState("");
  const [repairAccountId, setRepairAccountId] = useState("");
  const [repairSaving, setRepairSaving] = useState(false);
  const [emiSimCard, setEmiSimCard] = useState<CardT | null>(null);
  const [statements, setStatements] = useState<CardStatement[]>([]);
  const [statementCardFocus, setStatementCardFocus] = useState<string | null>(null);
  const navActionId = useNavStore((s) => s.navActionId);

  useEffect(() => {
    const focus = statementReceiptQuery(window.location.search).cardId;
    setStatementCardFocus(focus);
    if (focus) setExpandedId(focus);
  }, [navActionId]);

  useEffect(() => {
    if (!user) return;
    void cardStatementRepo.list(user.id).then((rows) => setStatements(rows.filter((row) => row.isDeleted !== 1))).catch(() => setStatements([]));
  }, [user?.id, navActionId]);

  const creditCards = cards.filter((c) => c.type === "credit");
  const shownCreditCards = statementCardFocus ? creditCards.filter((card) => card.id === statementCardFocus) : creditCards;
  const activeCreditCards = creditCards.filter((c) => c.isInactive !== 1 && c.isDeleted !== 1);
  const debitCards = cards.filter((c) => c.type === "debit");

  const healthMap = useMemo(() => {
    const m = new Map<string, ReturnType<typeof summarizeCardHealth>>();
    const today = new Date();
    for (const c of creditCards) m.set(c.id, summarizeCardHealth(c, transactions, today, ledgerEffects));
    return m;
  }, [creditCards, transactions, ledgerEffects]);

  const intelMap = useMemo(() => {
    const m = new Map<string, CreditCardIntel>();
    const today = new Date();
    for (const c of creditCards) {
      const intel = buildCreditCardIntel(c, transactions, ledgerEffects, today);
      if (intel) m.set(c.id, intel);
    }
    return m;
  }, [creditCards, transactions, ledgerEffects]);

  const repairQueue = useMemo(() => {
    if (!user) return [];
    return buildCardRepairQueue(cards, transactions, user.id);
  }, [cards, transactions, user]);

  async function applyRepairLinkCard() {
    if (!repairTxn || !user || !repairCardId) return;
    setRepairSaving(true);
    try {
      const patched = await transactionRepo.update(repairTxn.id, { linkedCardId: repairCardId });
      if (patched) {
        upsertLocal("transactions", patched);
        toast({ title: copy.linked, kind: "success" });
      }
      setRepairTxn(null);
      setRepairCardId("");
    } catch (e) {
      toast({
        title: copy.updateFailed,
        description: e instanceof Error ? e.message : copy.tryAgain,
        kind: "error",
      });
    } finally {
      setRepairSaving(false);
    }
  }

  async function applyRepairConvertUpi() {
    if (!repairTxn || !user || !repairAccountId) return;
    setRepairSaving(true);
    try {
      const patched = await transactionRepo.update(repairTxn.id, {
        paymentMode: "upi",
        linkedCardId: undefined,
        accountId: repairAccountId,
      });
      if (patched) {
        upsertLocal("transactions", patched);
        toast({ title: copy.converted, kind: "success" });
      }
      setRepairTxn(null);
      setRepairAccountId("");
    } catch (e) {
      toast({
        title: copy.updateFailed,
        description: e instanceof Error ? e.message : copy.tryAgain,
        kind: "error",
      });
    } finally {
      setRepairSaving(false);
    }
  }

  async function applyRepairMarkLegacy() {
    if (!repairTxn || !user) return;
    setRepairSaving(true);
    try {
      const notes = repairTxn.notes?.includes("legacy/manual card reviewed")
        ? repairTxn.notes
        : `${repairTxn.notes ? `${repairTxn.notes}\n` : ""}[legacy/manual card reviewed]`;
      const tags = Array.from(new Set([...(repairTxn.tags ?? []), "legacy_manual_card_reviewed"]));
      const patched = await transactionRepo.update(repairTxn.id, { notes, tags });
      if (patched) {
        upsertLocal("transactions", patched);
        toast({ title: copy.markedLegacy, kind: "info" });
      }
      setRepairTxn(null);
    } catch (e) {
      toast({
        title: copy.updateFailed,
        description: e instanceof Error ? e.message : copy.tryAgain,
        kind: "error",
      });
    } finally {
      setRepairSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const refs = refsForCard(id);
    if (refs.blocking) {
      const updated = await cardRepo.update(id, { isInactive: 1 } as Partial<CardT>);
      if (updated) {
        upsertLocal("cards", updated);
        toast({
          title: copy.archived,
          description: copy.archiveHint,
          kind: "info",
        });
      }
      return;
    }
    const ok = await confirm({
      title: copy.deleteTitle,
      description: copy.deleteBody,
      destructive: true,
      confirmLabel: copy.deleteConfirm,
    });
    if (!ok) return;
    await cardRepo.softDelete(id);
    removeLocal("cards", id);
    toast({ title: copy.removed, kind: "info" });
  }

  useEffect(() => {
    if (repairTxn) {
      setRepairCardId(activeCreditCards[0]?.id ?? "");
      setRepairAccountId(repairTxn.accountId || accounts[0]?.id || "");
    }
  }, [repairTxn, activeCreditCards, accounts]);

  return (
    <div>
      <PersonalPageHeader
        screen="cards"
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> {copy.new}
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="credit">{copy.creditTab} ({creditCards.length})</TabsTrigger>
          <TabsTrigger value="debit">{copy.debitTab} ({debitCards.length})</TabsTrigger>
          <TabsTrigger value="review">
            Review{repairQueue.length ? ` (${repairQueue.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="credit" className="mt-4">
          {creditCards.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon={<CreditCard className="h-6 w-6" />}
                  title={copy.emptyCredit}
                  description={copy.emptyCreditBody}
                  action={
                    <Button onClick={() => setAdding(true)}>
                      <Plus className="h-4 w-4" /> Add Card
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {statementCardFocus && shownCreditCards.length === 0 ? (
                <p className="text-sm text-muted-foreground">That imported card is not on this device.</p>
              ) : null}
              {shownCreditCards.map((c) => {
                const h = healthMap.get(c.id);
                return (
                  <Card
                    key={c.id}
                    className="overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${c.color}22, transparent)`,
                    }}
                  >
                    <CardContent className="p-5">
                      <div
                        className="mb-4 flex items-center justify-between rounded-lg p-3 text-white shadow"
                        style={{ backgroundColor: c.color }}
                      >
                        <div>
                          <div className="text-[10px] uppercase tracking-wider opacity-80">
                            {c.bank}
                          </div>
                          <div className="text-base font-semibold">
                            {c.nickname}
                          </div>
                          <div className="mt-2 font-mono text-sm tracking-widest">
                            •••• •••• •••• {c.last4 || "••••"}
                          </div>
                        </div>
                        <CreditCard className="h-7 w-7 opacity-80" />
                      </div>

                      {(() => {
                        const intel = intelMap.get(c.id);
                        const savedStatement = statements
                          .filter((row) => row.cardId === c.id)
                          .sort((a, b) => b.statementDate.localeCompare(a.statementDate))[0];
                        const minimumFact = savedStatement
                          ? readCardMoneyFact(savedStatement, "minimumDue")
                          : {
                              valuePaise: intel?.minimumDuePaise ?? null,
                              evidence: intel ? "estimated" as const : "not_observed" as const,
                              needsReview: false,
                            };
                        const risk = intel?.risk ?? "safe";
                        const riskTone =
                          risk === "over_limit" || risk === "danger"
                            ? "danger"
                            : risk === "risky"
                              ? "warning"
                              : risk === "watch"
                                ? "info"
                                : "success";
                        const linked = transactions
                          .filter(
                            (t) =>
                              t.isDeleted !== 1 &&
                              t.linkedCardId === c.id &&
                              (t.type === "expense" || t.type === "cc_payment"),
                          )
                          .sort((a, b) => b.date.localeCompare(a.date))
                          .slice(0, 12);
                        return (
                          <>
                            <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-3">
                              <div>
                                <div className="text-muted-foreground">Total limit</div>
                                <div className="tabular-nums font-semibold">
                                  {formatINR(paiseToRupees(intel?.limitPaise ?? 0), { decimals: 0 })}
                                </div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Used (outstanding)</div>
                                <div className="tabular-nums font-semibold text-expense">
                                  {formatINR(
                                    paiseToRupees(intel?.outstandingPaise ?? h?.outstandingBalancePaise ?? 0),
                                    { decimals: 0 },
                                  )}
                                  {intel && intel.creditBalancePaise > 0 && (
                                    <span className="ml-2 text-xs text-emerald-600">
                                      Credit bal {formatINR(paiseToRupees(intel.creditBalancePaise))}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Available</div>
                                <div className="tabular-nums font-semibold">
                                  {formatINR(paiseToRupees(intel?.availablePaise ?? 0), { decimals: 0 })}
                                </div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Billed (statement)</div>
                                <div className="tabular-nums">
                                  {formatINR(
                                    paiseToRupees(intel?.statementBalancePaise ?? h?.statementBalancePaise ?? 0),
                                    { decimals: 0 },
                                  )}
                                </div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Unbilled</div>
                                <div className="tabular-nums">
                                  {formatINR(paiseToRupees(intel?.unbilledPaise ?? 0), { decimals: 0 })}
                                </div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Utilization</div>
                                <div className="tabular-nums font-medium">
                                  {formatPercent(intel?.utilizationPct ?? h?.utilization ?? 0, 1)}
                                </div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Next due</div>
                                <div className="font-medium">
                                  {intel?.nextDueDateIso
                                    ? formatDate(intel.nextDueDateIso)
                                    : h?.nextDueDate
                                      ? formatDate(h.nextDueDate)
                                      : "—"}
                                </div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Minimum due</div>
                                <div className="tabular-nums">
                                  {formatCardMoneyFact(minimumFact, (paise) => formatINR(paiseToRupees(paise), { decimals: 0 }))}
                                </div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Full due (PIF)</div>
                                <div className="tabular-nums">
                                  {formatINR(paiseToRupees(intel?.fullDuePaise ?? 0), { decimals: 0 })}
                                </div>
                              </div>
                            </div>
                            {intel?.statementPeriodLabel ? (
                              <p className="mt-2 text-[11px] text-muted-foreground">
                                {intel.statementPeriodLabel}
                                {intel.outstandingSource === "effects" ? (
                                  <Badge className="ml-2" variant="outline">
                                    Ledger
                                  </Badge>
                                ) : intel.outstandingSource === "shadow" ? (
                                  <Badge className="ml-2" variant="outline">
                                    SQL shadow
                                  </Badge>
                                ) : (
                                  <Badge className="ml-2" variant="secondary">
                                    Transactions
                                  </Badge>
                                )}
                              </p>
                            ) : null}
                            {intel?.sourceWarning ? (
                              <div className="mt-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-[11px] text-warning">
                                {intel.sourceWarning}
                              </div>
                            ) : null}

                            <div className="mt-3">
                              <div className="mb-1 flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">
                                  Card used amount vs limit (risk band)
                                </span>
                                <Badge variant={riskTone}>
                                  {formatPercent(intel?.utilizationPct ?? h?.utilization ?? 0, 1)} · {risk.replace("_", " ")}
                                </Badge>
                              </div>
                              <Progress
                                value={Math.min(100, intel?.utilizationPct ?? h?.utilization ?? 0)}
                                tone={
                                  riskTone === "danger"
                                    ? "expense"
                                    : riskTone === "warning"
                                      ? "warning"
                                      : riskTone === "info"
                                        ? "primary"
                                        : "income"
                                }
                              />
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                Safe: below 30%, watch: 30-50%, risky: 50-80%, danger: 80%+.
                              </p>
                            </div>
                            {intel ? (
                              <div className="mt-3 grid gap-2 rounded-md border border-border p-2 text-[11px] md:grid-cols-3">
                                <div>
                                  <span className="text-muted-foreground">Pay below 80%: </span>
                                  <span className="tabular-nums font-medium">
                                    {formatINR(paiseToRupees(intel.payBelow80Paise), { decimals: 0 })}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Pay below 50%: </span>
                                  <span className="tabular-nums font-medium">
                                    {formatINR(paiseToRupees(intel.payBelow50Paise), { decimals: 0 })}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Pay below 30%: </span>
                                  <span className="tabular-nums font-medium">
                                    {formatINR(paiseToRupees(intel.payBelow30Paise), { decimals: 0 })}
                                  </span>
                                </div>
                              </div>
                            ) : null}
                            {intel?.minimumDueWarning && minimumFact.evidence === "source_observed" && minimumFact.valuePaise != null && minimumFact.valuePaise > 0 ? (
                              <div className="mt-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-[11px] text-warning">
                                {intel.minimumDueWarning}
                              </div>
                            ) : null}
                            {intel && intel.fullDuePaise > 0 ? (
                              <div className="mt-2 rounded-md border border-border bg-muted/40 p-2 text-[11px] text-muted-foreground">
                                Full due means paying the complete statement balance by the due date. It
                                clears the billed card liability and is not counted as a new expense.
                              </div>
                            ) : null}

                            <div className="mt-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                              >
                                {expandedId === c.id ? copy.hide : copy.show} {copy.linkedTx} ({linked.length})
                              </Button>
                              {expandedId === c.id ? (
                                <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto rounded border border-border p-2 text-[11px]">
                                  {linked.length === 0 ? (
                                    <li className="text-muted-foreground">No linked card movements yet.</li>
                                  ) : (
                                    linked.map((t) => (
                                      <li key={t.id} className="flex justify-between gap-2">
                                        <span>
                                          {t.date.slice(0, 10)} · {t.type}
                                        </span>
                                        <span className="tabular-nums">
                                          {formatINR(
                                            paiseToRupees(transactionAmountPaise(t)),
                                            { decimals: 0 },
                                          )}
                                        </span>
                                      </li>
                                    ))
                                  )}
                                </ul>
                              ) : null}
                            </div>
                          </>
                        );
                      })()}

                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          Statement day: {c.statementDay ?? "—"} · Due day:{" "}
                          {c.dueDay ?? "—"}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={() => setEmiSimCard(c)}
                          >
                            EMI
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => setEditing(c)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => handleDelete(c.id)}
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
        </TabsContent>

        <TabsContent value="debit" className="mt-4">
          {debitCards.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon={<CreditCard className="h-6 w-6" />}
                  title={copy.emptyDebit}
                  description={copy.emptyDebitBody}
                  action={
                    <Button onClick={() => setAdding(true)}>
                      <Plus className="h-4 w-4" /> Add Card
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {debitCards.map((c) => {
                const acc = accounts.find((a) => a.id === c.linkedAccountId);
                return (
                  <Card key={c.id}>
                    <CardHeader>
                      <CardDescription>
                        {c.bank} • Debit
                      </CardDescription>
                      <CardTitle>{c.nickname}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="font-mono text-sm tracking-widest text-muted-foreground">
                        •••• •••• •••• {c.last4 || "••••"}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Linked: {acc?.name ?? "—"}
                      </div>
                      <div className="mt-3 flex justify-end gap-1">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => setEditing(c)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => handleDelete(c.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="review" className="mt-4">
          {repairQueue.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <EmptyState
                  icon={<CreditCard className="h-6 w-6" />}
                  title={copy.repairClear}
                  description={copy.repairClearBody}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Credit-card repair queue</CardTitle>
                <CardDescription>
                  Fix missing card links, invalid limits, due-day gaps, or mark legacy rows as manually reviewed.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {repairQueue.map((issue) => {
                  const t = issue.transaction ?? ({
                    id: issue.id,
                    userId: user?.id ?? "",
                    type: "expense",
                    amountPaise: 0,
                    amount: 0,
                    date: new Date().toISOString().slice(0, 10),
                    paymentMode: "credit_card",
                    merchantOrPerson:
                      issue.kind === "card_invalid_limit"
                        ? copy.limitIssue.replace("{name}", issue.card?.nickname ?? copy.cardWord)
                        : copy.dueIssue.replace("{name}", issue.card?.nickname ?? copy.cardWord),
                    description: "",
                    notes: "",
                    tags: [],
                    billAvailable: 0,
                    gstApplicable: 0,
                    taxFlag: 0,
                    businessOrPersonal: "personal",
                    needWant: "unassigned",
                    fixedVariable: "unassigned",
                    plannedUnplanned: "unassigned",
                    isDeleted: 0,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    version: 1,
                  } as Transaction);
                  return (
                  <div
                    key={issue.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 text-sm"
                  >
                    <div>
                      <div className="flex items-center gap-2 font-medium">
                        {issue.label}
                        <Badge variant={issue.severity === "high" ? "danger" : "warning"}>
                          {issue.severity}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground">
                        {t.merchantOrPerson || t.description || copy.expenseWord} ·{" "}
                        {formatINR(paiseToRupees(transactionAmountPaise(t)), {
                          decimals: 2,
                        })}
                      </div>
                    </div>
                    {issue.transaction ? (
                      <Button size="sm" variant="secondary" onClick={() => setRepairTxn(t)}>
                        {copy.fixTxn}
                      </Button>
                    ) : issue.card ? (
                      <Button size="sm" variant="secondary" onClick={() => setEditing(issue.card ?? null)}>
                        {copy.editCard}
                      </Button>
                    ) : null}
                  </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!repairTxn} onOpenChange={(o) => !o && setRepairTxn(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Repair transaction</DialogTitle>
          </DialogHeader>
          {repairTxn ? (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                {repairTxn.date.slice(0, 10)} —{" "}
                {formatINR(paiseToRupees(transactionAmountPaise(repairTxn)), {
                  decimals: 2,
                })}
              </p>
              <Field label={fields.linkCreditCard}>
                <Select value={repairCardId || undefined} onValueChange={setRepairCardId}>
                  <SelectTrigger>
                    <SelectValue placeholder={copy.selectCard} />
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
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => void applyRepairLinkCard()}
                  disabled={!repairCardId || repairSaving}
                  loading={repairSaving}
                >
                  Save card link
                </Button>
              </div>
              <div className="border-t border-border pt-4">
                <p className="mb-2 text-sm font-medium">Or convert to bank / UPI</p>
                <Field label={fields.cashSource}>
                  <Select value={repairAccountId || undefined} onValueChange={setRepairAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder={copy.account} />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Button
                  className="mt-2"
                  variant="outline"
                  onClick={() => void applyRepairConvertUpi()}
                  disabled={!repairAccountId || repairSaving}
                  loading={repairSaving}
                >
                  Convert to UPI
                </Button>
                <Button
                  className="ml-2 mt-2"
                  variant="ghost"
                  onClick={() => void applyRepairMarkLegacy()}
                  disabled={repairSaving}
                  loading={repairSaving}
                >
                  Mark legacy / manual
                </Button>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRepairTxn(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CardForm
        open={adding || !!editing}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
        card={editing}
        userId={user?.id}
        defaultType={tab === "debit" ? "debit" : "credit"}
        onSaved={(c) => {
          upsertLocal("cards", c);
          toast({
            title: editing ? copy.updated : copy.added,
            kind: "success",
          });
          setAdding(false);
          setEditing(null);
        }}
      />

      <CardBooksPanel />

      <CardEmiSimulatorDialog
        open={!!emiSimCard}
        onOpenChange={(o) => !o && setEmiSimCard(null)}
        cardLabel={emiSimCard ? `${emiSimCard.nickname} •••• ${emiSimCard.last4 || ""}` : copy.cardWord}
        cardId={emiSimCard?.id}
        userId={user?.id}
      />
    </div>
  );
}

function CardForm({
  open,
  onClose,
  card,
  userId,
  defaultType,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  card: CardT | null;
  userId?: string;
  defaultType: "credit" | "debit";
  onSaved: (c: CardT) => void;
}) {
  const messages = useMessages();
  const fields = messages.fields;
  const copy = messages.copy.cards;
  const accounts = useDataStore((s) => s.accounts);
  const [state, setState] = useState({
    nickname: card?.nickname ?? "",
    bank: card?.bank ?? BANK_BRANDS[0],
    last4: card?.last4 ?? "",
    type: card?.type ?? defaultType,
    linkedAccountId: card?.linkedAccountId ?? "",
    creditLimit: card?.creditLimit ?? 0,
    statementDay: card?.statementDay ?? 1,
    dueDay: card?.dueDay ?? 15,
    interestRate: card?.interestRate ?? 36,
    annualFee: card?.annualFee ?? 0,
    rewardNote: card?.rewardNote ?? "",
    color: card?.color ?? "#8b5cf6",
  });
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setState({
      nickname: card?.nickname ?? "",
      bank: card?.bank ?? BANK_BRANDS[0],
      last4: card?.last4 ?? "",
      type: card?.type ?? defaultType,
      linkedAccountId: card?.linkedAccountId ?? "",
      creditLimit: card?.creditLimit ?? 0,
      statementDay: card?.statementDay ?? 1,
      dueDay: card?.dueDay ?? 15,
      interestRate: card?.interestRate ?? 36,
      annualFee: card?.annualFee ?? 0,
      rewardNote: card?.rewardNote ?? "",
      color: card?.color ?? "#8b5cf6",
    });
    setErr(null);
  }, [card, defaultType, open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const parse = cardSchema.safeParse(state);
    if (!parse.success) {
      setErr(parse.error.issues[0]?.message ?? copy.invalid);
      return;
    }
    const payload = { ...parse.data };
    if (!card) {
      const cap = planCapMessage(
        snapshotFromEffectiveFeatures(useCloudAppStore.getState().effectiveFeatures),
        "cards",
        useDataStore.getState().cards.filter((row) => row.isDeleted !== 1).length,
      );
      if (cap) {
        setErr(cap);
        return;
      }
    }
    if (card) {
      const updated = await cardRepo.update(card.id, payload as unknown as Partial<CardT>);
      if (updated) onSaved(updated);
    } else {
      const created = await cardRepo.create({
        userId,
        data: { ...payload, isInactive: 0 } as unknown as CardT,
      });
      onSaved(created);
    }
  }

  const isCredit = state.type === "credit";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{card ? copy.edit : copy.new}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <Field label={fields.type}>
            <Select
              value={state.type}
              onValueChange={(v) => setState({ ...state, type: v as "credit" | "debit" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="credit">{copy.credit}</SelectItem>
                <SelectItem value="debit">{copy.debit}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label={fields.bank}>
            <Select value={state.bank} onValueChange={(v) => setState({ ...state, bank: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BANK_BRANDS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={fields.nickname} required className="col-span-2">
            <Input
              value={state.nickname}
              onChange={(e) => setState({ ...state, nickname: e.target.value })}
              placeholder="HDFC Regalia"
            />
          </Field>
          <Field label={fields.last4}>
            <Input
              value={state.last4}
              maxLength={4}
              onChange={(e) =>
                setState({ ...state, last4: e.target.value.replace(/\D/g, "").slice(0, 4) })
              }
              placeholder="1234"
            />
          </Field>
          <Field label={fields.color}>
            <Input
              type="color"
              value={state.color}
              onChange={(e) => setState({ ...state, color: e.target.value })}
              className="h-9 p-1"
            />
          </Field>
          {!isCredit ? (
            <Field label={fields.linkedAccount} className="col-span-2">
              <Select
                value={state.linkedAccountId}
                onValueChange={(v) => setState({ ...state, linkedAccountId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={copy.selectAccount} />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : (
            <>
              <Field label={fields.creditLimit} required>
                <Input
                  type="number"
                  value={state.creditLimit}
                  onChange={(e) => setState({ ...state, creditLimit: +e.target.value })}
                />
              </Field>
              <Field label={fields.interestApr}>
                <Input
                  type="number"
                  value={state.interestRate}
                  onChange={(e) => setState({ ...state, interestRate: +e.target.value })}
                />
              </Field>
              <Field label={fields.statementDay} required>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={state.statementDay}
                  onChange={(e) => setState({ ...state, statementDay: +e.target.value })}
                />
              </Field>
              <Field label={fields.dueDay} required>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={state.dueDay}
                  onChange={(e) => setState({ ...state, dueDay: +e.target.value })}
                />
              </Field>
              <Field label={fields.annualFee}>
                <Input
                  type="number"
                  value={state.annualFee}
                  onChange={(e) => setState({ ...state, annualFee: +e.target.value })}
                />
              </Field>
              <Field label={fields.rewardNote}>
                <Input
                  value={state.rewardNote}
                  onChange={(e) => setState({ ...state, rewardNote: e.target.value })}
                  placeholder="2x on dining, 4% on fuel"
                />
              </Field>
            </>
          )}
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
