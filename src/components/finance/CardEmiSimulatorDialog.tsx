import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Label";
import { DataConfidenceBadge } from "@/components/finance/DataConfidenceBadge";
import { compareCardEmiTenures, calculateNetFinancingCostPaise, createCardEmiPlanFromPurchase } from "@/services/cardEmiEngine";
import { cardEmiInstallmentRepo, cardEmiPlanRepo } from "@/repositories";
import { formatINR } from "@/lib/format";
import { paiseToRupees, rupeesToPaise } from "@/utils/money";
import { uid } from "@/lib/utils";
import { useMessages } from "@/i18n/useMessages";

export function CardEmiSimulatorDialog({
  open,
  onOpenChange,
  cardLabel,
  cardId,
  userId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  cardLabel: string;
  cardId?: string;
  userId?: string;
}) {
  const copy = useMessages().copy.cardEmi;
  const [principal, setPrincipal] = useState("60000");
  const [rate, setRate] = useState("15");
  const [fee, setFee] = useState("999");
  const [tenure, setTenure] = useState(6);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const comparisons = useMemo(() => {
    const principalPaise = rupeesToPaise(Number(principal) || 0);
    const annualRateBps = Math.round((Number(rate) || 0) * 100);
    if (principalPaise <= 0) return [];
    return compareCardEmiTenures({
      principalPaise,
      annualRateBps,
      tenures: [3, 6, 9, 12, 18, 24],
      startDate: new Date().toISOString().slice(0, 10),
    });
  }, [principal, rate]);

  const feePaise = rupeesToPaise(Number(fee) || 0);
  const taxPaise = Math.round(feePaise * 0.18);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>EMI simulator — {cardLabel}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <DataConfidenceBadge confidence="estimated" />
          Educational estimate — issuer schedule wins when available.
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={copy.purchase}>
            <Input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} />
          </Field>
          <Field label={copy.rate}>
            <Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} />
          </Field>
          <Field label={copy.fee}>
            <Input type="number" value={fee} onChange={(e) => setFee(e.target.value)} />
          </Field>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2">Tenure</th>
                <th>EMI / mo</th>
                <th>Interest</th>
                <th>Total paid</th>
                <th>Net finance cost*</th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((c) => {
                const net = calculateNetFinancingCostPaise({
                  totalInterestPaise: c.totalInterestPaise,
                  totalFeePaise: feePaise,
                  totalTaxPaise: taxPaise,
                });
                return (
                  <tr key={c.tenureMonths} className="cursor-pointer border-b" onClick={() => setTenure(c.tenureMonths)}>
                    <td className="py-2">{c.tenureMonths} mo</td>
                    <td className="tabular-nums">{formatINR(paiseToRupees(c.emiPaise))}</td>
                    <td className="tabular-nums">{formatINR(paiseToRupees(c.totalInterestPaise))}</td>
                    <td className="tabular-nums">{formatINR(paiseToRupees(c.totalPaidPaise))}</td>
                    <td className="tabular-nums font-medium">
                      {formatINR(paiseToRupees(net.netFinancingCostPaise))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          *Net financing cost = interest + fees + tax − discounts. This is not the bank&apos;s official APR.
        </p>
        {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}
        <DialogFooter>
          <Button
            disabled={!cardId || !userId || saving}
            onClick={() => {
              if (!cardId || !userId) return;
              setSaving(true);
              const id = uid("cep");
              const built = createCardEmiPlanFromPurchase({
                id,
                userId,
                cardId,
                purchaseTransactionIds: [],
                principalPaise: rupeesToPaise(Number(principal) || 0),
                annualRateBps: Math.round((Number(rate) || 0) * 100),
                tenureMonths: tenure,
                startDate: new Date().toISOString().slice(0, 10),
              });
              void (async () => {
                await cardEmiPlanRepo.create({ userId, data: { ...built.plan, id } });
                for (const row of built.installments) {
                  await cardEmiInstallmentRepo.create({ userId, data: row });
                }
                setNote(copy.saved);
                setSaving(false);
              })();
            }}
          >
            Save plan
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
