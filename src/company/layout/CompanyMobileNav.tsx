import { cn } from "@/lib/utils";
import { companyNavigate, companyPath, type CompanyNavKey } from "@/company/routes";
import {
  LayoutDashboard,
  Users,
  Plus,
  FileText,
  MoreHorizontal,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  BookOpen,
  PieChart,
  ShieldCheck,
  Settings,
  Download,
  Search,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/company/i18n/react";

export function CompanyMobileNav({ activeKey }: { activeKey: CompanyNavKey }) {
  const { t } = useI18n();
  const [sheet, setSheet] = useState<"add" | "more" | null>(null);

  useEffect(() => {
    if (!sheet) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSheet(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sheet]);

  const items: Array<{
    key: CompanyNavKey | "more" | "add";
    labelKey: string;
    path?: string;
    icon: typeof LayoutDashboard;
  }> = [
    { key: "dashboard", labelKey: "common.home", path: companyPath("dashboard"), icon: LayoutDashboard },
    { key: "parties", labelKey: "nav.mobile.parties", path: companyPath("parties"), icon: Users },
    { key: "add", labelKey: "common.add", icon: Plus },
    { key: "receivables", labelKey: "nav.bills", path: companyPath("receivables"), icon: FileText },
    { key: "more", labelKey: "common.more", icon: MoreHorizontal },
  ];

  const addRows = [
    { labelKey: "nav.moneyReceived", path: companyPath("quick-received"), icon: ArrowDownLeft },
    { labelKey: "nav.moneyPaid", path: companyPath("quick-paid"), icon: ArrowUpRight },
    { labelKey: "nav.transfer", path: companyPath("quick-transfer"), icon: ArrowLeftRight },
    { labelKey: "dashboard.newParty", path: companyPath("parties"), icon: Users },
  ];
  const moreRows = [
    { labelKey: "nav.dayBook", path: companyPath("day-book"), icon: BookOpen },
    { labelKey: "nav.reports", path: companyPath("reports"), icon: PieChart },
    { labelKey: "nav.approvals", path: companyPath("approvals"), icon: ShieldCheck },
    { labelKey: "nav.search", path: companyPath("search"), icon: Search },
    { labelKey: "nav.export", path: companyPath("export"), icon: Download },
    { labelKey: "nav.settings", path: companyPath("settings"), icon: Settings },
  ];

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {items.map((it) => {
          const Icon = it.icon;
          const isActive =
            it.key === activeKey ||
            (it.key === "more" && sheet === "more") ||
            (it.key === "add" && sheet === "add");
          const isAdd = it.key === "add";
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => {
                if (it.key === "add") setSheet((s) => (s === "add" ? null : "add"));
                else if (it.key === "more") setSheet((s) => (s === "more" ? null : "more"));
                else if (it.path) {
                  setSheet(null);
                  companyNavigate(it.path);
                }
              }}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              {isAdd ? (
                <span className="flex h-9 w-9 -mt-3 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-md">
                  <Icon className="h-5 w-5" />
                </span>
              ) : (
                <Icon className="h-5 w-5" />
              )}
              {t(it.labelKey)}
            </button>
          );
        })}
      </nav>
      {sheet ? (
        <div className="fixed inset-0 z-40 bg-black/35 md:hidden" onClick={() => setSheet(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={sheet === "add" ? t("dashboard.quickActions") : t("common.more")}
            className="absolute inset-x-0 bottom-14 rounded-t-2xl border border-border bg-card p-4 shadow-[var(--shadow-elevated)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {sheet === "add" ? t("dashboard.quickActions") : t("common.more")}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(sheet === "add" ? addRows : moreRows).map((row) => {
                const Icon = row.icon;
                const label = t(row.labelKey);
                return (
                  <button
                    key={row.labelKey}
                    type="button"
                    className="flex items-center gap-2.5 rounded-xl border border-border px-3 py-3 text-left text-sm font-medium transition hover:bg-surface-2"
                    onClick={() => {
                      setSheet(null);
                      companyNavigate(row.path);
                    }}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--info-soft))] text-[hsl(var(--info))]">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
