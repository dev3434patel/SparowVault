import { Building2, ChevronDown, Search, Bell, LogOut } from "lucide-react";
import { companyAllows } from "@/company/auth/companyCan";
import { useCompanyStore } from "@/company/store/companyStore";
import { companyNavigate, companyPath } from "@/company/routes";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/authStore";
import { NewActionMenu } from "@/company/components/NewActionMenu";
import { fyLabelFromStartMonth } from "@/company/lib/fy";
import { useEffect, useState } from "react";
import { companyApi } from "@/company/api/client";
import { LanguageToggle } from "@/company/components/LanguageToggle";
import { useI18n } from "@/company/i18n/react";

export function CompanyHeader({ onMenu }: { onMenu?: () => void }) {
  const { t } = useI18n();
  const workspace = useCompanyStore((s) => s.workspace);
  const companyId = useCompanyStore((s) => s.activeCompanyId);
  const permissions = useCompanyStore((s) => s.permissions);
  const permissionsState = useCompanyStore((s) => s.permissionsState);
  const clearCompany = useCompanyStore((s) => s.clear);
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const [approvalCount, setApprovalCount] = useState(0);

  const fy = workspace ? fyLabelFromStartMonth(workspace.financialYearStartMonth) : "";

  useEffect(() => {
    if (!companyId || !companyAllows(permissionsState, permissions, "approve_voucher")) {
      setApprovalCount(0);
      return;
    }
    let cancelled = false;
    void companyApi
      .listApprovals(companyId)
      .then((rows) => {
        if (cancelled) return;
        const pending = rows.filter((r) => String(r.status ?? "").toUpperCase().includes("PEND")).length;
        setApprovalCount(pending || rows.length);
      })
      .catch(() => {
        if (!cancelled) setApprovalCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, permissions, permissionsState]);

  async function onLogout() {
    clearCompany();
    await logout();
    companyNavigate(companyPath("login"), true);
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card/80 px-3 backdrop-blur md:px-5">
      <div className="flex min-w-0 items-center gap-2">
        {onMenu ? (
          <Button variant="ghost" size="icon-sm" className="md:hidden" onClick={onMenu} aria-label={t("a11y.openNavigation")}>
            ☰
          </Button>
        ) : null}

        <button
          type="button"
          onClick={() => companyNavigate(companyPath("select"))}
          className="group flex min-w-0 max-w-[min(100%,22rem)] items-center gap-2 rounded-xl border border-border bg-background px-2.5 py-1.5 text-left shadow-[var(--shadow-card)] transition hover:border-[hsl(var(--border-strong))] hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]"
          title={t("common.switchCompany")}
          aria-label={t("a11y.switchCompany")}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--info-soft))] text-[hsl(var(--info))]">
            <Building2 className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold leading-tight">
              {workspace?.displayName ?? t("common.selectCompany")}
            </span>
            <span className="block truncate text-[11px] text-muted-foreground">
              {fy || t("select.companyBooks")}
              {currentUser ? ` · ${currentUser.displayName ?? currentUser.username}` : ""}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden />
        </button>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          className="hidden sm:inline-flex"
          aria-label={t("a11y.search")}
          onClick={() => companyNavigate(companyPath("search"))}
        >
          <Search className="h-4 w-4" aria-hidden />
        </Button>
        <NewActionMenu />
        <LanguageToggle />
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative hidden sm:inline-flex"
          aria-label={t("a11y.approvals")}
          onClick={() => companyNavigate(companyPath("approvals"))}
        >
          <Bell className="h-4 w-4" aria-hidden />
          {approvalCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[hsl(var(--expense))] px-1 text-[10px] font-bold text-white">
              {approvalCount > 9 ? "9+" : approvalCount}
            </span>
          ) : null}
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label={t("a11y.signOut")} onClick={() => void onLogout()}>
          <LogOut className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </header>
  );
}
