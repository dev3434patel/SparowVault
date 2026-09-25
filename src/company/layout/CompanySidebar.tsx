import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  COMPANY_SIDEBAR_NAV,
  companyNavigate,
  type CompanyNavKey,
} from "@/company/routes";
import {
  IndianRupee,
  LayoutDashboard,
  BookOpen,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  FileSpreadsheet,
  Landmark,
  Users,
  CircleDollarSign,
  HandCoins,
  Receipt,
  Network,
  FolderKanban,
  MapPin,
  Tags,
  Layers,
  PieChart,
  Search,
  ShieldCheck,
  UserCog,
  ScrollText,
  Download,
  Settings,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { LucideIcon } from "lucide-react";
import { useI18n } from "@/company/i18n/react";

const ICONS: Partial<Record<CompanyNavKey, LucideIcon>> = {
  dashboard: LayoutDashboard,
  "day-book": BookOpen,
  "quick-received": ArrowDownLeft,
  "quick-paid": ArrowUpRight,
  "quick-transfer": ArrowLeftRight,
  "quick-journal": FileSpreadsheet,
  "cash-bank": Landmark,
  parties: Users,
  receivables: CircleDollarSign,
  payables: HandCoins,
  vouchers: Receipt,
  ledgers: Network,
  "masters-business-units": Layers,
  "masters-projects": FolderKanban,
  "masters-areas": MapPin,
  "masters-cost-centres": Tags,
  "masters-categories": Tags,
  reports: PieChart,
  search: Search,
  approvals: ShieldCheck,
  users: UserCog,
  audit: ScrollText,
  export: Download,
  settings: Settings,
};

export function CompanySidebar({ activeKey }: { activeKey: CompanyNavKey }) {
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(false);
  const groups = COMPANY_SIDEBAR_NAV.reduce<Record<string, typeof COMPANY_SIDEBAR_NAV>>((acc, item) => {
    (acc[item.groupKey] ||= []).push(item);
    return acc;
  }, {});

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-border bg-[hsl(var(--surface))] transition-[width] duration-200 ease-out",
        collapsed ? "w-[68px]" : "w-[248px]",
      )}
    >
      <div className="flex items-center gap-2.5 px-4 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--goal))] text-white shadow-lg">
          <IndianRupee className="h-5 w-5" strokeWidth={2.5} aria-hidden />
        </div>
        {!collapsed ? (
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-none tracking-tight">SparowVault</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">{t("common.companyBooks")}</div>
          </div>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-3">
        {Object.entries(groups).map(([groupKey, items]) => (
          <div key={groupKey} className="mt-3 first:mt-1">
            {!collapsed ? (
              <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
                {t(groupKey)}
              </div>
            ) : (
              <div className="mx-3 my-2 h-px bg-[hsl(var(--border))]" />
            )}
            <div className="space-y-0.5">
              {items.map((it) => {
                const Icon = ICONS[it.key] ?? Receipt;
                const isActive = activeKey === it.key;
                const label = t(it.labelKey);
                return (
                  <button
                    key={it.key}
                    type="button"
                    onClick={() => companyNavigate(it.path)}
                    aria-label={label}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]",
                      isActive
                        ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm"
                        : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                      collapsed && "justify-center px-2",
                    )}
                    title={collapsed ? label : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                    {!collapsed ? <span className="truncate">{label}</span> : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-2">
        <a
          href="/"
          className={cn(
            "mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-surface-2 hover:text-foreground",
            collapsed && "justify-center px-2",
          )}
          title={t("common.personalFinance")}
        >
          <WalletGlyph className="h-4 w-4" />
          {!collapsed ? <span className="truncate">{t("common.personalFinance")}</span> : null}
        </a>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed((v) => !v)}
          className="w-full justify-start gap-2"
          title={collapsed ? t("common.expandNav") : t("common.collapseNav")}
          aria-label={collapsed ? t("common.expandNav") : t("common.collapseNav")}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          {!collapsed ? t("common.collapseNav").replace(/ navigation$/i, "") : null}
        </Button>
      </div>
    </aside>
  );
}

function WalletGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M3 8.5A2.5 2.5 0 0 1 5.5 6h13A2.5 2.5 0 0 1 21 8.5v7a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 15.5v-7Z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path d="M16 12.5h2.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
