import { useEffect, useMemo, useState } from "react";
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
import { formatINR } from "@/lib/format";
import { sinkingFundRepo } from "@/repositories";
import { deriveAccountBalanceFromAccount } from "@/services/calculations";
import {
  createCashReservation,
  isWealthSinkingFundInvestment,
  reservationViewFromFunds,
} from "@/services/personalBookWorkflows";
import { useAuthStore } from "@/store/authStore";
import { useDataStore } from "@/store/dataStore";
import { useUIStore } from "@/store/uiStore";
import type { SinkingFund } from "@/types";
import { paiseToRupees, rupeesToPaise } from "@/utils/money";
import { useMessages } from "@/i18n/useMessages";

export function EnvelopeReservations() {
  const copy = useMessages().copy.reservations;
  const user = useAuthStore((s) => s.currentUser);
  const accounts = useDataStore((s) => s.accounts);
  const transactions = useDataStore((s) => s.transactions);
  const goalContribs = useDataStore((s) => s.goalContribs);
  const investments = useDataStore((s) => s.investments);
  const toast = useUIStore((s) => s.toast);
  const [funds, setFunds] = useState<SinkingFund[]>([]);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"envelope" | "sinking">("envelope");
  const [target, setTarget] = useState("");
  const [reserved, setReserved] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function reload() {
    if (!user) return;
    const rows = await sinkingFundRepo.list(user.id);
    setFunds(rows.filter((row) => row.isDeleted !== 1));
  }

  useEffect(() => {
    void reload();
  }, [user?.id]);

  const bankCashPaise = useMemo(() => {
    return accounts
      .filter((account) => account.isDeleted !== 1 && account.isInactive !== 1)
      .reduce((sum, account) => sum + deriveAccountBalanceFromAccount(account.id, account, transactions), 0);
  }, [accounts, transactions]);

  const goalEarmarkPaise = useMemo(() => {
    return goalContribs
      .filter((row) => row.isDeleted !== 1 && (row.notes ?? "").includes("fundingMode:earmark"))
      .reduce((sum, row) => sum + (row.amountPaise ?? rupeesToPaise(row.amount)), 0);
  }, [goalContribs]);

  const snap = reservationViewFromFunds({ bankCashPaise, funds, goalEarmarkPaise });
  const wealthBuckets = investments.filter((row) => row.isDeleted !== 1 && isWealthSinkingFundInvestment(row)).length;

  async function save() {
    if (!user || saving) return;
    setSaving(true);
    try {
      await createCashReservation(user.id, {
        name,
        kind,
        targetPaise: rupeesToPaise(Number(target)),
        reservedPaise: rupeesToPaise(Number(reserved || "0")),
        targetDate,
      });
      setName("");
      setTarget("");
      setReserved("");
      toast({ title: kind === "envelope" ? copy.envelopeSaved : copy.sinkingSaved, kind: "success" });
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
        <CardTitle>{copy.title}</CardTitle>
        <CardDescription>
          {copy.body}
          {wealthBuckets > 0 ? ` (${wealthBuckets} ${copy.buckets})` : ""}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <div className="text-xs text-muted-foreground">{copy.bankCash}</div>
            <div className="text-lg font-semibold">{formatINR(paiseToRupees(snap.bankCashPaise))}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{copy.reserved}</div>
            <div className="text-lg font-semibold">{formatINR(paiseToRupees(snap.reservedPaise))}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{copy.available}</div>
            <div className="text-lg font-semibold">{formatINR(paiseToRupees(snap.availableToSpendPaise))}</div>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label={copy.name}>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={copy.namePh} />
          </Field>
          <Field label={copy.kind}>
            <Select value={kind} onValueChange={(value) => setKind(value as "envelope" | "sinking")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="envelope">{copy.envelope}</SelectItem>
                <SelectItem value="sinking">{copy.sinking}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label={copy.target}>
            <Input value={target} onChange={(event) => setTarget(event.target.value)} inputMode="decimal" />
          </Field>
          <Field label={copy.reservedNow}>
            <Input value={reserved} onChange={(event) => setReserved(event.target.value)} inputMode="decimal" />
          </Field>
          <Field label={copy.targetDate}>
            <Input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />
          </Field>
        </div>
        <Button onClick={() => void save()} loading={saving}>{copy.save}</Button>
        <div className="space-y-2">
          {funds.length === 0 ? (
            <p className="text-sm text-muted-foreground">{copy.empty}</p>
          ) : (
            funds.map((fund) => (
              <div key={fund.id} className="flex items-center justify-between text-sm">
                <span>{fund.name}</span>
                <span className="text-muted-foreground">{fund.notes}</span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
