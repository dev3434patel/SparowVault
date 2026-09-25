import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";

import { companyApi } from "@/company/api/client";

import { CompanyMoney } from "@/company/components/CompanyMoney";

import { SkeletonList } from "@/company/components/CompanySkeleton";

import { EmptyState, PageHeader } from "@/company/components/PageChrome";

import { PermissionGate } from "@/company/components/PermissionGate";

import { PinConfirmDialog } from "@/company/components/PinConfirmDialog";

import { useCompanyStore } from "@/company/store/companyStore";

import { formatMoney } from "@/utils/money";

import { useI18n } from "@/company/i18n/react";



type ApprovalRow = Record<string, unknown>;



export function ApprovalsPage() {

  const { t } = useI18n();

  const companyId = useCompanyStore((s) => s.activeCompanyId);

  const [rows, setRows] = useState<ApprovalRow[]>([]);

  const [err, setErr] = useState<string | null>(null);

  const [msg, setMsg] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  const [pinOpen, setPinOpen] = useState(false);

  const [pending, setPending] = useState<{ id: string; decision: "APPROVE" | "REJECT" } | null>(null);

  const [busy, setBusy] = useState(false);



  function cashImpactLabel(paise: number): string {

    const abs = Math.abs(paise);

    const rupees = formatMoney(abs);

    if (paise < 0) return t("approvals.reducesBank", { amount: rupees });

    if (paise > 0) return t("approvals.increasesBank", { amount: rupees });

    return t("approvals.noCashImpact");

  }



  async function load() {

    if (!companyId) return;

    setErr(null);

    setLoading(true);

    try {

      setRows(await companyApi.listApprovals(companyId));

    } catch (e) {

      setErr(e instanceof Error ? e.message : t("approvals.loadFailed"));

    } finally {

      setLoading(false);

    }

  }



  useEffect(() => {

    void load();

  }, [companyId]);



  function openDecide(id: string, decision: "APPROVE" | "REJECT") {

    setPending({ id, decision });

    setPinOpen(true);

  }



  async function confirmDecide(pin: string, comment: string) {

    if (!companyId || !pending) return;

    setBusy(true);

    setMsg(null);

    setErr(null);

    try {

      void pin;

      if (pending.decision === "APPROVE") {

        await companyApi.approveVoucher(companyId, pending.id, comment || undefined);

      } else {

        await companyApi.rejectVoucher(companyId, pending.id, comment || "Rejected from UI");

      }

      setMsg(pending.decision === "APPROVE" ? t("approvals.approved") : t("approvals.rejected"));

      setPinOpen(false);

      setPending(null);

      await load();

    } catch (e) {

      setErr(e instanceof Error ? e.message : t("errors.decisionFailed"));

    } finally {

      setBusy(false);

    }

  }



  const confirmApproveTitle = t("approvals.confirmApprove");

  const confirmRejectTitle = t("approvals.confirmReject");



  return (

    <PermissionGate permission="approve_voucher">

      <div className="space-y-3">

        <PageHeader title={t("approvals.title")} subtitle={t("approvals.subtitle")} />

        {err ? <p className="text-sm text-destructive">{err}</p> : null}

        {msg ? <p className="text-sm text-emerald-600">{msg}</p> : null}

        {loading ? <SkeletonList rows={4} /> : null}

        {!loading && rows.length === 0 ? (

          <EmptyState title={t("approvals.empty")} body={t("approvals.subtitle")} />

        ) : null}

        {!loading && rows.length > 0 ? (

          <div className="space-y-3">

            {rows.map((r) => {

              const id = String(r.id);

              const amount = Number(r.amount_paise ?? r.amountPaise ?? 0);

              const cashImpact = Number(r.cash_impact_paise ?? r.cashImpactPaise ?? 0);

              const debit = Array.isArray(r.debit_ledgers)

                ? (r.debit_ledgers as string[]).join(", ")

                : String(r.debit_ledgers ?? "—");

              const credit = Array.isArray(r.credit_ledgers)

                ? (r.credit_ledgers as string[]).join(", ")

                : String(r.credit_ledgers ?? "—");

              const party = String(r.party_name ?? r.partyName ?? "—");

              const purpose = String(r.purpose ?? "—");

              const period = String(r.voucher_date ?? r.voucherDate ?? "—");

              const ageing = r.bill_ageing ?? r.billAgeing;



              return (

                <article

                  key={id}

                  className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]"

                >

                  <div className="flex flex-wrap items-start justify-between gap-3">

                    <div className="min-w-0 space-y-1.5">

                      <div className="flex flex-wrap items-center gap-2">

                        <span className="font-semibold">

                          {String(r.voucher_type ?? r.voucherType ?? "VOUCHER")} ·{" "}

                          {String(r.voucher_number ?? r.voucherNumber ?? id.slice(0, 8))}

                        </span>

                        <CompanyMoney paise={amount} className="text-base" />

                      </div>

                      <p className="text-sm text-muted-foreground">

                        {debit || "—"} → {credit || "—"}

                        {party !== "—" ? ` · ${party}` : ""}

                      </p>

                      <p className="text-xs text-muted-foreground">

                        {t("approvals.purpose")}: {purpose} · {t("approvals.period")}: {period}

                      </p>

                      <p className="text-xs font-medium text-foreground">{cashImpactLabel(cashImpact)}</p>

                      {ageing ? (

                        <p className="text-xs text-[hsl(var(--warning))]">

                          {t("approvals.billAgeing", { ageing: String(ageing) })}

                        </p>

                      ) : null}

                    </div>

                    {String(r.status) === "PENDING" ? (

                      <div className="flex gap-2">

                        <Button

                          size="sm"

                          disabled={pinOpen || busy}

                          onClick={() => openDecide(id, "APPROVE")}

                          aria-label={t("a11y.approveVoucher")}

                        >

                          {t("approvals.approve")}

                        </Button>

                        <Button

                          size="sm"

                          variant="secondary"

                          disabled={pinOpen || busy}

                          onClick={() => openDecide(id, "REJECT")}

                        >

                          {t("approvals.reject")}

                        </Button>

                      </div>

                    ) : null}

                  </div>

                </article>

              );

            })}

          </div>

        ) : null}



        <PinConfirmDialog

          open={pinOpen}

          title={pending?.decision === "REJECT" ? confirmRejectTitle : confirmApproveTitle}

          confirmLabel={pending?.decision === "REJECT" ? t("approvals.reject") : t("approvals.approve")}

          busy={busy}

          onCancel={() => {

            setPinOpen(false);

            setPending(null);

          }}

          onConfirm={(pin, comment) => void confirmDecide(pin, comment)}

        />

      </div>

    </PermissionGate>

  );

}

