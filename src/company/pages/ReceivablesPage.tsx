import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Label";
import { companyApi } from "@/company/api/client";
import { useCompanyStore } from "@/company/store/companyStore";
import { formatMoney } from "@/utils/money";
import { companyNavigate, companyPath } from "@/company/routes";
import { PageHeader } from "@/company/components/PageChrome";
import { CompanyMoney } from "@/company/components/CompanyMoney";
import { KpiCard } from "@/company/components/KpiCard";
import { SkeletonKpiRow, SkeletonTable } from "@/company/components/CompanySkeleton";
import { ResponsiveList, ScrollTable } from "@/company/components/responsive";
import { useI18n } from "@/company/i18n/react";
import { useHasPermission } from "@/company/components/PermissionGate";

type BillRow = {
  id: string;
  partyId: string;
  partyName?: string;
  refNumber: string;
  billDate: string;
  dueDate?: string | null;
  outstandingPaise: number;
  status: string;
};

const BUCKET_KEYS = ["notDue", "d0_15", "d16_30", "d31_60", "d61_90", "d90plus"] as const;

function OutstandingPage({
  title,
  helper,
  side,
  ageingSide,
}: {
  title: string;
  helper: string;
  side: "RECEIVABLE" | "PAYABLE";
  ageingSide: "receivable" | "payable";
}) {
  const { t } = useI18n();
  const companyId = useCompanyStore((s) => s.activeCompanyId);
  const [bills, setBills] = useState<BillRow[]>([]);
  const [buckets, setBuckets] = useState<Record<string, number>>({});
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [allocBill, setAllocBill] = useState<BillRow | null>(null);
  const [allocAmount, setAllocAmount] = useState("");
  const canAllocate = useHasPermission("post_voucher");

  async function load() {
    if (!companyId) return;
    setLoading(true);
    setErr(null);
    try {
      const [billRows, ageing] = await Promise.all([
        companyApi.listBills(companyId, side),
        companyApi.report(companyId, "ageing", undefined, undefined, { side: ageingSide }),
      ]);
      setBills(
        billRows.map((b) => ({
          id: b.id,
          partyId: b.partyId,
          partyName: (b as { partyName?: string }).partyName,
          refNumber: b.refNumber,
          billDate: b.billDate,
          dueDate: b.dueDate,
          outstandingPaise: b.outstandingPaise,
          status: b.status,
        })),
      );
      const data = ageing.data as { buckets?: Record<string, number> } | null;
      setBuckets(data?.buckets ?? {});
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("errors.loadFailed"));
      setBills([]);
      setBuckets({});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, side, ageingSide]);

  const bucketCards = useMemo(
    () =>
      BUCKET_KEYS.map((key) => ({
        key,
        label: key === "notDue" ? t("bills.notDue") : key === "d0_15" ? "0–15" : key === "d16_30" ? "16–30" : key === "d31_60" ? "31–60" : key === "d61_90" ? "61–90" : "90+",
        amountPaise: Number(buckets[key] ?? 0),
      })),
    [buckets, t],
  );

  function openAllocate(bill: BillRow) {
    if (bill.outstandingPaise <= 0) return;
    setAllocBill(bill);
    setAllocAmount((bill.outstandingPaise / 100).toFixed(2));
    setErr(null);
  }

  async function confirmAllocate() {
    if (!companyId || !allocBill || !canAllocate) return;
    const bill = allocBill;
    let paise = 0;
    const n = Number(allocAmount.replace(/,/g, "").trim());
    if (!Number.isFinite(n) || n <= 0) {
      setErr(t("bills.invalidAmount"));
      return;
    }
    paise = Math.round(n * 100);
    if (paise > bill.outstandingPaise) {
      setErr(t("bills.exceedsOutstanding"));
      return;
    }
    setBusyId(bill.id);
    setErr(null);
    setOk(null);
    try {
      await companyApi.allocateOnAccount(companyId, {
        partyId: bill.partyId,
        billRefId: bill.id,
        amountPaise: paise,
        mutationId: `ui-alloc-${crypto.randomUUID()}`,
      });
      setOk(t("bills.applied", { amount: formatMoney(paise), ref: bill.refNumber || bill.id }));
      setAllocBill(null);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("bills.allocateFailed"));
    } finally {
      setBusyId(null);
    }
  }

  const totalOut = useMemo(() => bills.reduce((a, b) => a + b.outstandingPaise, 0), [bills]);
  const today = new Date().toISOString().slice(0, 10);
  const overdue = useMemo(
    () => bills.reduce((a, b) => (b.dueDate && b.dueDate < today ? a + b.outstandingPaise : a), 0),
    [bills, today],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title={title}
        subtitle={helper}
        actions={
          <Button
            size="sm"
            onClick={() =>
              companyNavigate(companyPath(side === "RECEIVABLE" ? "quick-received" : "quick-paid"))
            }
          >
            {side === "RECEIVABLE" ? t("parties.receive") : t("parties.pay")}
          </Button>
        }
      />
      {err ? <p className="text-sm text-destructive">{err}</p> : null}
      {ok ? <p className="text-sm text-emerald-600">{ok}</p> : null}
      {loading ? (
        <div className="space-y-3">
          <SkeletonKpiRow count={3} />
          <SkeletonTable rows={6} cols={5} />
        </div>
      ) : err ? null : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <KpiCard label={t("bills.totalOutstanding")} paise={totalOut} semantic="neutral" />
            <KpiCard label={t("bills.overdue")} paise={overdue} semantic={overdue > 0 ? "overdue" : "neutral"} />
            <Card className="relative overflow-hidden shadow-[var(--shadow-card)] before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-[hsl(var(--primary))]">
              <CardContent className="space-y-1.5 p-4 pl-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  {t("bills.openBills")}
                </div>
                <div className="text-xl font-semibold tabular-nums tracking-tight md:text-[1.35rem]">
                  {bills.length}
                </div>
                <div className="text-[11px] text-muted-foreground">{t("bills.outstanding")}</div>
              </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {bucketCards.map((b) => (
              <Card key={b.key} className="shadow-[var(--shadow-card)]">
                <CardContent className="p-3.5">
                  <div className="text-[11px] font-medium text-muted-foreground">{b.label}</div>
                  <CompanyMoney paise={b.amountPaise} className="mt-1 text-sm" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="shadow-[var(--shadow-card)]">
            <CardHeader className="border-b border-border/80 bg-[hsl(var(--surface))]/60 pb-3">
              <CardTitle className="text-sm">{t("bills.openBills")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {bills.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  {t("bills.noOpen", { side: side === "RECEIVABLE" ? t("bills.receivablesTitle") : t("bills.payablesTitle") })}
                </p>
              ) : (
                <ResponsiveList
                  mobile={
                    <ul className="space-y-2 p-3">
                      {bills.map((b) => (
                        <li
                          key={b.id}
                          className="rounded-xl border border-border bg-card p-3.5 shadow-[var(--shadow-card)]"
                          aria-label={`${t("bills.party")} ${b.partyName || b.partyId.slice(0, 8)}, ${t("bills.ref")} ${b.refNumber || t("bills.none")}, ${t("bills.due")} ${b.dueDate || b.billDate}, ${t("bills.outstanding")} ${formatMoney(b.outstandingPaise)}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate font-semibold" aria-label={`${t("bills.party")} ${b.partyName || b.partyId.slice(0, 8)}`}>
                                {b.partyName || b.partyId.slice(0, 8)}
                              </div>
                              <div className="mt-0.5 text-xs text-muted-foreground" aria-label={`${t("bills.ref")} ${b.refNumber || t("bills.none")}, ${t("bills.due")} ${b.dueDate || b.billDate}`}>
                                {b.refNumber || "—"} · {t("bills.due")} {b.dueDate || b.billDate}
                              </div>
                            </div>
                            <span aria-label={`${t("bills.outstanding")} ${formatMoney(b.outstandingPaise)}`}>
                              <CompanyMoney paise={b.outstandingPaise} className="text-sm" />
                            </span>
                          </div>
                          {canAllocate ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-3 w-full"
                            disabled={busyId === b.id || b.outstandingPaise <= 0}
                            onClick={() => openAllocate(b)}
                          >
                            {busyId === b.id ? "…" : t("bills.applyOnAccount")}
                          </Button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  }
                  desktop={
                    <ScrollTable>
                      <table className="w-full min-w-[36rem] text-sm">
                        <thead className="border-b border-border text-left text-xs text-muted-foreground">
                          <tr>
                            <th scope="col" className="px-4 py-2">{t("bills.party")}</th>
                            <th scope="col" className="px-4 py-2">{t("bills.ref")}</th>
                            <th scope="col" className="px-4 py-2">{t("bills.due")}</th>
                            <th scope="col" className="px-4 py-2 text-right">{t("bills.outstanding")}</th>
                            <th scope="col" className="px-4 py-2 text-right">{t("common.actions")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bills.map((b) => (
                            <tr key={b.id} className="border-b border-border last:border-0">
                              <td className="px-4 py-2">{b.partyName || b.partyId.slice(0, 8)}</td>
                              <td className="px-4 py-2">{b.refNumber || "—"}</td>
                              <td className="px-4 py-2">{b.dueDate || b.billDate}</td>
                              <td className="px-4 py-2 text-right tabular-nums">
                                {formatMoney(b.outstandingPaise)}
                              </td>
                              <td className="px-4 py-2 text-right">
                                {canAllocate ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={busyId === b.id || b.outstandingPaise <= 0}
                                  onClick={() => openAllocate(b)}
                                >
                                  {busyId === b.id ? "…" : t("bills.applyOnAccount")}
                                </Button>
                                ) : null}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ScrollTable>
                  }
                />
              )}
            </CardContent>
          </Card>
        </>
      )}
      {allocBill ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setAllocBill(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="apply-on-account-title"
            className="w-full max-w-sm rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-elevated)]"
          >
            <h3 id="apply-on-account-title" className="text-sm font-semibold">
              {t("bills.applyOnAccount")}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {allocBill.partyName || allocBill.refNumber} · {t("bills.outstanding")} {formatMoney(allocBill.outstandingPaise)}
            </p>
            <div className="mt-3">
              <Field label={t("bills.applyAmount")}>
                <Input
                  inputMode="decimal"
                  value={allocAmount}
                  onChange={(e) => setAllocAmount(e.target.value)}
                  autoFocus
                />
              </Field>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" disabled={busyId === allocBill.id} onClick={() => setAllocBill(null)}>
                {t("common.cancel")}
              </Button>
              <Button type="button" size="sm" disabled={busyId === allocBill.id} onClick={() => void confirmAllocate()}>
                {t("bills.applyOnAccount")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ReceivablesPage() {
  const { t } = useI18n();
  return (
    <OutstandingPage
      title={t("bills.receivablesTitle")}
      helper={t("bills.receivablesHelper")}
      side="RECEIVABLE"
      ageingSide="receivable"
    />
  );
}

export function PayablesPage() {
  const { t } = useI18n();
  return (
    <OutstandingPage
      title={t("bills.payablesTitle")}
      helper={t("bills.payablesHelper")}
      side="PAYABLE"
      ageingSide="payable"
    />
  );
}
