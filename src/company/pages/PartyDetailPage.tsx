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

function roleLabel(code: string) {
  return code
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function PartyDetailPage({ partyId }: { partyId: string }) {
  const companyId = useCompanyStore((s) => s.activeCompanyId);
  const [party, setParty] = useState<CompanyParty | null>(null);
  const [statement, setStatement] = useState<Record<string, unknown> | null>(null);
  const [recv, setRecv] = useState(0);
  const [pay, setPay] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingRoles, setSavingRoles] = useState(false);

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
        const from = new Date();
        from.setMonth(from.getMonth() - 3);
        const fromStr = from.toISOString().slice(0, 10);
        const toStr = new Date().toISOString().slice(0, 10);
        const [rep, billsR, billsP] = await Promise.all([
          companyApi.report(companyId, "party-statement", fromStr, toStr, { partyId }).catch(() => null),
          companyApi.listBills(companyId, "RECEIVABLE").catch(() => []),
          companyApi.listBills(companyId, "PAYABLE").catch(() => []),
        ]);
        if (cancelled) return;
        setStatement(rep ? ((rep.data as Record<string, unknown>) ?? null) : null);
        setRecv(
          billsR
            .filter((b) => String(b.partyId) === partyId)
            .reduce((a, b) => a + Number(b.outstandingPaise ?? 0), 0),
        );
        setPay(
          billsP
            .filter((b) => String(b.partyId) === partyId)
            .reduce((a, b) => a + Number(b.outstandingPaise ?? 0), 0),
        );
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load party");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, partyId]);

  const name = party?.displayName ?? `Party ${partyId}`;
  const closing = Number(statement?.closingPaise ?? party?.openingBalancePaise ?? recv - pay);
  const plain =
    typeof statement?.plainLanguage === "string" && statement.plainLanguage
      ? { sentence: String(statement.plainLanguage), shortLabel: "Balance", side: "settled" as const, amountPaise: Math.abs(closing) }
      : plainLanguageBalance(name, closing);
  const rows = Array.isArray(statement?.rows) ? (statement!.rows as Array<Record<string, unknown>>) : [];

  async function toggleRole(code: PartyRoleCode) {
    if (!companyId || !party) return;
    const next = party.roles.includes(code)
      ? party.roles.filter((r) => r !== code)
      : [...party.roles, code];
    setSavingRoles(true);
    setErr(null);
    try {
      const updated = await companyApi.updateParty(companyId, partyId, { roles: next });
      setParty(updated as CompanyParty);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not update roles");
    } finally {
      setSavingRoles(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={loading ? "Party" : name}
        subtitle={plain.sentence}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => companyNavigate(companyPath("parties"))}>
              ← Parties
            </Button>
            <Button size="sm" onClick={() => companyNavigate(companyPath("quick-received"))}>
              Receive
            </Button>
            <Button size="sm" variant="secondary" onClick={() => companyNavigate(companyPath("quick-paid"))}>
              Pay
            </Button>
          </div>
        }
      />
      {err ? <p className="text-sm text-destructive">{err}</p> : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="They owe you"
          paise={recv}
          semantic={recv > 0 ? "credit" : "neutral"}
          onClick={() => companyNavigate(companyPath("receivables"))}
        />
        <KpiCard
          label="You owe them"
          paise={pay}
          semantic={pay > 0 ? "debit" : "neutral"}
          onClick={() => companyNavigate(companyPath("payables"))}
        />
        <KpiCard
          label={plain.shortLabel}
          paise={plain.amountPaise}
          semantic={plain.side === "they_pay" ? "credit" : plain.side === "you_pay" ? "debit" : "neutral"}
        />
        <Card className="relative overflow-hidden shadow-[var(--shadow-card)] before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-[hsl(var(--primary))]">
          <CardContent className="space-y-1.5 p-4 pl-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Mobile</div>
            <div className="text-base font-semibold tracking-tight">{party?.mobile || "—"}</div>
            <div className="text-[11px] text-muted-foreground">{party?.partyType ?? "PERSON"}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
          <TabsTrigger value="bills">Bills</TabsTrigger>
          <TabsTrigger value="vouchers">Vouchers</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-3">
          <Card className="shadow-[var(--shadow-card)]">
            <CardHeader className="border-b border-border/80 bg-[hsl(var(--surface))]/60 pb-3">
              <CardTitle className="text-sm">Roles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="flex flex-wrap gap-1.5">
                {party?.roles?.length ? (
                  party.roles.map((r) => <ToneBadge key={String(r)} label={roleLabel(String(r))} tone="info" />)
                ) : (
                  <span className="text-sm text-muted-foreground">No roles yet — tap below to set Lender, Customer, etc.</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ROLE_OPTIONS.map((code) => {
                  const on = party?.roles?.includes(code);
                  return (
                    <button
                      key={code}
                      type="button"
                      disabled={savingRoles || !party}
                      onClick={() => void toggleRole(code)}
                      className={cn(
                        "rounded-lg border px-2.5 py-1 text-xs font-medium transition disabled:opacity-50",
                        on
                          ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                          : "border-border text-muted-foreground hover:bg-surface-2",
                      )}
                    >
                      {roleLabel(code)}
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
              {rows.length === 0 ? (
                <p className="text-muted-foreground">Statement will appear after vouchers post.</p>
              ) : (
                rows.map((r, i) => (
                  <div key={i} className="flex justify-between gap-2 border-b border-border py-1.5 last:border-0">
                    <span>
                      {String(r.voucher_date ?? r.voucherDate ?? "")} · {String(r.voucher_number ?? r.voucherNumber ?? "")}
                    </span>
                    <CompanyMoney paise={Number(r.amount_paise ?? r.amountPaise ?? 0)} className="text-sm" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="bills">
          <Card className="shadow-[var(--shadow-card)]">
            <CardContent className="space-y-2 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Open receivable</span>
                <CompanyMoney paise={recv} semantic="credit" className="text-sm" />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Open payable</span>
                <CompanyMoney paise={pay} semantic="debit" className="text-sm" />
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => companyNavigate(companyPath("receivables"))}>
                  Receivables
                </Button>
                <Button size="sm" variant="outline" onClick={() => companyNavigate(companyPath("payables"))}>
                  Payables
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
                onClick={() => companyNavigate(`${companyPath("vouchers")}?partyId=${encodeURIComponent(partyId)}`)}
              >
                View vouchers
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
