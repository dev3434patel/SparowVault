import { useState } from "react";
import { useNavStore, type NavKey } from "@/store/navStore";
import { useMessages } from "@/i18n/useMessages";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Receipt,
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  Target,
  PiggyBank,
  Banknote,
  Users,
  BarChart3,
  Upload,
  Download,
  Bell,
  Settings,
  Shield,
  FileClock,
  IndianRupee,
  Sparkles,
  FolderTree,
  LandmarkIcon,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { Button } from "@/components/ui/Button";
import { useCloudAppStore } from "@/store/cloudAppStore";
import { useAuthStore } from "@/store/authStore";
import { navVisibilityFlags, personalMobileMoreKeys, personalNavHidden } from "@/services/modulePolicy";

interface NavItem {
  key: NavKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: string;
}

const NAV: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { key: "transactions", label: "Transactions", icon: Receipt, group: "Ledger" },
  { key: "income", label: "Income", icon: TrendingUp, group: "Ledger" },
  { key: "expenses", label: "Expenses", icon: TrendingDown, group: "Ledger" },
  { key: "categories", label: "Categories", icon: FolderTree, group: "Ledger" },
  { key: "budgets", label: "Budgets", icon: BarChart3, group: "Planning" },
  { key: "goals", label: "Goals", icon: Target, group: "Planning" },
  { key: "envelopes", label: "Envelopes", icon: PiggyBank, group: "Planning" },
  { key: "savings", label: "Savings & Investments", icon: PiggyBank, group: "Planning" },
  { key: "accounts", label: "Accounts", icon: Wallet, group: "Money" },
  { key: "cards", label: "Cards", icon: CreditCard, group: "Money" },
  { key: "loans", label: "Loans & EMI", icon: LandmarkIcon, group: "Money" },
  { key: "udhari", label: "Udhari & Advances", icon: Users, group: "Money" },
  { key: "bill-calendar", label: "Bill calendar", icon: FileClock, group: "Planning" },
  { key: "household", label: "Household", icon: Users, group: "Planning" },
  { key: "reports", label: "Reports", icon: BarChart3, group: "Insights" },
  { key: "reconciliation", label: "Reconciliation", icon: Shield, group: "Data" },
  { key: "suggestions", label: "Suggestions", icon: Sparkles, group: "Insights" },
  { key: "alerts", label: "Alerts Center", icon: Bell, group: "Insights" },
  { key: "export", label: "Export Center", icon: Download, group: "Data" },
  { key: "import", label: "Import Center", icon: Upload, group: "Data" },
  { key: "settings", label: "Settings", icon: Settings, group: "System" },
  { key: "profile", label: "Profile & Security", icon: Shield, group: "System" },
  { key: "audit", label: "Audit & Backup", icon: FileClock, group: "System" },
  { key: "subscription", label: "Subscription", icon: IndianRupee, group: "System" },
  { key: "admin-dashboard", label: "Admin Dashboard", icon: Shield, group: "Admin" },
  { key: "admin-plans", label: "Plans", icon: Banknote, group: "Admin" },
  { key: "admin-subscriptions", label: "Subscriptions", icon: Receipt, group: "Admin" },
  { key: "admin-flags", label: "Feature Flags", icon: Bell, group: "Admin" },
  { key: "admin-branding", label: "Branding", icon: Settings, group: "Admin" },
  { key: "admin-users", label: "Users", icon: Users, group: "Admin" },
];

