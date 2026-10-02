import { useEffect, useMemo, useState } from "react";
import { PersonalPageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Label";
import { sinkingFundRepo } from "@/repositories";
import { reservationSnapshot } from "@/services/reservationMath";
import { useAuthStore } from "@/store/authStore";
import { useDataStore } from "@/store/dataStore";
import { useUIStore } from "@/store/uiStore";
import type { SinkingFund } from "@/types";
import { formatINR } from "@/lib/format";
import { paiseToRupees, rupeesToPaise } from "@/utils/money";
import { deriveAccountBalanceFromAccount } from "@/services/calculations";
import { useMessages } from "@/i18n/useMessages";

export function EnvelopesPage() {
  const user = useAuthStore((s) => s.currentUser);
  const accounts = useDataStore((s) => s.accounts);
  const transactions = useDataStore((s) => s.transactions);
  const goalContribs = useDataStore((s) => s.goalContribs);
  const toast = useUIStore((s) => s.toast);
  const messages = useMessages();
  const copy = messages.ui.envelopes;
  const saveLabel = messages.ui.common.save;
  const [funds, setFunds] = useState<SinkingFund[]>([]);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (!user) return;
    void sinkingFundRepo.list(user.id).then((rows) => setFunds(rows.filter((r) => r.isDeleted !== 1)));
  }, [user?.id]);

  const bankCashPaise = useMemo(() => {
    return accounts
      .filter((a) => a.isDeleted !== 1 && (a.type === "bank" || a.type === "cash"))
      .reduce((sum, account) => sum + deriveAccountBalanceFromAccount(account.id, account, transactions), 0);
  }, [accounts, transactions]);

  const envelopeReservedPaise = funds.reduce((sum, fund) => sum + (fund.monthlyRequiredPaise ?? 0), 0);
  const goalEarmarkPaise = goalContribs
    .filter((row) => row.isDeleted !== 1 && row.fundingMode === "earmark")
    .reduce((sum, row) => sum + (row.amountPaise ?? 0), 0);
  const snap = reservationSnapshot({
    bankCashPaise,
    envelopeReservedPaise,
    goalEarmarkPaise,
    sinkingFundReservedPaise: 0,
  });

  async function saveEnvelope() {
    if (!user || !name.trim()) return;
    const reserved = rupeesToPaise(Number(amount) || 0);
    if (reserved <= 0) {
      toast({ title: copy.amountRequired, kind: "error" });
      return;
    }
    const saved = await sinkingFundRepo.create({
      userId: user.id,
      data: {
        name: name.trim(),
        targetPaise: reserved,
        targetDate: new Date().toISOString().slice(0, 10),
        monthlyRequiredPaise: reserved,
        notes: "envelope",
      },
    });
    setFunds((prev) => [saved, ...prev]);
    setName("");
    setAmount("");
    toast({ title: copy.saved, description: copy.savedBody, kind: "success" });
  }

  return (
    <div className="space-y-4">
      <PersonalPageHeader screen="envelopes" />
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>{copy.bankCash}</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{formatINR(paiseToRupees(snap.bankCashPaise))}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{copy.reserved}</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{formatINR(paiseToRupees(snap.reservedPaise))}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{copy.leftToSpend}</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{formatINR(paiseToRupees(snap.availableToSpendPaise))}</CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>{copy.newEnvelope}</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Field label={copy.name} className="min-w-[180px] flex-1">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label={copy.reserve}>
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <div className="flex items-end">
            <Button onClick={() => void saveEnvelope()}>{saveLabel}</Button>
          </div>
        </CardContent>
      </Card>
      <div className="space-y-2">
        {funds.map((fund) => (
          <div key={fund.id} className="flex justify-between rounded-md border border-border px-3 py-2 text-sm">
            <span>{fund.name}</span>
            <span>{formatINR(paiseToRupees(fund.monthlyRequiredPaise ?? fund.targetPaise))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
