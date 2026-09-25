import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { useCompanyStore } from "@/company/store/companyStore";
import { companyNavigate, companyPath } from "@/company/routes";
import { useAuthStore } from "@/store/authStore";
import { Building2, IndianRupee, Plus, LogOut } from "lucide-react";
import { StatusBadge } from "@/company/components/PageChrome";
import { useI18n } from "@/company/i18n/react";

export function SelectCompanyPage() {
  const { t } = useI18n();
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const memberships = useCompanyStore((s) => s.memberships);
  const hydrated = useCompanyStore((s) => s.hydrated);
  const setActiveCompany = useCompanyStore((s) => s.setActiveCompany);
  const hydrateFromApi = useCompanyStore((s) => s.hydrateFromApi);
  const clearCompany = useCompanyStore((s) => s.clear);

  useEffect(() => {
    if (!currentUser) {
      companyNavigate(companyPath("login"), true);
      return;
    }
    void hydrateFromApi();
  }, [currentUser, hydrateFromApi]);

  useEffect(() => {
    if (!hydrated) return;
    const active = memberships.filter((m) => m.status === "ACTIVE");
    if (active.length === 1) {
      setActiveCompany(active[0].companyId);
      companyNavigate(companyPath("dashboard"), true);
    }
  }, [hydrated, memberships, setActiveCompany]);

  const active = memberships.filter((m) => m.status === "ACTIVE");

  async function onLogout() {
    clearCompany();
    await logout();
    companyNavigate(companyPath("login"), true);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(800px 400px at 10% 0%, color-mix(in oklab, hsl(var(--primary)) 18%, transparent), transparent 55%), radial-gradient(600px 360px at 100% 100%, color-mix(in oklab, hsl(var(--goal)) 12%, transparent), transparent 55%)",
        }}
      />
      <div className="relative w-full max-w-lg space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--goal))] text-white shadow-lg">
              <IndianRupee className="h-5 w-5" strokeWidth={2.5} aria-hidden />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{t("select.title")}</h1>
              <p className="text-sm text-muted-foreground">{t("select.helper")}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => void onLogout()} aria-label={t("a11y.signOut")}>
            <LogOut className="h-4 w-4" aria-hidden />
            {t("common.signOut")}
          </Button>
        </div>

        {!hydrated ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : active.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-elevated)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(var(--info-soft))] text-[hsl(var(--info))]">
              <Building2 className="h-6 w-6" aria-hidden />
            </div>
            <h2 className="mt-4 text-base font-semibold">{t("select.emptyTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("select.emptyBody")}</p>
            <Button className="mt-4 gap-1.5" onClick={() => companyNavigate(companyPath("create"))}>
              <Plus className="h-4 w-4" aria-hidden />
              {t("select.create")}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {active.map((m) => (
              <button
                key={m.id}
                type="button"
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-[hsl(var(--border-strong))] hover:shadow-[var(--shadow-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]"
                onClick={() => {
                  setActiveCompany(m.companyId);
                  companyNavigate(companyPath("dashboard"));
                }}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--info-soft))] text-[hsl(var(--info))]">
                  <Building2 className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{m.companyDisplayName ?? m.companyId}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {m.roles.map((r) => r.name).join(", ") || t("common.member")}
                  </span>
                </span>
                <StatusBadge status={m.status as import("@/company/components/PageChrome").BadgeStatus} />
              </button>
            ))}
            <Button variant="outline" className="w-full gap-1.5" onClick={() => companyNavigate(companyPath("create"))}>
              <Plus className="h-4 w-4" aria-hidden />
              {t("select.createAnother")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
