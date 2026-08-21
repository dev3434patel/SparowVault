import { useEffect, useMemo, useRef } from "react";
import { Sidebar, MobileNav } from "./Sidebar";
import { Header } from "./Header";
import { useNavStore, type NavKey } from "@/store/navStore";
import { DashboardPage } from "@/components/pages/DashboardPage";
import { TransactionsPage } from "@/components/pages/TransactionsPage";
import { IncomePage } from "@/components/pages/IncomePage";
import { ExpensesPage } from "@/components/pages/ExpensesPage";
import { CategoriesPage } from "@/components/pages/CategoriesPage";
import { BudgetsPage } from "@/components/pages/BudgetsPage";
import { GoalsPage } from "@/components/pages/GoalsPage";
import { AccountsPage } from "@/components/pages/AccountsPage";
import { CardsPage } from "@/components/pages/CardsPage";
import { LoansPage } from "@/components/pages/LoansPage";
import { UdhariPage } from "@/components/pages/UdhariPage";
import { WealthHubPage } from "@/components/pages/WealthHubPage";
import { ReportsPage } from "@/components/pages/ReportsPage";
import { ExportPage } from "@/components/pages/ExportPage";
import { ImportPage } from "@/components/pages/ImportPage";
import { ReconciliationPage } from "@/components/pages/ReconciliationPage";
import { BillCalendarPage } from "@/components/pages/BillCalendarPage";
import { HouseholdDashboardPage } from "@/components/pages/HouseholdDashboardPage";
import { AlertsPage } from "@/components/pages/AlertsPage";
import { SettingsPage } from "@/components/pages/SettingsPage";
import { ProfilePage } from "@/components/pages/ProfilePage";
import { AuditPage } from "@/components/pages/AuditPage";
import { SuggestionsPage } from "@/components/pages/SuggestionsPage";
import { SubscriptionPage } from "@/components/pages/SubscriptionPage";
import { AdminDashboardPage } from "@/components/pages/admin/AdminDashboardPage";
import { PlanManagementPage } from "@/components/pages/admin/PlanManagementPage";
import { SubscriptionManagementPage } from "@/components/pages/admin/SubscriptionManagementPage";
import { FeatureFlagsPage } from "@/components/pages/admin/FeatureFlagsPage";
import { BrandingSettingsPage } from "@/components/pages/admin/BrandingSettingsPage";
import { UserManagementPage } from "@/components/pages/admin/UserManagementPage";
import { QuickAddDialog } from "@/components/forms/QuickAddDialog";
import { AlertsDrawer } from "@/components/layout/AlertsDrawer";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { useUIStore } from "@/store/uiStore";
import { useDataStore } from "@/store/dataStore";
import type { DataCollections } from "@/store/dataStore";
import { Loader2 } from "lucide-react";
import { runAlertEngine } from "@/services/alertsEngine";
import { useAuthStore } from "@/store/authStore";
import { motion, AnimatePresence } from "framer-motion";

const PAGES: Record<NavKey, React.ComponentType> = {
  dashboard: DashboardPage,
  transactions: TransactionsPage,
  income: IncomePage,
  expenses: ExpensesPage,
  categories: CategoriesPage,
  budgets: BudgetsPage,
  goals: GoalsPage,
  accounts: AccountsPage,
  cards: CardsPage,
  loans: LoansPage,
  udhari: UdhariPage,
  savings: WealthHubPage,
  reports: ReportsPage,
  suggestions: SuggestionsPage,
  export: ExportPage,
  import: ImportPage,
  "bill-calendar": BillCalendarPage,
  reconciliation: ReconciliationPage,
  household: HouseholdDashboardPage,
  alerts: AlertsPage,
  settings: SettingsPage,
  profile: ProfilePage,
  audit: AuditPage,
  subscription: SubscriptionPage,
  "admin-dashboard": AdminDashboardPage,
  "admin-plans": PlanManagementPage,
  "admin-subscriptions": SubscriptionManagementPage,
  "admin-flags": FeatureFlagsPage,
  "admin-branding": BrandingSettingsPage,
  "admin-users": UserManagementPage,
};

