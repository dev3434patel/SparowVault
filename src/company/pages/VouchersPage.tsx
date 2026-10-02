import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { companyNavigate, companyPath } from "@/company/routes";
import { companyApi } from "@/company/api/client";
import { useCompanyStore } from "@/company/store/companyStore";
import type { CompanyVoucher } from "@/company/types";
import { formatMoney } from "@/utils/money";
import { PageHeader, StatusBadge, type BadgeStatus } from "@/company/components/PageChrome";
import { SkeletonTable } from "@/company/components/CompanySkeleton";
import { ResponsiveList, ScrollTable } from "@/company/components/responsive";
import { useI18n } from "@/company/i18n/react";
import { PinConfirmDialog } from "@/company/components/PinConfirmDialog";
import { voucherListAmountPaise } from "@/company/finance/voucherListAmount";
import { localIsoDate, localMonthStart } from "@/company/lib/localDate";

export function VouchersPage() {
  const { t } = useI18n();
  const companyId = useCompanyStore((s) => s.activeCompanyId);
  const [vouchers, setVouchers] = useState<CompanyVoucher[]>([]);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [partyId, setPartyId] = useState(() =>
    typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("partyId") ?? "",
  );
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [monthStart] = useState(() => {
    const from = typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("from") ?? "";
    if (from) return from;
    return localMonthStart();
  });
  const [today] = useState(() => {
    const to = typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("to") ?? "";
    return to || localIsoDate();
  });

  useEffect(() => {
    const read = () => setPartyId(new URLSearchParams(window.location.search).get("partyId") ?? "");
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setErr(null);
      try {
        const rows = await companyApi.listVouchers(companyId, {
          from: monthStart,
          to: today,
          partyId: partyId || undefined,
          voucherType: typeFilter || undefined,
          search: q.trim() || undefined,
        });
        if (!cancelled) setVouchers(rows);
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : t("vouchers.loadFailed"));
          setVouchers([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, monthStart, today, typeFilter, q, partyId, t]);

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("vouchers.title")}
        subtitle={
          partyId
            ? `${t("vouchers.subtitle", { from: monthStart, to: today })} · party filter on`
            : t("vouchers.subtitle", { from: monthStart, to: today })
        }
        actions={
          <Button size="sm" onClick={() => companyNavigate(companyPath("voucher-new"))}>
            {t("vouchers.newEntry")}
          </Button>
        }
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder={t("vouchers.searchPlaceholder")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-10"
          aria-label={t("a11y.searchVouchers")}
        />
        <select
          className="flex h-10 rounded-md border border-[hsl(var(--input))] bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          aria-label={t("a11y.filterVoucherType")}
        >
          <option value="">{t("vouchers.allTypes")}</option>
          {["RECEIPT", "PAYMENT", "CONTRA", "JOURNAL", "PURCHASE", "SALE"].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      {err ? <p className="text-sm text-destructive">{err}</p> : null}
      {loading ? <SkeletonTable rows={6} cols={5} /> : null}
      {!loading && !err && vouchers.length === 0 ? (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            {t("vouchers.empty")}
          </CardContent>
        </Card>
      ) : !loading ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {t("vouchers.dayBook", { from: monthStart, to: today })}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ResponsiveList
              mobile={
                <ul className="space-y-2 p-3">
                  {vouchers.map((v) => {
                    const amt = voucherListAmountPaise(v);
                    return (
                      <li key={v.id}>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-card p-3.5 text-left shadow-[var(--shadow-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
                          aria-label={`Date ${v.voucherDate}, Number ${v.voucherNumber || v.id.slice(0, 8)}, Type ${v.voucherType}, Status ${v.status}, Amount ${formatMoney(amt)}`}
                          onClick={() => companyNavigate(companyPath("voucher-detail", { id: v.id }))}
                        >
                          <span className="min-w-0">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold">
                                {v.voucherType} · {v.voucherDate}
                              </span>
                              <StatusBadge status={v.status as BadgeStatus} />
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                              {v.voucherNumber || v.id.slice(0, 8)}
                            </span>
                          </span>
                          <span className="shrink-0 text-sm font-semibold tabular-nums" aria-label={`Amount ${formatMoney(amt)}`}>
                            {formatMoney(amt)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              }
              desktop={
                <ScrollTable>
                  <table className="w-full min-w-[32rem] text-sm">
                    <thead className="border-b border-border text-left text-xs text-muted-foreground">
                      <tr>
                        <th scope="col" className="px-4 py-2">{t("common.date")}</th>
                        <th scope="col" className="px-4 py-2">{t("common.number")}</th>
                        <th scope="col" className="px-4 py-2">{t("common.type")}</th>
                        <th scope="col" className="px-4 py-2">{t("common.status")}</th>
                        <th scope="col" className="px-4 py-2 text-right">{t("common.amount")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vouchers.map((v) => {
                        const amt = voucherListAmountPaise(v);
                        return (
                          <tr
                            key={v.id}
                            className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-2"
                            onClick={() => companyNavigate(companyPath("voucher-detail", { id: v.id }))}
                          >
                            <td className="px-4 py-2">{v.voucherDate}</td>
                            <td className="px-4 py-2 font-medium">{v.voucherNumber || v.id.slice(0, 8)}</td>
                            <td className="px-4 py-2">{v.voucherType}</td>
                            <td className="px-4 py-2">
                              <StatusBadge status={v.status as BadgeStatus} />
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums">{formatMoney(amt)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </ScrollTable>
              }
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export function VoucherDetailPage({ voucherId }: { voucherId: string }) {
  const { t } = useI18n();
  const companyId = useCompanyStore((s) => s.activeCompanyId);
  const [voucher, setVoucher] = useState<CompanyVoucher | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reversing, setReversing] = useState(false);
  const [pinMode, setPinMode] = useState<null | "reverse" | "correct">(null);

  async function load() {
    if (!companyId || !voucherId) return;
    setLoading(true);
    setErr(null);
    try {
      setVoucher(await companyApi.getVoucher(companyId, voucherId));
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("vouchers.detailLoadFailed"));
      setVoucher(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [companyId, voucherId]);

  async function confirmPin(pin: string, reason: string) {
    if (!companyId || !voucher || !pinMode) return;
    if (!reason.trim()) {
      setErr(t("vouchers.reasonRequired"));
      return;
    }
    const mode = pinMode;
    setReversing(true);
    setErr(null);
    try {
      await companyApi.reverseVoucher(companyId, voucher.id, {
        mutationId: `ui-${mode}-${crypto.randomUUID()}`,
        reason: reason.trim(),
        pin,
      });
      setPinMode(null);
      if (mode === "correct") {
        const params = new URLSearchParams({
          correctionOfVoucherId: voucher.id,
          partyId: voucher.partyId ?? "",
        });
        companyNavigate(`${companyPath("quick-journal")}?${params.toString()}`);
        return;
      }
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : mode === "correct" ? t("vouchers.correctFailed") : t("vouchers.reverseFailed"));
    } finally {
      setReversing(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button variant="ghost" size="sm" onClick={() => companyNavigate(companyPath("vouchers"))}>
        ← {t("vouchers.title")}
      </Button>
      {loading ? <SkeletonTable rows={6} cols={5} /> : null}
      {err ? <p className="text-sm text-destructive">{err}</p> : null}
      {voucher ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h1 className="text-lg font-semibold">
                {voucher.voucherNumber || voucher.id.slice(0, 8)}
              </h1>
              <p className="text-sm text-muted-foreground">
                {voucher.voucherType} · {voucher.voucherDate} · {voucher.status}
              </p>
              {voucher.narration ? <p className="mt-1 text-sm">{voucher.narration}</p> : null}
              {voucher.reversedVoucherId ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Reversal voucher:{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() =>
                      companyNavigate(companyPath("voucher-detail", { id: voucher.reversedVoucherId! }))
                    }
                  >
                    {voucher.reversedVoucherId.slice(0, 12)}…
                  </button>
                </p>
              ) : null}
              {voucher.correctionOfVoucherId ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Correction of:{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() =>
                      companyNavigate(
                        companyPath("voucher-detail", { id: voucher.correctionOfVoucherId! }),
                      )
                    }
                  >
                    {voucher.correctionOfVoucherId.slice(0, 12)}…
                  </button>
                </p>
              ) : null}
            </div>
            {voucher.status === "POSTED" ? (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={reversing} onClick={() => setPinMode("correct")}>
                  {t("vouchers.correct")}
                </Button>
                <Button size="sm" variant="outline" disabled={reversing} onClick={() => setPinMode("reverse")}>
                  {reversing ? t("common.loading") : t("vouchers.reverse")}
                </Button>
              </div>
            ) : null}
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t("vouchers.lines")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {(voucher.lines ?? []).map((l, i) => (
                <div key={l.id ?? i} className="flex justify-between gap-2 tabular-nums">
                  <span>
                    {l.side === "DEBIT" ? "Dr" : "Cr"} ·{" "}
                    {l.ledgerName || l.ledgerCode || l.ledgerId.slice(0, 8)}
                  </span>
                  <span>{formatMoney(l.amountPaise)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : null}
      <PinConfirmDialog
        open={pinMode !== null}
        title={pinMode === "correct" ? t("vouchers.correct") : t("vouchers.reverse")}
        confirmLabel={pinMode === "correct" ? t("vouchers.correct") : t("vouchers.reverse")}
        busy={reversing}
        onCancel={() => setPinMode(null)}
        onConfirm={(pin, reason) => void confirmPin(pin, reason)}
      />
    </div>
  );
}
