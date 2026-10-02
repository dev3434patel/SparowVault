import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { formatINR, formatDate } from "@/lib/format";
import {
  cardEmiPlanRepo,
  cardPaymentAllocationRepo,
  cardStatementRepo,
  creditLimitGroupRepo,
} from "@/repositories";
import {
  saveCardEmiPlan,
  saveCardPaymentAllocation,
  saveCardStatement,
  saveSharedCardLimit,
} from "@/services/personalBookWorkflows";
import { useAuthStore } from "@/store/authStore";
import { useDataStore } from "@/store/dataStore";
import { useUIStore } from "@/store/uiStore";
import type { CardEmiPlan, CardPaymentAllocation, CardStatement, CreditLimitGroup } from "@/types";
import { paiseToRupees, rupeesToPaise, transactionAmountPaise } from "@/utils/money";
import { useMessages } from "@/i18n/useMessages";

export function CardBooksPanel() {
  const copy = useMessages().copy.cardBooks;
  const user = useAuthStore((s) => s.currentUser);
  const cards = useDataStore((s) => s.cards);
  const transactions = useDataStore((s) => s.transactions);
  const toast = useUIStore((s) => s.toast);
  const [statements, setStatements] = useState<CardStatement[]>([]);
  const [allocations, setAllocations] = useState<CardPaymentAllocation[]>([]);
  const [plans, setPlans] = useState<CardEmiPlan[]>([]);
  const [groups, setGroups] = useState<CreditLimitGroup[]>([]);
  const [cardId, setCardId] = useState("");
  const [closing, setClosing] = useState("");
  const [minimum, setMinimum] = useState("");
  const [cycleStart, setCycleStart] = useState("");
  const [cycleEnd, setCycleEnd] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [allocationAmount, setAllocationAmount] = useState("");
  const [purchaseId, setPurchaseId] = useState("");
  const [tenure, setTenure] = useState("3");
  const [rate, setRate] = useState("18");
  const [limitName, setLimitName] = useState("");
  const [limitRupees, setLimitRupees] = useState("");
  const [saving, setSaving] = useState(false);

  const activeCards = cards.filter((card) => card.isDeleted !== 1 && card.type === "credit");
  const purchases = transactions.filter(
    (tx) => tx.isDeleted !== 1 && tx.linkedCardId === cardId && tx.type === "expense",
  );
  const payments = transactions.filter(
    (tx) => tx.isDeleted !== 1 && tx.linkedCardId === cardId && tx.type === "cc_payment",
  );

  async function reload() {
    if (!user) return;
    const [statementRows, allocationRows, planRows, groupRows] = await Promise.all([
      cardStatementRepo.list(user.id),
      cardPaymentAllocationRepo.list(user.id),
      cardEmiPlanRepo.list(user.id),
      creditLimitGroupRepo.list(user.id),
    ]);
    setStatements(statementRows.filter((row) => row.isDeleted !== 1));
    setAllocations(allocationRows.filter((row) => row.isDeleted !== 1));
    setPlans(planRows.filter((row) => row.isDeleted !== 1));
    setGroups(groupRows.filter((row) => row.isDeleted !== 1));
  }

  useEffect(() => {
    void reload();
  }, [user?.id]);

  async function run(task: () => Promise<void>, title: string) {
    if (!user || saving) return;
    setSaving(true);
    try {
      await task();
      toast({ title, kind: "success" });
      await reload();
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : copy.saveFailed, kind: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Statements, payments, and EMI</CardTitle>
        <CardDescription>
          PDF import stays in the header upload. Saving a statement, allocation, or EMI plan does not post the purchase again.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label={copy.creditCard}>
          <Select value={cardId} onValueChange={setCardId}>
            <SelectTrigger>
              <SelectValue placeholder={copy.chooseCard} />
            </SelectTrigger>
            <SelectContent>
              {activeCards.map((card) => (
                <SelectItem key={card.id} value={card.id}>{card.nickname}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label={copy.cycleStart}>
            <Input type="date" value={cycleStart} onChange={(event) => setCycleStart(event.target.value)} />
          </Field>
          <Field label={copy.cycleEnd}>
            <Input type="date" value={cycleEnd} onChange={(event) => setCycleEnd(event.target.value)} />
          </Field>
          <Field label={copy.closing}>
            <Input value={closing} onChange={(event) => setClosing(event.target.value)} inputMode="decimal" />
          </Field>
          <Field label={copy.minimum}>
            <Input value={minimum} onChange={(event) => setMinimum(event.target.value)} inputMode="decimal" />
          </Field>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label={copy.sharedName}>
            <Input value={limitName} onChange={(event) => setLimitName(event.target.value)} />
          </Field>
          <Field label={copy.sharedLimit}>
            <Input value={limitRupees} onChange={(event) => setLimitRupees(event.target.value)} inputMode="decimal" />
          </Field>
        </div>
        <Button
          variant="outline"
          disabled={!cardId || !limitName.trim()}
          loading={saving}
          onClick={() => void run(async () => {
            await saveSharedCardLimit(user!.id, {
              cardId,
              name: limitName,
              totalLimitPaise: rupeesToPaise(Number(limitRupees || "0")),
            });
          }, copy.sharedSaved)}
        >
          Save shared limit
        </Button>
        {groups.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            {copy.sharedOnFile}: {groups.map((group) => `${group.name} ${formatINR(paiseToRupees(group.totalLimitPaise))}`).join(" · ")}
          </p>
        ) : null}
        <Button
          variant="outline"
          disabled={!cardId || !cycleStart || !cycleEnd || cycleStart > cycleEnd}
          loading={saving}
          onClick={() => void run(async () => {
            const closingPaise = rupeesToPaise(Number(closing || "0"));
            await saveCardStatement(user!.id, {
              cardId,
              cycleStartDate: cycleStart,
              cycleEndDate: cycleEnd,
              statementDate: cycleEnd,
              openingBalancePaise: 0,
              closingBalancePaise: closingPaise,
              minimumDuePaise: minimum.trim() === "" ? null : rupeesToPaise(Number(minimum)),
              minimumDueEvidence: minimum.trim() === "" ? "not_observed" : "user_confirmed",
              retailSpendPaise: closingPaise,
              feesPaise: null,
              feesEvidence: "not_observed",
              interestPaise: null,
              interestEvidence: "not_observed",
              paymentsPaise: 0,
              creditsPaise: 0,
              status: "open",
            });
          }, copy.statementSaved)}
        >
          Save statement
        </Button>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label={copy.existingPayment}>
            <Select value={paymentId} onValueChange={setPaymentId}>
              <SelectTrigger>
                <SelectValue placeholder={copy.choosePayment} />
              </SelectTrigger>
              <SelectContent>
                {payments.map((tx) => (
                  <SelectItem key={tx.id} value={tx.id}>
                    {formatDate(tx.date)} · {formatINR(paiseToRupees(transactionAmountPaise(tx)))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={copy.allocate}>
            <Input value={allocationAmount} onChange={(event) => setAllocationAmount(event.target.value)} inputMode="decimal" />
          </Field>
        </div>
        <Button
          variant="outline"
          disabled={!cardId || !paymentId}
          loading={saving}
          onClick={() => void run(async () => {
            await saveCardPaymentAllocation(user!.id, {
              cardId,
              statementId: statements.find((row) => row.cardId === cardId)?.id,
              transactionId: paymentId,
              amountPaise: rupeesToPaise(Number(allocationAmount)),
              allocatedAt: new Date().toISOString().slice(0, 10),
            });
          }, copy.allocationSaved)}
        >
          Save allocation
        </Button>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label={copy.existingPurchase}>
            <Select value={purchaseId} onValueChange={setPurchaseId}>
              <SelectTrigger>
                <SelectValue placeholder={copy.choosePurchase} />
              </SelectTrigger>
              <SelectContent>
                {purchases.map((tx) => (
                  <SelectItem key={tx.id} value={tx.id}>
                    {formatDate(tx.date)} · {formatINR(paiseToRupees(transactionAmountPaise(tx)))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={copy.tenure}>
            <Input value={tenure} onChange={(event) => setTenure(event.target.value)} inputMode="numeric" />
          </Field>
          <Field label={copy.annualRate}>
            <Input value={rate} onChange={(event) => setRate(event.target.value)} inputMode="decimal" />
          </Field>
        </div>
        <Button
          disabled={!cardId || !purchaseId}
          loading={saving}
          onClick={() => void run(async () => {
            const purchase = purchases.find((tx) => tx.id === purchaseId);
            await saveCardEmiPlan(user!.id, {
              cardId,
              purchaseTransactionIds: [purchaseId],
              principalPaise: purchase ? transactionAmountPaise(purchase) : 0,
              annualRateBps: Math.round(Number(rate) * 100),
              tenureMonths: Math.round(Number(tenure)),
              startDate: new Date().toISOString().slice(0, 10),
            });
          }, copy.emiSaved)}
        >
          Convert existing purchase to EMI
        </Button>
        <div className="text-sm text-muted-foreground">
          {statements.length} statement(s) · {allocations.length} allocation(s) · {plans.length} EMI plan(s)
        </div>
      </CardContent>
    </Card>
  );
}
