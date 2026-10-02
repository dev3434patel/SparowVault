import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { plainLanguageBalance } from "@/company/services/plainLanguageBalance";
import { Button } from "@/components/ui/Button";
import { companyNavigate, companyPath } from "@/company/routes";
import { companyApi } from "@/company/api/client";
import { useCompanyStore } from "@/company/store/companyStore";
import type { CompanyParty, PartyRoleCode } from "@/company/types";
import { CompanyMoney } from "@/company/components/CompanyMoney";
import { KpiCard } from "@/company/components/KpiCard";
import { PageHeader, ToneBadge } from "@/company/components/PageChrome";
import { cn } from "@/lib/utils";
import { useHasPermission } from "@/company/components/PermissionGate";
import { statementRowAmountPaise } from "@/company/finance/voucherListAmount";
import { useI18n } from "@/company/i18n/react";

const ROLE_OPTIONS: PartyRoleCode[] = [
  "CUSTOMER",
  "VENDOR",
  "LENDER",
  "BORROWER",
  "FARMER",
  "EMPLOYEE",
  "CONTRACTOR",
  "PARTNER",
  "LAND_OWNER",
  "PROPERTY_PARTY",
  "OTHER",
];

function roleLabel(code: string, t: (key: string) => string) {
  const key = `partyRole.${code}`;
  const label = t(key);
  return label === key ? code : label;
}