export function Sidebar() {
  const messages = useMessages();
  const razorpayEnabled = import.meta.env.VITE_ENABLE_RAZORPAY === "true";
  const active = useNavStore((s) => s.active);
  const setActive = useNavStore((s) => s.setActive);
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const setCollapsed = useUIStore((s) => s.setSidebarCollapsed);
  const viewerRole = useCloudAppStore((s) => s.viewerRole);
  const flags = useCloudAppStore((s) => s.flags);
  const navFlags = navVisibilityFlags(flags, useCloudAppStore((s) => s.effectiveFeatures));
  const branding = useCloudAppStore((s) => s.settings);
  const currentUser = useAuthStore((s) => s.currentUser);
  const isAdminOverride = (currentUser?.username ?? "").toLowerCase() === "admin";
  const isAdminPortal = typeof window !== "undefined" && window.location.pathname.startsWith("/admin");

  const effectiveNav = NAV.filter((item) => {
    if (isAdminPortal && item.group !== "Admin") return false;
    if (!isAdminPortal && item.group === "Admin") return false;
    if (item.group === "Admin" && viewerRole !== "admin" && !isAdminOverride) return false;
    if (personalNavHidden(navFlags, item.key)) return false;
    if (!razorpayEnabled && (item.key === "admin-subscriptions" || item.key === "subscription")) return false;
    return true;
  });

  const groups = effectiveNav.reduce<Record<string, NavItem[]>>((acc, n) => {
    (acc[n.group] ||= []).push(n);
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
          <IndianRupee className="h-5 w-5" strokeWidth={2.5} />
        </div>
        {!collapsed ? (
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-none tracking-tight">
              {String(branding.app_title ?? "SparowVault")}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {messages.ui.layout.tagline}
            </div>
          </div>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group} className="mt-3">
            {!collapsed ? (
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {groupLabel(messages, group)}
              </div>
            ) : (
              <div className="mx-3 my-2 h-px bg-[hsl(var(--border))]" />
            )}
            <div className="space-y-0.5">
              {items.map((it) => {
                const Icon = it.icon;
                const isActive = active === it.key;
                return (
                  <button
                    key={it.key}
                    onClick={() => setActive(it.key)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                        : "text-muted-foreground hover:bg-surface-2 hover:text-[hsl(var(--foreground))]",
                      collapsed && "justify-center px-2",
                    )}
                    title={collapsed ? catalogLabel(messages, it.key, it.label) : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed ? <span className="truncate">{catalogLabel(messages, it.key, it.label)}</span> : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-2 space-y-1">
        {!isAdminPortal ? (
          <a
            href="/company"
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-surface-2 hover:text-foreground",
              collapsed && "justify-center px-2",
            )}
            title={messages.ui.layout.companyBooks}
          >
            <LandmarkIcon className="h-4 w-4 shrink-0" />
            {!collapsed ? <span className="truncate">{messages.ui.layout.companyBooks}</span> : null}
          </a>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full"
          title={collapsed ? messages.ui.layout.expand : messages.ui.layout.collapse}
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronsLeft className="h-4 w-4" /> {messages.ui.layout.collapse}
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}

function groupLabel(messages: ReturnType<typeof useMessages>, group: string): string {
  const nav = messages.nav;
  if (group === "Overview") return nav.overview;
  if (group === "Ledger") return nav.ledger;
  if (group === "Planning") return nav.planning;
  if (group === "Money") return nav.money;
  if (group === "Insights") return nav.insights;
  if (group === "Data") return nav.data;
  if (group === "System") return nav.system;
  return group;
}

function catalogLabel(messages: ReturnType<typeof useMessages>, key: string, fallback: string): string {
  const pageKey = key === "bill-calendar" ? "billCalendar" : key;
  const pages = messages.pages as Record<string, string>;
  return pages[pageKey] ?? fallback;
}

const MOBILE_PRIMARY: NavItem[] = [
  { key: "dashboard", label: "Home", icon: LayoutDashboard, group: "Overview" },
  { key: "transactions", label: "Ledger", icon: Receipt, group: "Ledger" },
  { key: "budgets", label: "Budget", icon: BarChart3, group: "Planning" },
  { key: "goals", label: "Goals", icon: Target, group: "Planning" },
  { key: "reports", label: "Reports", icon: Banknote, group: "Insights" },
];

export function MobileNav() {
  const messages = useMessages();
  const active = useNavStore((s) => s.active);
  const setActive = useNavStore((s) => s.setActive);
  const navFlags = navVisibilityFlags(
    useCloudAppStore((s) => s.flags),
    useCloudAppStore((s) => s.effectiveFeatures),
  );
  const razorpayEnabled = import.meta.env.VITE_ENABLE_RAZORPAY === "true";
  const [more, setMore] = useState(false);
  const items = MOBILE_PRIMARY.filter((item) => !personalNavHidden(navFlags, item.key));
  const moreKeySet = new Set(personalMobileMoreKeys(NAV.map((item) => item.key), navFlags, razorpayEnabled));
  const moreItems = NAV.filter((item) => moreKeySet.has(item.key));
  return (
    <>
      {more ? (
        <div className="md:hidden fixed inset-x-0 bottom-14 z-40 border-t border-border bg-card p-3 shadow-lg">
          <div className="grid grid-cols-2 gap-2">
            {moreItems.map((it) => (
              <button
                key={it.key}
                type="button"
                className="rounded-md border border-border px-3 py-2 text-left text-sm"
                onClick={() => {
                  setActive(it.key);
                  setMore(false);
                }}
              >
                {catalogLabel(messages, it.key, it.label)}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 flex items-stretch justify-around border-t border-border bg-[hsl(var(--card))]/95 backdrop-blur">
        {items.map((it) => {
          const Icon = it.icon;
          const isActive = active === it.key;
          return (
            <button
              key={it.key}
              onClick={() => {
                setMore(false);
                setActive(it.key);
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 flex-1 text-[10px]",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              {it.key === "dashboard" ? messages.ui.layout.home : catalogLabel(messages, it.key, it.label)}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setMore((v) => !v)}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 py-2 flex-1 text-[10px]",
            more ? "text-primary" : "text-muted-foreground",
          )}
        >
          {messages.ui.layout.more}
        </button>
      </nav>
    </>
  );
}
