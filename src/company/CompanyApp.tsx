import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { CompanyProviders } from "@/company/CompanyProviders";
import { CompanyAppShell } from "@/company/layout/CompanyAppShell";
import { pathToCompanyRoute, companyNavigate, companyPath } from "@/company/routes";
import { useCompanyStore } from "@/company/store/companyStore";
import { useAuthStore } from "@/store/authStore";
import { LoginPage } from "@/company/pages/LoginPage";
import { SelectCompanyPage } from "@/company/pages/SelectCompanyPage";
import { useI18n } from "@/company/i18n/react";

/** Route-level code split — keep login/select eager for first paint. */
const CreateCompanyPage = lazy(() =>
  import("@/company/pages/CreateCompanyPage").then((m) => ({ default: m.CreateCompanyPage })),
);
const DashboardPage = lazy(() =>
  import("@/company/pages/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const PartiesPage = lazy(() =>
  import("@/company/pages/PartiesPage").then((m) => ({ default: m.PartiesPage })),
);
const PartyDetailPage = lazy(() =>
  import("@/company/pages/PartyDetailPage").then((m) => ({ default: m.PartyDetailPage })),
);
const LedgersPage = lazy(() =>
  import("@/company/pages/LedgersPage").then((m) => ({ default: m.LedgersPage })),
);
const VouchersPage = lazy(() =>
  import("@/company/pages/VouchersPage").then((m) => ({ default: m.VouchersPage })),
);
const VoucherDetailPage = lazy(() =>
  import("@/company/pages/VouchersPage").then((m) => ({ default: m.VoucherDetailPage })),
);
const VoucherCreatePage = lazy(() =>
  import("@/company/pages/VoucherCreatePage").then((m) => ({ default: m.VoucherCreatePage })),
);
const QuickReceivedPage = lazy(() =>
  import("@/company/pages/QuickReceivedPage").then((m) => ({ default: m.QuickReceivedPage })),
);
const QuickPaidPage = lazy(() =>
  import("@/company/pages/QuickPaidPage").then((m) => ({ default: m.QuickPaidPage })),
);
const QuickTransferPage = lazy(() =>
  import("@/company/pages/QuickTransferPage").then((m) => ({ default: m.QuickTransferPage })),
);
const QuickJournalPage = lazy(() =>
  import("@/company/pages/QuickJournalPage").then((m) => ({ default: m.QuickJournalPage })),
);
const ReceivablesPage = lazy(() =>
  import("@/company/pages/ReceivablesPage").then((m) => ({ default: m.ReceivablesPage })),
);
const PayablesPage = lazy(() =>
  import("@/company/pages/PayablesPage").then((m) => ({ default: m.PayablesPage })),
);
const ReportsHubPage = lazy(() =>
  import("@/company/pages/ReportsHubPage").then((m) => ({ default: m.ReportsHubPage })),
);
const ReportViewPage = lazy(() =>
  import("@/company/pages/ReportViewPage").then((m) => ({ default: m.ReportViewPage })),
);
const MastersPage = lazy(() =>
  import("@/company/pages/MastersPage").then((m) => ({ default: m.MastersPage })),
);
const UsersPage = lazy(() =>
  import("@/company/pages/UsersPage").then((m) => ({ default: m.UsersPage })),
);
const ApprovalsPage = lazy(() =>
  import("@/company/pages/ApprovalsPage").then((m) => ({ default: m.ApprovalsPage })),
);
const SettingsPage = lazy(() =>
  import("@/company/pages/SettingsPage").then((m) => ({ default: m.SettingsPage })),
);
const AuditPage = lazy(() =>
  import("@/company/pages/AuditPage").then((m) => ({ default: m.AuditPage })),
);
const ExportPage = lazy(() =>
  import("@/company/pages/ExportPage").then((m) => ({ default: m.ExportPage })),
);
const SearchPage = lazy(() =>
  import("@/company/pages/SearchPage").then((m) => ({ default: m.SearchPage })),
);
const InviteAcceptPage = lazy(() =>
  import("@/company/pages/InviteAcceptPage").then((m) => ({ default: m.InviteAcceptPage })),
);

function RouteFallback() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
      {t("common.loading")}
    </div>
  );
}

function LazyPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}

