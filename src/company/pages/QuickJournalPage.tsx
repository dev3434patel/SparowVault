import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Label";
import { dimensionSplit } from "@/company/services/costSplit";
import { assertBalanced, sumCredit, sumDebit } from "@/company/services/voucherBalance";
import type { CompanyLedger, DraftVoucherLine, LineSide } from "@/company/types";
import { parseMoneyInputToPaise, formatMoney } from "@/utils/money";
import { companyApi } from "@/company/api/client";
import { useCompanyStore } from "@/company/store/companyStore";
import { PageHeader } from "@/company/components/PageChrome";
import { useHasPermission } from "@/company/components/PermissionGate";
import { useI18n } from "@/company/i18n/react";

type Row = { ledgerId: string; side: LineSide; amount: string };

export function QuickJournalPage() {
  const { t } = useI18n();
  const canPost = useHasPermission("create_journal");
  const companyId = useCompanyStore((s) => s.activeCompanyId);
  const [ledgers, setLedgers] = useState<CompanyLedger[]>([]);
  const [rows, setRows] = useState<Row[]>([
    { ledgerId: "", side: "DEBIT", amount: "" },
    { ledgerId: "", side: "CREDIT", amount: "" },
  ]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [centreA, setCentreA] = useState("");
  const [centreB, setCentreB] = useState("");
  const [splitA, setSplitA] = useState("");
  const [splitB, setSplitB] = useState("");
  const [correctionOfVoucherId, setCorrectionOfVoucherId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const corr = params.get("correctionOfVoucherId");
    if (corr) {
      setCorrectionOfVoucherId(corr);
      setNote((n) => n || `Correction of ${corr.slice(0, 12)}`);
    }
  }, []);

  useEffect(() => {
    if (!companyId) return;
    void (async () => {
      try {
        const l = await companyApi.listLedgers(companyId);
        const mapped = (l as unknown as Array<Record<string, unknown>>).map((row) => ({
          id: String(row.id),
          companyId: String(row.company_id ?? companyId),
          groupId: String(row.group_id ?? ""),
          name: String(row.name),
          code: String(row.code),
          isCashBank: Boolean(Number(row.is_cash_bank ?? row.isCashBank ?? 0)),
          isPartyControl: Boolean(Number(row.is_party_control ?? row.isPartyControl ?? 0)),
          active: Boolean(row.active ?? true),
        })) as CompanyLedger[];
        setLedgers(mapped);
        const expense = mapped.find((x) => x.code === "OTHER_EXPENSE") ?? mapped[0];
        const cash = mapped.find((x) => x.code === "CASH_IN_HAND") ?? mapped.find((x) => x.isCashBank);
        setRows([
          { ledgerId: expense?.id ?? "", side: "DEBIT", amount: "" },
          { ledgerId: cash?.id ?? "", side: "CREDIT", amount: "" },
        ]);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load ledgers");
      }
    })();
  }, [companyId]);

  const lines: DraftVoucherLine[] = useMemo(() => {
    return rows
      .map((r) => {
        try {
          if (!r.ledgerId) return null;
          const amountPaise = parseMoneyInputToPaise(r.amount, { allowZero: false, throwOnInvalid: true });
          return { ledgerId: r.ledgerId, side: r.side, amountPaise };
        } catch {
          return null;
        }
      })
      .filter(Boolean) as DraftVoucherLine[];
  }, [rows]);

  const dr = sumDebit(lines);
  const cr = sumCredit(lines);
  const balanced = lines.length >= 2 && dr === cr && dr > 0;

  async function onSave() {
    setMsg(null);
    if (!companyId) {
      setErr("Select a company first");
      return;
    }
    if (!canPost) {
      setErr("You do not have permission to post a journal.");
      return;
    }
    try {
      assertBalanced(lines);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Unbalanced");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      let postedLines = lines.map((l) => ({
        ledgerId: l.ledgerId,
        side: l.side,
        amountPaise: l.amountPaise,
      }));
      if (centreA && centreB && splitA && splitB) {
        const firstDebit = postedLines.find((line) => line.side === "DEBIT");
        const split = dimensionSplit(firstDebit?.amountPaise ?? 0, [
          { costCentreId: centreA, amountPaise: parseMoneyInputToPaise(splitA, { allowZero: false, throwOnInvalid: true }) },
          { costCentreId: centreB, amountPaise: parseMoneyInputToPaise(splitB, { allowZero: false, throwOnInvalid: true }) },
        ]);
        if (split.error || !split.costAllocations || !firstDebit) {
          setErr(split.error ?? "The dimension split must equal the voucher amount.");
          setSaving(false);
          return;
        }
        let attached = false;
        postedLines = postedLines.map((line) => {
          if (attached || line !== firstDebit) return line;
          attached = true;
          return { ...line, costAllocations: split.costAllocations };
        });
      }
      const res = await companyApi.postVoucher(companyId, {
        mutationId: `ui-jnl-${crypto.randomUUID()}`,
        voucherType: "JOURNAL",
        voucherDate: new Date().toISOString().slice(0, 10),
        narration: note || "Journal entry",
        correctionOfVoucherId: correctionOfVoucherId || undefined,
        lines: postedLines,
        status: "POSTED",
      });
      setMsg(`Posted journal ${(res as { id?: string }).id ?? ""}`);
      setRows((prev) => prev.map((r) => ({ ...r, amount: "" })));
      setNote("");
      setCorrectionOfVoucherId(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Post failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <PageHeader title={t("quick.journalTitle")} subtitle={t("quick.journalHelper")} />
      {correctionOfVoucherId ? (
        <p className="text-xs text-amber-700">
          {t("vouchers.correct")}: {correctionOfVoucherId.slice(0, 12)}…
        </p>
      ) : null}
      {rows.map((r, idx) => (
        <div key={idx} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Field label={t("quick.cashBankLedger")}>
            <select
              className="flex h-9 w-full rounded-md border border-[hsl(var(--input))] bg-card px-3 text-sm"
              value={r.ledgerId}
              onChange={(e) => {
                const next = [...rows];
                next[idx] = { ...r, ledgerId: e.target.value };
                setRows(next);
              }}
            >
              <option value="">{t("quick.selectLedger")}</option>
              {ledgers.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.code})
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("common.type")}>
            <select
              className="flex h-9 w-full rounded-md border border-[hsl(var(--input))] bg-card px-3 text-sm"
              value={r.side}
              onChange={(e) => {
                const next = [...rows];
                next[idx] = { ...r, side: e.target.value as LineSide };
                setRows(next);
              }}
            >
              <option value="DEBIT">{t("vouchers.debit")}</option>
              <option value="CREDIT">{t("vouchers.credit")}</option>
            </select>
          </Field>
          <Field label={t("quick.amount")}>
            <Input
              value={r.amount}
              onChange={(e) => {
                const next = [...rows];
                next[idx] = { ...r, amount: e.target.value };
                setRows(next);
              }}
            />
          </Field>
        </div>
      ))}
      <Button
        variant="outline"
        type="button"
        onClick={() => setRows((prev) => [...prev, { ledgerId: "", side: "DEBIT", amount: "" }])}
      >
        {t("common.add")} {t("vouchers.lines")}
      </Button>
      <Field label={t("common.note")}>
        <Input value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Field label="Cost centre A">
          <Input value={centreA} onChange={(e) => setCentreA(e.target.value)} placeholder="Optional id" />
        </Field>
        <Field label="Split A">
          <Input value={splitA} onChange={(e) => setSplitA(e.target.value)} placeholder="0.00" />
        </Field>
        <Field label="Cost centre B">
          <Input value={centreB} onChange={(e) => setCentreB(e.target.value)} placeholder="Optional id" />
        </Field>
        <Field label="Split B">
          <Input value={splitB} onChange={(e) => setSplitB(e.target.value)} placeholder="0.00" />
        </Field>
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Totals</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-between text-sm tabular-nums">
          <span>Dr {formatMoney(dr)}</span>
          <span>Cr {formatMoney(cr)}</span>
          <span className={balanced ? "text-emerald-600" : "text-destructive"}>
            {balanced ? "Balanced" : "Unbalanced"}
          </span>
        </CardContent>
      </Card>
      {err ? <p className="text-sm text-destructive">{err}</p> : null}
      {msg ? <p className="text-sm text-emerald-600">{msg}</p> : null}
      <Button className="w-full" disabled={saving || !balanced} onClick={() => void onSave()}>
        {saving ? t("quick.posting") : t("quick.post")}
      </Button>
    </div>
  );
}
