import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Label";
import { companyApi } from "@/company/api/client";
import { PageHeader } from "@/company/components/PageChrome";
import { useHasPermission } from "@/company/components/PermissionGate";
import { companyNavigate, companyPath } from "@/company/routes";
import { useCompanyStore } from "@/company/store/companyStore";
import type { CompanyLedger, CompanyParty } from "@/company/types";
import { invoiceThenReceipt } from "@/company/finance/playbookGoldens";
import { parseMoneyInputToPaise } from "@/utils/money";
import { useI18n } from "@/company/i18n/react";

type Kind = "sale" | "purchase";

export function InvoiceDocumentPage() {
  const { t } = useI18n();
  const companyId = useCompanyStore((s) => s.activeCompanyId);
  const canDraft = useHasPermission("create_purchase_sale");
  const [kind, setKind] = useState<Kind>("sale");
  const [base, setBase] = useState("");
  const [tax, setTax] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [partyId, setPartyId] = useState("");
  const [balanceLedgerId, setBalanceLedgerId] = useState("");
  const [nominalLedgerId, setNominalLedgerId] = useState("");
  const [taxLedgerId, setTaxLedgerId] = useState("");
  const [parties, setParties] = useState<CompanyParty[]>([]);
  const [ledgers, setLedgers] = useState<CompanyLedger[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [number, setNumber] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    void (async () => {
      try {
        const [partyRows, ledgerRows] = await Promise.all([
          companyApi.listParties(companyId),
          companyApi.listLedgers(companyId),
        ]);
        setParties(partyRows);
        setLedgers(ledgerRows);
      } catch (error) {
        setErr(error instanceof Error ? error.message : t("invoice.loadFailed"));
      }
    })();
  }, [companyId]);

  const preview = useMemo(() => {
    try {
      if (!base.trim()) return null;
      const basePaise = parseMoneyInputToPaise(base, { allowZero: false, throwOnInvalid: true });
      const taxPaise = tax.trim() ? parseMoneyInputToPaise(tax, { allowZero: true, throwOnInvalid: true }) : 0;
      return { basePaise, taxPaise, effect: invoiceThenReceipt({ taxablePaise: basePaise, taxPaise, receiptPaise: 0 }) };
    } catch {
      return null;
    }
  }, [base, tax]);

  async function saveDraft() {
    if (!companyId || !canDraft || !preview) return;
    if (!balanceLedgerId || !nominalLedgerId) {
      setErr(t("invoice.needLedgers"));
      return;
    }
    if (preview.taxPaise > 0 && !taxLedgerId) {
      setErr(t("invoice.needTaxLedger"));
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const result = await companyApi.draftInvoice(companyId, {
        mutationId: `inv-${crypto.randomUUID()}`,
        kind,
        basePaise: preview.basePaise,
        taxPaise: preview.taxPaise,
        voucherDate: date,
        partyId: partyId || undefined,
        balanceLedgerId,
        nominalLedgerId,
        taxLedgerId: taxLedgerId || undefined,
        narration: kind === "sale" ? t("invoice.salesNarration") : t("invoice.purchaseNarration"),
      }) as { voucher?: { id?: string; voucher_number?: string; voucherNumber?: string } };
      const id = result.voucher?.id ?? null;
      setDraftId(id);
      setNumber(result.voucher?.voucherNumber ?? result.voucher?.voucher_number ?? id);
      setPosted(false);
    } catch (error) {
      setErr(error instanceof Error ? error.message : t("invoice.draftFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function postDraft() {
    if (!companyId || !draftId || !canDraft) return;
    setBusy(true);
    setErr(null);
    try {
      const result = await companyApi.draftInvoice(companyId, { action: "post", voucherId: draftId }) as {
        voucher?: { voucher_number?: string; voucherNumber?: string };
      };
      setNumber(result.voucher?.voucherNumber ?? result.voucher?.voucher_number ?? number);
      setPosted(true);
    } catch (error) {
      setErr(error instanceof Error ? error.message : t("invoice.postFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <PageHeader
        title={t("invoice.title")}
        subtitle={t("invoice.subtitle")}
      />
      {!canDraft ? <p className="text-sm text-destructive">{t("invoice.noPermission")}</p> : null}
      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <Field label={t("invoice.document")}>
          <select className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
            <option value="sale">{t("invoice.sale")}</option>
            <option value="purchase">{t("invoice.purchase")}</option>
          </select>
        </Field>
        <Field label={t("invoice.base")}>
          <Input value={base} onChange={(e) => setBase(e.target.value)} inputMode="decimal" />
        </Field>
        <Field label={t("invoice.tax")}>
          <Input value={tax} onChange={(e) => setTax(e.target.value)} inputMode="decimal" placeholder={t("common.optional")} />
        </Field>
        <Field label={t("common.date")}>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label={t("invoice.party")}>
          <select className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm" value={partyId} onChange={(e) => setPartyId(e.target.value)}>
            <option value="">{t("common.optional")}</option>
            {parties.map((party) => (
              <option key={party.id} value={party.id}>{party.displayName}</option>
            ))}
          </select>
        </Field>
        <Field label={kind === "sale" ? t("invoice.receivableLedger") : t("invoice.payableLedger")}>
          <LedgerSelect ledgers={ledgers} value={balanceLedgerId} onChange={setBalanceLedgerId} placeholder={t("invoice.select")} />
        </Field>
        <Field label={kind === "sale" ? t("invoice.incomeLedger") : t("invoice.expenseLedger")}>
          <LedgerSelect ledgers={ledgers} value={nominalLedgerId} onChange={setNominalLedgerId} placeholder={t("invoice.select")} />
        </Field>
        <Field label={t("invoice.taxLedger")}>
          <LedgerSelect ledgers={ledgers} value={taxLedgerId} onChange={setTaxLedgerId} placeholder={t("invoice.select")} />
        </Field>
        {preview ? (
          <p className="text-sm text-muted-foreground">
            {t("invoice.preview", {
              open: preview.effect.openReceivablePaise / 100,
              revenue: preview.effect.revenuePaise / 100,
            })}
          </p>
        ) : null}
        {number ? (
          <p className="text-sm">
            {t("invoice.serverNumber", { number, status: posted ? t("invoice.posted") : t("invoice.draft") })}
          </p>
        ) : null}
        {err ? <p className="text-sm text-destructive">{err}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={busy || !canDraft} onClick={() => void saveDraft()}>{t("invoice.saveDraft")}</Button>
          <Button type="button" variant="outline" disabled={busy || !draftId || !canDraft} onClick={() => void postDraft()}>{t("invoice.post")}</Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!posted}
            onClick={() => companyNavigate(companyPath(kind === "sale" ? "quick-received" : "quick-paid"))}
          >
            {kind === "sale" ? t("invoice.recordReceipt") : t("invoice.recordPayment")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function LedgerSelect({
  ledgers,
  value,
  onChange,
  placeholder,
}: {
  ledgers: CompanyLedger[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
}) {
  return (
    <select className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {ledgers.map((ledger) => (
        <option key={ledger.id} value={ledger.id}>{ledger.name}</option>
      ))}
    </select>
  );
}
