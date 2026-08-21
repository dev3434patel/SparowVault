import { useEffect, useMemo, useRef } from "react";
import { useNavStore, type NavKey } from "@/store/navStore";
import { Button } from "@/components/ui/Button";
import { useCloudAppStore } from "@/store/cloudAppStore";
import { useAuthStore } from "@/store/authStore";
import { Shield, LayoutDashboard, Banknote, Receipt, Bell, Settings, Users, LogOut } from "lucide-react";
import { AdminDashboardPage } from "@/components/pages/admin/AdminDashboardPage";
import { PlanManagementPage } from "@/components/pages/admin/PlanManagementPage";
import { SubscriptionManagementPage } from "@/components/pages/admin/SubscriptionManagementPage";
import { FeatureFlagsPage } from "@/components/pages/admin/FeatureFlagsPage";
import { BrandingSettingsPage } from "@/components/pages/admin/BrandingSettingsPage";
import { UserManagementPage } from "@/components/pages/admin/UserManagementPage";

const ADMIN_PAGES: Record<NavKey, React.ComponentType> = {
  "admin-dashboard": AdminDashboardPage,
  "admin-plans": PlanManagementPage,
  "admin-subscriptions": SubscriptionManagementPage,
  "admin-flags": FeatureFlagsPage,
  "admin-branding": BrandingSettingsPage,
  "admin-users": UserManagementPage,
  dashboard: AdminDashboardPage,
  transactions: AdminDashboardPage,
  income: AdminDashboardPage,
  expenses: AdminDashboardPage,
  budgets: AdminDashboardPage,
  goals: AdminDashboardPage,
  accounts: AdminDashboardPage,
  cards: AdminDashboardPage,
  loans: AdminDashboardPage,
  udhari: AdminDashboardPage,
  savings: AdminDashboardPage,
  categories: AdminDashboardPage,
  reports: AdminDashboardPage,
  suggestions: AdminDashboardPage,
  export: AdminDashboardPage,
  import: AdminDashboardPage,
  "bill-calendar": AdminDashboardPage,
  reconciliation: AdminDashboardPage,
  household: AdminDashboardPage,
  alerts: AdminDashboardPage,
  settings: AdminDashboardPage,
  profile: AdminDashboardPage,
  audit: AdminDashboardPage,
  subscription: AdminDashboardPage,
};

const ADMIN_NAV: Array<{ key: NavKey; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: "admin-dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "admin-users", label: "Users", icon: Users },
  { key: "admin-plans", label: "Plans", icon: Banknote },
  { key: "admin-subscriptions", label: "Subscriptions", icon: Receipt },
  { key: "admin-flags", label: "Feature Flags", icon: Bell },
  { key: "admin-branding", label: "Branding", icon: Settings },
];

export function AdminAppShell() {
  const razorpayEnabled = import.meta.env.VITE_ENABLE_RAZORPAY === "true";
  const active = useNavStore((s) => s.active);
  const navActionId = useNavStore((s) => s.navActionId);
  const setActive = useNavStore((s) => s.setActive);
  const logout = useAuthStore((s) => s.logout);
  const currentUser = useAuthStore((s) => s.currentUser);
  const branding = useCloudAppStore((s) => s.settings);
  const effectiveActive: NavKey = !razorpayEnabled && active === "admin-subscriptions" ? "admin-dashboard" : active;
  const ActivePage = useMemo(() => ADMIN_PAGES[effectiveActive] ?? AdminDashboardPage, [effectiveActive]);
  const mainContentRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const scrollToTop = () => {
      const mainEl = mainContentRef.current;
      if (mainEl) {
        mainEl.scrollTo({ top: 0, behavior: "auto" });
      }
      window.scrollTo({ top: 0, behavior: "auto" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    scrollToTop();
    requestAnimationFrame(scrollToTop);
  }, [navActionId]);

  const adminNavItems = ADMIN_NAV.filter((item) => razorpayEnabled || item.key !== "admin-subscriptions");

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <aside className="hidden w-72 shrink-0 border-r border-border bg-card md:block">
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-center gap-2 text-base font-semibold">
            <Shield className="h-4 w-4 text-primary" />
            Admin Console
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{String(branding.app_title ?? "SparowVault")} platform control</div>
        </div>
        <nav className="space-y-1 p-3">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.key === effectiveActive;
            return (
              <button
                key={item.key}
                onClick={() => setActive(item.key)}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${
                  isActive ? "bg-primary text-primary-foreground" : "hover:bg-surface-2 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between gap-3 border-b border-border px-3 sm:px-5">
          <div>
            <div className="text-sm font-semibold">Admin Panel</div>
            <div className="text-xs text-muted-foreground">@{currentUser?.username ?? "admin"}</div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/" className="text-sm text-primary hover:underline">User portal</a>
            <Button variant="outline" size="sm" onClick={() => logout()}>
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </div>
        </header>
        <nav className="flex gap-2 overflow-x-auto border-b border-border bg-card px-3 py-2 md:hidden">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.key === effectiveActive;
            return (
              <button
                key={item.key}
                onClick={() => setActive(item.key)}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-xs ${
                  isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <main ref={mainContentRef} className="flex-1 overflow-x-hidden overflow-y-auto px-5 py-5">
          <ActivePage />
        </main>
      </div>
    </div>
  );
}