export function AppShell({ children }: { children?: React.ReactNode }) {
  const razorpayEnabled = import.meta.env.VITE_ENABLE_RAZORPAY === "true";
  const active = useNavStore((s) => s.active);
  const navActionId = useNavStore((s) => s.navActionId);
  const loaded = useDataStore((s) => s.loaded);
  const ensureCollections = useDataStore((s) => s.ensureCollections);
  const currentUser = useAuthStore((s) => s.currentUser);
  const setCommandOpen = useUIStore((s) => s.setCommandOpen);

  const effectiveActive: NavKey = !razorpayEnabled && active === "subscription" ? "dashboard" : active;
  const ActivePage = useMemo(() => PAGES[effectiveActive] ?? DashboardPage, [effectiveActive]);
  const mainContentRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setCommandOpen]);

  // Run alert engine whenever data loads / updates
  useEffect(() => {
    if (!currentUser || !loaded) return;
    runAlertEngine(currentUser).catch(console.error);
  }, [currentUser, loaded]);

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

  useEffect(() => {
    if (!currentUser || !loaded) return;
    const map: Record<NavKey, Array<keyof DataCollections | "settings">> = {
      dashboard: [
        "transactions",
        "budgets",
        "categories",
        "accounts",
        "cards",
        "loans",
        "emis",
        "udhari",
        "goals",
        "investments",
        "alerts",
        "aiSuggestions",
      ],
      transactions: ["transactions", "categories", "accounts"],
      income: ["transactions", "categories", "accounts"],
      expenses: ["transactions", "categories", "accounts"],
      categories: ["categories", "transactions"],
      budgets: ["budgets", "transactions", "categories"],
      goals: ["goals", "goalContribs"],
      accounts: ["accounts", "transactions"],
      cards: ["cards", "transactions"],
      loans: ["loans", "emis"],
      udhari: ["udhari", "udhariSettlements"],
      savings: ["investments", "savingsContribs"],
      reports: [
        "transactions",
        "categories",
        "cards",
        "loans",
        "emis",
        "budgets",
        "goals",
        "goalContribs",
        "udhari",
        "investments",
        "savingsContribs",
        "accounts",
        "recurringRules",
      ],
      suggestions: [
        "transactions",
        "budgets",
        "categories",
        "accounts",
        "cards",
        "loans",
        "emis",
        "udhari",
        "goals",
        "recurringRules",
        "aiSuggestions",
      ],
      export: ["transactions", "categories", "accounts", "cards", "budgets", "goals", "investments", "loans", "udhari", "alerts", "auditLogs"],
      import: ["transactions", "categories", "accounts"],
      "bill-calendar": ["recurringRules", "loans", "emis"],
      reconciliation: ["transactions", "accounts"],
      household: ["transactions"],
      alerts: ["alerts"],
      settings: ["settings"],
      profile: ["settings"],
      audit: ["auditLogs"],
      subscription: ["settings"],
      "admin-dashboard": ["settings"],
      "admin-plans": ["settings"],
      "admin-subscriptions": ["settings"],
      "admin-flags": ["settings"],
      "admin-branding": ["settings"],
      "admin-users": ["settings"],
    };
    const needed = map[effectiveActive] ?? [];
    ensureCollections(needed, currentUser).catch(console.error);
  }, [currentUser, loaded, effectiveActive, ensureCollections]);

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <div className="text-sm">Loading your finance workspace…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />
        <main ref={mainContentRef} className="flex-1 overflow-x-hidden overflow-y-auto pb-24 md:pb-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={effectiveActive}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="px-4 py-5 md:px-6 md:py-6"
            >
              {children ?? <ActivePage />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <QuickAddDialog />
      <AlertsDrawer />
      <CommandPalette />
      <MobileNav />
    </div>
  );
}
