import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Label";
import { companyNavigate, companyPath } from "@/company/routes";
import { companyApi } from "@/company/api/client";
import { useCompanyStore } from "@/company/store/companyStore";
import type { CompanyParty, PartyRoleCode } from "@/company/types";
import { SkeletonList } from "@/company/components/CompanySkeleton";
import { EmptyState, PageHeader, ToneBadge } from "@/company/components/PageChrome";
import { CompanyMoney } from "@/company/components/CompanyMoney";
import { plainLanguageBalance } from "@/company/services/plainLanguageBalance";
import { Search, Users } from "lucide-react";
import { cn } from "@/lib/utils";
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

function roleLabel(code: string) {
  return code
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function partyNet(p: CompanyParty) {
  if (typeof p.netBalancePaise === "number") return p.netBalancePaise;
  return (p.receivableOutstandingPaise ?? 0) - (p.payableOutstandingPaise ?? 0);
}

export function PartiesPage({ startCreating = false }: { startCreating?: boolean }) {
  const { t } = useI18n();
  const companyId = useCompanyStore((s) => s.activeCompanyId);
  const [q, setQ] = useState("");
  const [parties, setParties] = useState<CompanyParty[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(startCreating);
  const [newName, setNewName] = useState("");
  const [newMobile, setNewMobile] = useState("");
  const [newRoles, setNewRoles] = useState<PartyRoleCode[]>(["CUSTOMER"]);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!companyId) return;
    setLoading(true);
    setErr(null);
    try {
      setParties(await companyApi.listParties(companyId));
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("parties.loadFailed"));
      setParties([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [companyId]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return parties;
    return parties.filter(
      (p) =>
        p.displayName.toLowerCase().includes(needle) ||
        (p.mobile ?? "").includes(needle) ||
        p.roles.some((r) => String(r).toLowerCase().includes(needle)) ||
        roleLabel(String(p.roles[0] ?? "")).toLowerCase().includes(needle),
    );
  }, [parties, q]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId || !newName.trim()) return;
    setSaving(true);
    setErr(null);
    try {
      const party = await companyApi.createParty(companyId, {
        displayName: newName.trim(),
        partyType: "PERSON",
        mobile: newMobile.trim() || undefined,
        roles: newRoles,
      });
      const id = (party as CompanyParty).id;
      setNewName("");
      setNewMobile("");
      setNewRoles(["CUSTOMER"]);
      setCreating(false);
      if (id) companyNavigate(companyPath("party-detail", { id }));
      else await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : t("parties.createFailed"));
    } finally {
      setSaving(false);
    }
  }

  function toggleRole(code: PartyRoleCode) {
    setNewRoles((prev) => (prev.includes(code) ? prev.filter((r) => r !== code) : [...prev, code]));
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("parties.title")}
        subtitle={t("parties.subtitle")}
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => setCreating((v) => !v)}>
            {creating ? t("parties.cancelAdd") : t("parties.add")}
          </Button>
        }
      />

      {creating ? (
        <Card className="shadow-[var(--shadow-card)]">
          <CardContent className="space-y-3 p-4">
            <form className="space-y-3" onSubmit={(e) => void onCreate(e)}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <Field label={t("parties.displayName")} className="flex-1">
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} required autoFocus className="h-10" />
                </Field>
                <Field label={t("parties.mobile")} className="sm:w-44">
                  <Input value={newMobile} onChange={(e) => setNewMobile(e.target.value)} className="h-10" inputMode="tel" />
                </Field>
              </div>
              <div>
                <div className="mb-1.5 text-xs font-medium text-muted-foreground">{t("parties.roles")}</div>
                <div className="flex flex-wrap gap-1.5">
                  {ROLE_OPTIONS.map((code) => {
                    const on = newRoles.includes(code);
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => toggleRole(code)}
                        className={cn(
                          "rounded-lg border px-2.5 py-1 text-xs font-medium transition",
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
              </div>
              <Button type="submit" size="sm" disabled={saving || newRoles.length === 0}>
                {saving ? t("parties.saving") : t("parties.create")}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("parties.searchPlaceholder")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-11 pl-9"
        />
      </div>

      {err ? <p className="text-sm text-destructive">{err}</p> : null}
      {loading ? <SkeletonList rows={5} /> : null}

      {!loading && rows.length === 0 ? (
        <EmptyState
          title={t("parties.emptyTitle")}
          body={t("parties.emptyBody")}
          actions={<Button onClick={() => setCreating(true)}>{t("parties.addFirst")}</Button>}
        />
      ) : null}

      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {rows.map((p) => {
          const net = partyNet(p);
          const plain = plainLanguageBalance(p.displayName, net);
          const recv = p.receivableOutstandingPaise ?? 0;
          const pay = p.payableOutstandingPaise ?? 0;
          return (
            <button
              key={p.id}
              type="button"
              className="w-full rounded-xl border border-border bg-card p-3.5 text-left shadow-[var(--shadow-card)] transition hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
              aria-label={`Name ${p.displayName}, Roles ${p.roles.map((r) => roleLabel(String(r))).join(", ") || "none"}, Mobile ${p.mobile || "none"}, Net ${plain.shortLabel}`}
              onClick={() => companyNavigate(companyPath("party-detail", { id: p.id }))}
            >
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--info-soft))] text-[hsl(var(--info))]">
                  <Users className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="truncate font-semibold">{p.displayName}</span>
                    <CompanyMoney
                      paise={plain.amountPaise}
                      semantic={plain.side === "they_pay" ? "credit" : plain.side === "you_pay" ? "debit" : "neutral"}
                      className="text-sm"
                    />
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{plain.shortLabel}</span>
                  <span className="mt-1.5 flex flex-wrap gap-1">
                    {p.roles.length ? (
                      p.roles.slice(0, 3).map((r) => (
                        <ToneBadge key={String(r)} label={roleLabel(String(r))} tone="info" />
                      ))
                    ) : (
                      <span className="text-[11px] text-muted-foreground">{t("parties.noRole")}</span>
                    )}
                  </span>
                  <span className="mt-1.5 block text-[11px] text-muted-foreground">
                    {p.mobile || t("parties.noMobile")}
                    {recv > 0 ? (
                      <>
                        {" · "}
                        {t("parties.theyOwe")}{" "}
                        <CompanyMoney paise={recv} semantic="credit" className="text-[11px] font-medium" />
                      </>
                    ) : null}
                    {pay > 0 ? (
                      <>
                        {" · "}
                        {t("parties.youOwe")}{" "}
                        <CompanyMoney paise={pay} semantic="debit" className="text-[11px] font-medium" />
                      </>
                    ) : null}
                  </span>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)] md:block">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-[hsl(var(--surface))]/60 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3">{t("common.name")}</th>
              <th scope="col" className="px-4 py-3">{t("parties.roles")}</th>
              <th scope="col" className="px-4 py-3">{t("common.mobile")}</th>
              <th scope="col" className="px-4 py-3 text-right">{t("parties.theyOwe")}</th>
              <th scope="col" className="px-4 py-3 text-right">{t("parties.youOwe")}</th>
              <th scope="col" className="px-4 py-3 text-right">{t("parties.net")}</th>
              <th scope="col" className="px-4 py-3 text-right">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const net = partyNet(p);
              const plain = plainLanguageBalance(p.displayName, net);
              const recv = p.receivableOutstandingPaise ?? 0;
              const pay = p.payableOutstandingPaise ?? 0;
              return (
                <tr
                  key={p.id}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-2"
                  onClick={() => companyNavigate(companyPath("party-detail", { id: p.id }))}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{p.displayName}</div>
                    <div className="text-[11px] text-muted-foreground">{plain.shortLabel}</div>
                  </td>
                  <td className="px-4 py-3">
                    {p.roles.length ? (
                      <div className="flex flex-wrap gap-1">
                        {p.roles.slice(0, 3).map((r) => (
                          <ToneBadge key={String(r)} label={roleLabel(String(r))} tone="info" />
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{p.mobile || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {recv > 0 ? <CompanyMoney paise={recv} semantic="credit" className="text-sm" /> : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {pay > 0 ? <CompanyMoney paise={pay} semantic="debit" className="text-sm" /> : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <CompanyMoney
                      paise={plain.amountPaise}
                      semantic={plain.side === "they_pay" ? "credit" : plain.side === "you_pay" ? "debit" : "neutral"}
                      className="text-sm"
                    />
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => companyNavigate(companyPath("party-detail", { id: p.id }))}
                      >
                        {t("common.view")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => companyNavigate(companyPath("quick-received"))}
                      >
                        {t("parties.receive")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => companyNavigate(companyPath("quick-paid"))}
                      >
                        {t("parties.pay")}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
