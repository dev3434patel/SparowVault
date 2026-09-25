import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Label";
import { mapPurposeToDraftLines } from "@/company/services/purposeEngine";
import { assertBalanced } from "@/company/services/voucherBalance";
import { parseMoneyInputToPaise, formatMoney } from "@/utils/money";
import { companyApi } from "@/company/api/client";
import { useCompanyStore } from "@/company/store/companyStore";
import type { CompanyLedger } from "@/company/types";
import { PageHeader } from "@/company/components/PageChrome";
import { useI18n } from "@/company/i18n/react";

export function QuickTransferPage() {
  const { t } = useI18n();
  const companyId = useCompanyStore((s) => s.activeCompanyId);
  const [amount, setAmount] = useState("");
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [ledgers, setLedgers] = useState<CompanyLedger[]>([]);

  useEffect(() => {
    if (!companyId) return;
    void (async () => {
      try {
        const l = await companyApi.listLedgers(companyId);
        const rows = (l as unknown as Array<Record<string, unknown>>).map((row) => ({
          id: String(row.id),
          companyId: String(row.company_id ?? companyId),
          groupId: String(row.group_id ?? ""),
          name: String(row.name),
          code: String(row.code),
          isCashBank: Boolean(Number(row.is_cash_bank ?? row.isCashBank ?? 0)),
          isPartyControl: Boolean(Number(row.is_party_control ?? row.isPartyControl ?? 0)),
          active: Boolean(row.active ?? true),
        })) as CompanyLedger[];
        const banks = rows.filter((x) => x.isCashBank);
        setLedgers(banks);
        const cash = banks.find((x) => x.code === "CASH_IN_HAND") ?? banks[0];
        const bank = banks.find((x) => x.code === "BANK_PRIMARY") ?? banks[1] ?? banks[0];
        if (cash) setFromId(cash.id);
        if (bank) setToId(bank.id);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load ledgers");
      }
    })();
  }, [companyId]);

  const preview = useMemo(() => {
    try {
      if (!fromId || !toId) return { lines: [], error: "Select from and to accounts" as string | null };
      const amountPaise = parseMoneyInputToPaise(amount, { allowZero: false, throwOnInvalid: true });
      const lines = mapPurposeToDraftLines({
        purpose: "CONTRA",
        amountPaise,
        cashBankLedgerId: fromId,
        partyRelationshipLedgerId: toId,
        fromLedgerId: fromId,
        toLedgerId: toId,
      });
      assertBalanced(lines);
      return { lines, error: null as string | null };
    } catch (e) {
      return { lines: [], error: e instanceof Error ? e.message : "Invalid" };
    }
  }, [amount, fromId, toId]);

  async function onSave() {
    setMsg(null);
    if (!companyId) {
      setErr("Select a company first");
      return;
    }
    if (preview.error) {
      setErr(preview.error);
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const amountPaise = parseMoneyInputToPaise(amount, { allowZero: false, throwOnInvalid: true });
      const res = await companyApi.postVoucher(companyId, {
        mutationId: `ui-contra-${crypto.randomUUID()}`,
        voucherType: "CONTRA",
        voucherDate: new Date().toISOString().slice(0, 10),
        narration: note || "Transfer",
        lines: [
          { ledgerId: toId, side: "DEBIT", amountPaise },
          { ledgerId: fromId, side: "CREDIT", amountPaise },
        ],
        status: "POSTED",
      });
      const id = (res as { id?: string }).id ?? "saved";
      setMsg(`Posted transfer ${id}`);
      setAmount("");
      setNote("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Post failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-3">
      <PageHeader title={t("quick.transferTitle")} subtitle={t("quick.transferHelper")} />
      <Field label={t("quick.amount")}>
        <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
      </Field>
      <Field label={t("quick.fromLedger")}>
        <select
          className="flex h-9 w-full rounded-md border border-[hsl(var(--input))] bg-card px-3 text-sm"
          value={fromId}
          onChange={(e) => setFromId(e.target.value)}
        >
          {ledgers.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} ({l.code})
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("quick.toLedger")}>
        <select
          className="flex h-9 w-full rounded-md border border-[hsl(var(--input))] bg-card px-3 text-sm"
          value={toId}
          onChange={(e) => setToId(e.target.value)}
        >
          {ledgers.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} ({l.code})
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("quick.note")}>
        <Input value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t("quick.preview")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {preview.error ? (
            <p className="text-muted-foreground">{preview.error}</p>
          ) : (
            preview.lines.map((l, i) => {
              const ledger = ledgers.find((x) => x.id === l.ledgerId);
              return (
                <div key={i} className="flex justify-between tabular-nums">
                  <span>
                    {ledger?.name ?? l.ledgerId.slice(0, 8)} {l.side === "DEBIT" ? "Dr" : "Cr"}
                  </span>
                  <span>{formatMoney(l.amountPaise)}</span>
                </div>
              );
            })
          )}
          <p className="text-xs text-muted-foreground">Profit: No change · Party: No change</p>
        </CardContent>
      </Card>
      {err ? <p className="text-sm text-destructive">{err}</p> : null}
      {msg ? <p className="text-sm text-emerald-600">{msg}</p> : null}
      <Button className="w-full" disabled={saving || !!preview.error} onClick={() => void onSave()}>
        {saving ? t("quick.posting") : t("quick.post")}
      </Button>
    </div>
  );
}