export function PartyDetailPage({ partyId }: { partyId: string }) {
  const { t } = useI18n();
  const companyId = useCompanyStore((s) => s.activeCompanyId);
  const [party, setParty] = useState<CompanyParty | null>(null);
  const [statement, setStatement] = useState<Record<string, unknown> | null>(null);
  const [recv, setRecv] = useState(0);
  const [pay, setPay] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingRoles, setSavingRoles] = useState(false);
  const [statementError, setStatementError] = useState<string | null>(null);
  const [billsError, setBillsError] = useState<string | null>(null);
  const canManage = useHasPermission("manage_parties");
  const [range] = useState(() => {
    const params = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
    const from = params.get("from");
    const to = params.get("to");
    if (from && to) return { from, to };
    const start = new Date();
    start.setMonth(start.getMonth() - 3);
    return { from: start.toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) };
  });

  useEffect(() => {
    if (!companyId || !partyId) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setErr(null);
      try {
        const p = await companyApi.getParty(companyId, partyId);
        if (cancelled) return;
        setParty(p);
        const [rep, billsR, billsP] = await Promise.allSettled([
          companyApi.report(companyId, "party-statement", range.from, range.to, { partyId }),
          companyApi.listBills(companyId, "RECEIVABLE"),
          companyApi.listBills(companyId, "PAYABLE"),
        ]);
        if (cancelled) return;
        if (rep.status === "fulfilled") {
          setStatement((rep.value.data as Record<string, unknown>) ?? null);
          setStatementError(null);
        } else {
          setStatement(null);
          setStatementError(rep.reason instanceof Error ? rep.reason.message : t("partyDetail.statementFailed"));
        }
        if (billsR.status === "fulfilled" && billsP.status === "fulfilled") {
          setBillsError(null);
          setRecv(
            billsR.value
              .filter((b) => String(b.partyId) === partyId)
              .reduce((a, b) => a + Number(b.outstandingPaise ?? 0), 0),
          );
          setPay(
            billsP.value
              .filter((b) => String(b.partyId) === partyId)
              .reduce((a, b) => a + Number(b.outstandingPaise ?? 0), 0),
          );
        } else {
          setRecv(0);
          setPay(0);
          const reason = billsR.status === "rejected" ? billsR.reason : billsP.status === "rejected" ? billsP.reason : null;
          setBillsError(reason instanceof Error ? reason.message : t("partyDetail.billsFailed"));
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : t("partyDetail.loadFailed"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, partyId, range.from, range.to, t]);

  const name = party?.displayName ?? t("partyDetail.fallbackName", { id: partyId });
  const closing = Number(statement?.closingPaise ?? party?.openingBalancePaise ?? recv - pay);
  const plain =
    typeof statement?.plainLanguage === "string" && statement.plainLanguage
      ? { sentence: String(statement.plainLanguage), shortLabel: t("parties.balance"), side: "settled" as const, amountPaise: Math.abs(closing) }
      : plainLanguageBalance(name, closing);
  const rows = Array.isArray(statement?.rows) ? (statement!.rows as Array<Record<string, unknown>>) : [];

  async function toggleRole(code: PartyRoleCode) {
    if (!companyId || !party || !canManage) return;
    const next = party.roles.includes(code)
      ? party.roles.filter((r) => r !== code)
      : [...party.roles, code];
    setSavingRoles(true);
    setErr(null);
    try {
      const updated = await companyApi.updateParty(companyId, partyId, { roles: next });
      setParty(updated as CompanyParty);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("partyDetail.rolesFailed"));
    } finally {
      setSavingRoles(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={loading ? t("partyDetail.title") : name}
        subtitle={plain.sentence}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => companyNavigate(companyPath("parties"))}>
              {t("partyDetail.back")}
            </Button>
            <Button size="sm" onClick={() => companyNavigate(companyPath("quick-received"))}>
              {t("parties.receive")}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => companyNavigate(companyPath("quick-paid"))}>
              {t("parties.pay")}
            </Button>
          </div>
        }
      />
      {err ? <p className="text-sm text-destructive">{err}</p> : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label={t("partyDetail.theyOwe")}
          paise={recv}
          error={billsError}
          semantic={recv > 0 ? "credit" : "neutral"}
          onClick={() => companyNavigate(companyPath("receivables"))}
        />
        <KpiCard
          label={t("partyDetail.youOwe")}
          paise={pay}
          error={billsError}
          semantic={pay > 0 ? "debit" : "neutral"}
          onClick={() => companyNavigate(companyPath("payables"))}
        />
        <KpiCard
          label={plain.shortLabel}
          paise={plain.amountPaise}
          error={statementError}
          semantic={plain.side === "they_pay" ? "credit" : plain.side === "you_pay" ? "debit" : "neutral"}
        />
        <Card className="relative overflow-hidden shadow-[var(--shadow-card)] before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-[hsl(var(--primary))]">
          <CardContent className="space-y-1.5 p-4 pl-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{t("common.mobile")}</div>
            <div className="text-base font-semibold tracking-tight">{party?.mobile || "—"}</div>
            <div className="text-[11px] text-muted-foreground">{t(`partyType.${party?.partyType ?? "PERSON"}`)}</div>
            {(party?.tags ?? []).length > 0 ? (
              <div className="text-[11px] text-muted-foreground">{(party?.tags ?? []).join(", ")}</div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t("partyDetail.overview")}</TabsTrigger>
          <TabsTrigger value="ledger">{t("partyDetail.ledger")}</TabsTrigger>
          <TabsTrigger value="bills">{t("partyDetail.bills")}</TabsTrigger>
          <TabsTrigger value="vouchers">{t("nav.vouchers")}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-3">
          <Card className="shadow-[var(--shadow-card)]">
            <CardHeader className="border-b border-border/80 bg-[hsl(var(--surface))]/60 pb-3">
              <CardTitle className="text-sm">{t("parties.roles")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="flex flex-wrap gap-1.5">
                {party?.roles?.length ? (
                  party.roles.map((r) => <ToneBadge key={String(r)} label={roleLabel(String(r), t)} tone="info" />)
                ) : (
                  <span className="text-sm text-muted-foreground">{t("partyDetail.noRoles")}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ROLE_OPTIONS.map((code) => {
                  const on = party?.roles?.includes(code);
                  return (
                    <button
                      key={code}
                      type="button"
                      disabled={savingRoles || !party || !canManage}
                      onClick={() => void toggleRole(code)}
                      className={cn(
                        "rounded-lg border px-2.5 py-1 text-xs font-medium transition disabled:opacity-50",
                        on
                          ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                          : "border-border text-muted-foreground hover:bg-surface-2",
                      )}
                    >
                      {roleLabel(code, t)}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="ledger">
          <Card className="shadow-[var(--shadow-card)]">
            <CardContent className="space-y-2 p-4 text-sm">
              {statementError ? (
                <p className="text-destructive">{statementError}</p>
              ) : rows.length === 0 ? (
                <p className="text-muted-foreground">{t("partyDetail.statementEmpty")}</p>
              ) : (
                rows.map((r, i) => (
                  <div key={i} className="flex justify-between gap-2 border-b border-border py-1.5 last:border-0">
                    <span>
                      {String(r.date ?? r.voucher_date ?? r.voucherDate ?? "")} · {String(r.voucherNumber ?? r.voucher_number ?? "")}
                    </span>
                    <CompanyMoney
                      paise={statementRowAmountPaise({
                        debitPaise: Number(r.debitPaise ?? r.debit_paise ?? 0),
                        creditPaise: Number(r.creditPaise ?? r.credit_paise ?? 0),
                        amountPaise: Number(r.amountPaise ?? r.amount_paise ?? 0),
                      })}
                      className="text-sm"
                    />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="bills">
          <Card className="shadow-[var(--shadow-card)]">
            <CardContent className="space-y-2 p-4 text-sm">
              {billsError ? <p className="text-destructive">{billsError}</p> : null}
              {!billsError ? (
                <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("partyDetail.openReceivable")}</span>
                <CompanyMoney paise={recv} semantic="credit" className="text-sm" />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("partyDetail.openPayable")}</span>
                <CompanyMoney paise={pay} semantic="debit" className="text-sm" />
              </div>
                </>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => companyNavigate(companyPath("receivables"))}>
                  {t("nav.receivables")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => companyNavigate(companyPath("payables"))}>
                  {t("nav.payables")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="vouchers">
          <Card className="shadow-[var(--shadow-card)]">
            <CardContent className="p-4 text-sm">
              <Button
                size="sm"
                variant="outline"
                onClick={() => companyNavigate(`${companyPath("vouchers")}?partyId=${encodeURIComponent(partyId)}&from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`)}
              >
                {t("partyDetail.viewVouchers")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