function CompanyRouter() {
  const { t } = useI18n();
  const [path, setPath] = useState(
    typeof window !== "undefined" ? window.location.pathname : "/company",
  );
  const currentUser = useAuthStore((s) => s.currentUser);
  const activeCompanyId = useCompanyStore((s) => s.activeCompanyId);
  const memberships = useCompanyStore((s) => s.memberships);
  const hydrated = useCompanyStore((s) => s.hydrated);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const route = pathToCompanyRoute(path);

  if (!currentUser) {
    if (route.key !== "login") {
      if (typeof window !== "undefined" && path !== "/company/login") {
        queueMicrotask(() => companyNavigate(companyPath("login"), true));
      }
    }
    return <LoginPage />;
  }

  if (route.key === "login") {
    queueMicrotask(() => companyNavigate(companyPath("select"), true));
    return null;
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        {t("common.loadingWorkspace")}
      </div>
    );
  }

  if (route.key === "select" || route.key === "create" || route.key === "gateway" || route.key === "invite-accept") {
    if (route.key === "gateway") {
      const active = memberships.filter((m) => m.status === "ACTIVE");
      if (active.length === 1 && activeCompanyId) {
        queueMicrotask(() => companyNavigate(companyPath("dashboard"), true));
      } else if (active.length === 0) {
        queueMicrotask(() => companyNavigate(companyPath("create"), true));
      } else {
        queueMicrotask(() => companyNavigate(companyPath("select"), true));
      }
      return null;
    }
    if (route.key === "invite-accept") {
      return (
        <LazyPage>
          <InviteAcceptPage />
        </LazyPage>
      );
    }
    if (route.key === "create") {
      return (
        <LazyPage>
          <CreateCompanyPage />
        </LazyPage>
      );
    }
    return <SelectCompanyPage />;
  }

  if (!activeCompanyId) {
    queueMicrotask(() => companyNavigate(companyPath("select"), true));
    return null;
  }

  let page: ReactNode;
  switch (route.key) {
    case "dashboard":
      page = <DashboardPage />;
      break;
    case "day-book":
      page = <ReportViewPage reportKey="day-book" />;
      break;
    case "parties":
      page = <PartiesPage startCreating={route.params.create === "1"} />;
      break;
    case "party-detail":
      page = <PartyDetailPage partyId={route.params.id} />;
      break;
    case "ledgers":
      page = <LedgersPage />;
      break;
    case "cash-bank":
      page = <LedgersPage cashBankOnly />;
      break;
    case "vouchers":
      page = <VouchersPage />;
      break;
    case "voucher-new":
      page = <VoucherCreatePage />;
      break;
    case "voucher-detail":
      page = <VoucherDetailPage voucherId={route.params.id ?? ""} />;
      break;
    case "quick-received":
      page = <QuickReceivedPage />;
      break;
    case "quick-paid":
      page = <QuickPaidPage />;
      break;
    case "quick-transfer":
      page = <QuickTransferPage />;
      break;
    case "quick-journal":
      page = <QuickJournalPage />;
      break;
    case "receivables":
      page = <ReceivablesPage />;
      break;
    case "payables":
      page = <PayablesPage />;
      break;
    case "reports":
      page = <ReportsHubPage />;
      break;
    case "report-view":
      page = <ReportViewPage reportKey={route.params.reportKey} />;
      break;
    case "masters":
    case "masters-business-units":
    case "masters-areas":
    case "masters-projects":
    case "masters-cost-centres":
    case "masters-categories":
      page = <MastersPage tab={route.params.tab ?? "business-units"} />;
      break;
    case "users":
      page = <UsersPage />;
      break;
    case "approvals":
      page = <ApprovalsPage />;
      break;
    case "settings":
      page = <SettingsPage />;
      break;
    case "audit":
      page = <AuditPage />;
      break;
    case "export":
      page = <ExportPage />;
      break;
    case "search":
      page = <SearchPage />;
      break;
    default:
      page = (
        <div className="rounded-lg border border-border bg-card p-6">
          <h1 className="text-lg font-semibold">Unknown company route</h1>
          <p className="mt-2 text-sm text-muted-foreground">No page is registered for this path.</p>
        </div>
      );
  }

  return (
    <CompanyAppShell activeKey={route.key}>
      <LazyPage>{page}</LazyPage>
    </CompanyAppShell>
  );
}

export function CompanyApp() {
  return (
    <CompanyProviders>
      <CompanyRouter />
    </CompanyProviders>
  );
}
