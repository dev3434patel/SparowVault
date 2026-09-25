import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Label";
import { PURPOSE_CATALOGUE, getPurposesForVoucherType } from "@/company/services/purposeEngine";
import type { PurposeCode, CompanyParty, CompanyLedger } from "@/company/types";
import { parseMoneyInputToPaise, formatMoney } from "@/utils/money";
import { companyApi, type VoucherPreviewLine } from "@/company/api/client";
import { useCompanyStore } from "@/company/store/companyStore";
import { companyNavigate, companyPath } from "@/company/routes";
import { PageHeader } from "@/company/components/PageChrome";
import { useI18n } from "@/company/i18n/react";

function QuickForm({
  title,
  helper,
  direction,
}: {
  title: string;
  helper: string;
  direction: "received" | "paid";
}) {
  const { t } = useI18n();
  const companyId = useCompanyStore((s) => s.activeCompanyId);
  const purposes = useMemo(
    () => getPurposesForVoucherType(direction === "received" ? "RECEIPT" : "PAYMENT"),
    [direction],
  );
  const defaultPurpose = (purposes[0]?.code ??
    (direction === "received" ? "OTHER_RECEIPT" : "OTHER_PAYMENT")) as PurposeCode;
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [purpose, setPurpose] = useState<PurposeCode>(defaultPurpose);
  const [partyId, setPartyId] = useState("");
  const [cashLedgerId, setCashLedgerId] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [postedId, setPostedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [parties, setParties] = useState<CompanyParty[]>([]);
  const [ledgers, setLedgers] = useState<CompanyLedger[]>([]);
  const [previewLines, setPreviewLines] = useState<VoucherPreviewLine[]>([]);
  const [previewHash, setPreviewHash] = useState<string | undefined>();
  const [previewErr, setPreviewErr] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const meta = PURPOSE_CATALOGUE[purpose];
  const requiresParty = Boolean(meta?.requiresParty);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("partyId");
    if (fromUrl) setPartyId(fromUrl);
  }, []);

  useEffect(() => {
    if (!companyId) return;
    void (async () => {
      try {
        const [p, l] = await Promise.all([
          companyApi.listParties(companyId),
          companyApi.listLedgers(companyId),
        ]);
        setParties(p);
        setLedgers(l);
        const bank = l.find((x) => x.code === "BANK_PRIMARY") ?? l.find((x) => x.isCashBank);
        if (bank) setCashLedgerId(bank.id);
      } catch (e) {
        setErr(e instanceof Error ? e.message : t("quick.loadMastersFailed"));
      }
    })();
  }, [companyId]);

  // Debounced server preview
  useEffect(() => {
    if (!companyId || !cashLedgerId) return;
    let amountPaise = 0;
    try {
      amountPaise = parseMoneyInputToPaise(amount, { allowZero: false, throwOnInvalid: true });
    } catch {
      setPreviewLines([]);
      setPreviewHash(undefined);
      setPreviewErr(null);
      return;
    }
    if (requiresParty && !partyId) {
      setPreviewLines([]);
      setPreviewHash(undefined);
      setPreviewErr(t("quick.requiresParty"));
      return;
    }

    setPreviewLoading(true);
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await companyApi.previewVoucher(companyId, {
            purpose,
            amountPaise,
            partyId: partyId || undefined,
            cashBankLedgerId: cashLedgerId,
          });
          setPreviewLines(res.lines ?? []);
          setPreviewHash(res.previewHash);
          setPreviewErr(null);
        } catch (e) {
          setPreviewLines([]);
          setPreviewHash(undefined);
          setPreviewErr(e instanceof Error ? e.message : "Preview failed");
        } finally {
          setPreviewLoading(false);
        }
      })();
    }, 350);

    return () => {
      window.clearTimeout(handle);
    };
  }, [companyId, amount, purpose, partyId, cashLedgerId, requiresParty]);

  const ledgerNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of ledgers) m.set(l.id, `${l.name} (${l.code})`);
    return m;
  }, [ledgers]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setOk(null);
    setPostedId(null);
    if (!companyId) {
      setErr("Select a company first");
      return;
    }
    if (requiresParty && !partyId) {
      setErr("Party is required for this purpose");
      return;
    }
    if (previewErr) {
      setErr(previewErr);
      return;
    }
    if (!cashLedgerId) {
      setErr("Cash/bank ledger required");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const amountPaise = parseMoneyInputToPaise(amount, { allowZero: false, throwOnInvalid: true });
      const res = await companyApi.postVoucher(companyId, {
        mutationId: `ui-${crypto.randomUUID()}`,
        purpose,
        voucherDate: date,
        partyId: partyId || undefined,
        amountPaise,
        cashBankLedgerId: cashLedgerId,
        narration: note || undefined,
        status: "POSTED",
        ...(previewHash ? { previewHash } : {}),
      });
      setOk(`Posted voucher ${res.voucherNumber || res.id}`);
      setPostedId(res.id);
      setAmount("");
      setNote("");
      setPreviewLines([]);
      setPreviewHash(undefined);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Post failed");
    } finally {
      setSaving(false);
    }
  }

  const cashBanks = ledgers.filter((l) => l.isCashBank);

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <PageHeader title={title} subtitle={helper} />
      <form
        className="space-y-3.5 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5"
        onSubmit={(e) => void onSave(e)}
      >
        <Field label={t("quick.amount")}>
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" required className="h-11 text-base font-semibold tabular-nums" />
        </Field>
        <Field label={t("quick.date")}>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <Field label={t("quick.party")}>
          <select
            className="flex h-9 w-full rounded-md border border-[hsl(var(--input))] bg-card px-3 text-sm"
            value={partyId}
            onChange={(e) => setPartyId(e.target.value)}
            required={requiresParty}
          >
            <option value="">{t("quick.selectParty")}</option>
            {parties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("quick.cashBankLedger")}>
          <select
            className="flex h-9 w-full rounded-md border border-[hsl(var(--input))] bg-card px-3 text-sm"
            value={cashLedgerId}
            onChange={(e) => setCashLedgerId(e.target.value)}
            required
          >
            {cashBanks.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.code})
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("quick.purpose")}>
          <select
            className="flex h-9 w-full rounded-md border border-[hsl(var(--input))] bg-card px-3 text-sm"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value as PurposeCode)}
          >
            {purposes.map((p) => (
              <option key={p.code} value={p.code}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("quick.note")}>
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>

        <Card className="border-dashed shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {t("quick.preview")} {previewLoading ? t("quick.previewLoading") : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {previewErr ? (
              <div className="text-destructive">{previewErr}</div>
            ) : previewLines.length === 0 ? (
              <div className="text-muted-foreground">Enter amount to preview lines.</div>
            ) : (
              previewLines.map((l, i) => (
                <div key={i} className="flex justify-between tabular-nums">
                  <span>
                    {l.side === "DEBIT" ? "Dr" : "Cr"} ·{" "}
                    {l.ledgerName || ledgerNameById.get(l.ledgerId) || l.ledgerId.slice(0, 8)}
                  </span>
                  <span>{formatMoney(l.amountPaise)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {err ? <p className="text-sm text-destructive">{err}</p> : null}
        {ok ? (
          <div className="space-y-2 rounded-xl border border-[hsl(var(--income))]/25 bg-[hsl(var(--income-soft))]/50 p-3.5 text-sm">
            <p className="font-medium text-[hsl(var(--income))]">{ok}</p>
            <div className="flex flex-wrap gap-2">
              {postedId ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => companyNavigate(companyPath("voucher-detail", { id: postedId }))}
                >
                  View voucher
                </Button>
              ) : null}
              {partyId ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => companyNavigate(companyPath("party-detail", { id: partyId }))}
                >
                  Go to party
                </Button>
              ) : null}
              <Button type="button" size="sm" variant="secondary" onClick={() => setOk(null)}>
                Add another
              </Button>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="submit" className="min-h-11 flex-1 sm:flex-none" disabled={saving || !!previewErr || previewLines.length === 0}>
            {saving ? t("quick.posting") : t("quick.post")}
          </Button>
          <Button type="button" variant="secondary" className="min-h-11" onClick={() => companyNavigate(companyPath("dashboard"))}>
            {t("dashboard.title")}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function QuickReceivedPage() {
  const { t } = useI18n();
  return (
    <QuickForm title={t("quick.receivedTitle")} helper={t("quick.receivedHelper")} direction="received" />
  );
}

export function QuickPaidPage() {
  const { t } = useI18n();
  return (
    <QuickForm title={t("quick.paidTitle")} helper={t("quick.paidHelper")} direction="paid" />
  );
}
