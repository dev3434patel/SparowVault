export type CompanyNavKey =
  | "gateway"
  | "login"
  | "select"
  | "create"
  | "invite-accept"
  | "dashboard"
  | "day-book"
  | "parties"
  | "party-detail"
  | "ledgers"
  | "cash-bank"
  | "vouchers"
  | "voucher-new"
  | "voucher-detail"
  | "quick-received"
  | "quick-paid"
  | "quick-transfer"
  | "quick-journal"
  | "receivables"
  | "payables"
  | "reports"
  | "report-view"
  | "masters"
  | "masters-business-units"
  | "masters-areas"
  | "masters-projects"
  | "masters-cost-centres"
  | "masters-categories"
  | "search"
  | "users"
  | "approvals"
  | "settings"
  | "audit"
  | "export"
  | "modules"
  | "invoices";

export interface CompanyRouteMatch {
  key: CompanyNavKey;
  params: Record<string, string>;
  path: string;
}

const APP_PREFIX = "/company/app";

/** Navigate within company SPA (path-based, no React Router). */
export function companyNavigate(path: string, replace = false): void {
  if (typeof window === "undefined") return;
  if (replace) window.history.replaceState({}, "", path);
  else window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function companyPath(key: CompanyNavKey, params: Record<string, string> = {}): string {
  switch (key) {
    case "gateway":
      return "/company";
    case "login":
      return "/company/login";
    case "select":
      return "/company/select";
    case "create":
      return "/company/create";
    case "invite-accept":
      return "/company/invite/accept";
    case "dashboard":
      return `${APP_PREFIX}`;
    case "day-book":
      return `${APP_PREFIX}/reports/day-book`;
    case "parties":
      return `${APP_PREFIX}/parties`;
    case "party-detail":
      return `${APP_PREFIX}/parties/${params.id ?? ""}`;
    case "ledgers":
      return `${APP_PREFIX}/ledgers`;
    case "cash-bank":
      return `${APP_PREFIX}/cash-bank`;
    case "vouchers":
      return `${APP_PREFIX}/vouchers`;
    case "voucher-new":
      return `${APP_PREFIX}/vouchers/new`;
    case "voucher-detail":
      return `${APP_PREFIX}/vouchers/${params.id ?? ""}`;
    case "quick-received":
      return `${APP_PREFIX}/quick/received`;
    case "quick-paid":
      return `${APP_PREFIX}/quick/paid`;
    case "quick-transfer":
      return `${APP_PREFIX}/quick/transfer`;
    case "quick-journal":
      return `${APP_PREFIX}/quick/journal`;
    case "receivables":
      return `${APP_PREFIX}/receivables`;
    case "payables":
      return `${APP_PREFIX}/payables`;
    case "reports":
      return `${APP_PREFIX}/reports`;
    case "report-view":
      return `${APP_PREFIX}/reports/${params.reportKey ?? ""}`;
    case "masters":
    case "masters-business-units":
      return `${APP_PREFIX}/masters/business-units`;
    case "masters-areas":
      return `${APP_PREFIX}/masters/areas`;
    case "masters-projects":
      return `${APP_PREFIX}/masters/projects`;
    case "masters-cost-centres":
      return `${APP_PREFIX}/masters/cost-centres`;
    case "masters-categories":
      return `${APP_PREFIX}/masters/categories`;
    case "search":
      return `${APP_PREFIX}/search`;
    case "users":
      return `${APP_PREFIX}/users`;
    case "approvals":
      return `${APP_PREFIX}/approvals`;
    case "settings":
      return `${APP_PREFIX}/settings`;
    case "audit":
      return `${APP_PREFIX}/audit`;
    case "export":
      return `${APP_PREFIX}/export`;
    case "modules":
      return `${APP_PREFIX}/modules`;
    case "invoices":
      return `${APP_PREFIX}/invoices`;
    default:
      return "/company";
  }
}

export function pathToCompanyRoute(pathname: string): CompanyRouteMatch {
  const path = pathname.replace(/\/+$/, "") || "/";

  if (path === "/company" || path === "/company/") {
    return { key: "gateway", params: {}, path };
  }
  if (path === "/company/login") return { key: "login", params: {}, path };
  if (path === "/company/select") return { key: "select", params: {}, path };
  if (path === "/company/create") return { key: "create", params: {}, path };
  if (path.startsWith("/company/invite/accept")) {
    return { key: "invite-accept", params: {}, path };
  }

  if (path === APP_PREFIX || path === `${APP_PREFIX}/`) {
    return { key: "dashboard", params: {}, path };
  }

  if (path === `${APP_PREFIX}/reports/day-book`) {
    return { key: "day-book", params: { reportKey: "day-book" }, path };
  }

  if (path === `${APP_PREFIX}/parties/new`) {
    return { key: "parties", params: { create: "1" }, path };
  }
  const partyDetail = path.match(new RegExp(`^${APP_PREFIX}/parties/([^/]+)$`));
  if (partyDetail) return { key: "party-detail", params: { id: partyDetail[1] }, path };

  if (path === `${APP_PREFIX}/parties`) return { key: "parties", params: {}, path };
  if (path === `${APP_PREFIX}/ledgers`) return { key: "ledgers", params: {}, path };
  if (path === `${APP_PREFIX}/cash-bank`) return { key: "cash-bank", params: {}, path };
  if (path === `${APP_PREFIX}/vouchers/new`) return { key: "voucher-new", params: {}, path };

  const voucherDetail = path.match(new RegExp(`^${APP_PREFIX}/vouchers/([^/]+)$`));
  if (voucherDetail) return { key: "voucher-detail", params: { id: voucherDetail[1] }, path };

  if (path === `${APP_PREFIX}/vouchers`) return { key: "vouchers", params: {}, path };
  if (path === `${APP_PREFIX}/quick/received`) return { key: "quick-received", params: {}, path };
  if (path === `${APP_PREFIX}/quick/paid`) return { key: "quick-paid", params: {}, path };
  if (path === `${APP_PREFIX}/quick/transfer`) return { key: "quick-transfer", params: {}, path };
  if (path === `${APP_PREFIX}/quick/journal`) return { key: "quick-journal", params: {}, path };
  if (path === `${APP_PREFIX}/receivables`) return { key: "receivables", params: {}, path };
  if (path === `${APP_PREFIX}/payables`) return { key: "payables", params: {}, path };

  const reportView = path.match(new RegExp(`^${APP_PREFIX}/reports/([^/]+)$`));
  if (reportView) return { key: "report-view", params: { reportKey: reportView[1] }, path };
  if (path === `${APP_PREFIX}/reports`) return { key: "reports", params: {}, path };

  if (path === `${APP_PREFIX}/masters/business-units`) {
    return { key: "masters-business-units", params: { tab: "business-units" }, path };
  }
  if (path === `${APP_PREFIX}/masters/areas`) {
    return { key: "masters-areas", params: { tab: "areas" }, path };
  }
  if (path === `${APP_PREFIX}/masters/projects`) {
    return { key: "masters-projects", params: { tab: "projects" }, path };
  }
  if (path === `${APP_PREFIX}/masters/cost-centres`) {
    return { key: "masters-cost-centres", params: { tab: "cost-centres" }, path };
  }
  if (path === `${APP_PREFIX}/masters/categories`) {
    return { key: "masters-categories", params: { tab: "categories" }, path };
  }

  if (path === `${APP_PREFIX}/search`) return { key: "search", params: {}, path };
  if (path === `${APP_PREFIX}/users`) return { key: "users", params: {}, path };
  if (path === `${APP_PREFIX}/approvals`) return { key: "approvals", params: {}, path };
  if (path === `${APP_PREFIX}/settings`) return { key: "settings", params: {}, path };
  if (path === `${APP_PREFIX}/audit`) return { key: "audit", params: {}, path };
  if (path === `${APP_PREFIX}/export`) return { key: "export", params: {}, path };
  if (path === `${APP_PREFIX}/modules`) return { key: "modules", params: {}, path };
  if (path === `${APP_PREFIX}/invoices`) return { key: "invoices", params: {}, path };

  if (path.startsWith("/company")) {
    return { key: "dashboard", params: {}, path };
  }

  return { key: "gateway", params: {}, path };
}

export interface CompanySidebarItem {
  key: CompanyNavKey;
  /** i18n key under nav.* */
  labelKey: string;
  path: string;
  /** i18n key under nav.group.* */
  groupKey: string;
}

export const COMPANY_SIDEBAR_NAV: CompanySidebarItem[] = [
  { key: "dashboard", labelKey: "nav.dashboard", path: companyPath("dashboard"), groupKey: "nav.group.overview" },
  { key: "day-book", labelKey: "nav.dayBook", path: companyPath("day-book"), groupKey: "nav.group.overview" },
  { key: "quick-received", labelKey: "nav.moneyReceived", path: companyPath("quick-received"), groupKey: "nav.group.money" },
  { key: "quick-paid", labelKey: "nav.moneyPaid", path: companyPath("quick-paid"), groupKey: "nav.group.money" },
  { key: "quick-transfer", labelKey: "nav.transfer", path: companyPath("quick-transfer"), groupKey: "nav.group.money" },
  { key: "quick-journal", labelKey: "nav.journal", path: companyPath("quick-journal"), groupKey: "nav.group.money" },
  { key: "cash-bank", labelKey: "nav.cashBank", path: companyPath("cash-bank"), groupKey: "nav.group.money" },
  { key: "parties", labelKey: "nav.parties", path: companyPath("parties"), groupKey: "nav.group.parties" },
  { key: "receivables", labelKey: "nav.receivables", path: companyPath("receivables"), groupKey: "nav.group.parties" },
  { key: "payables", labelKey: "nav.payables", path: companyPath("payables"), groupKey: "nav.group.parties" },
  { key: "vouchers", labelKey: "nav.vouchers", path: companyPath("vouchers"), groupKey: "nav.group.books" },
  { key: "ledgers", labelKey: "nav.ledgers", path: companyPath("ledgers"), groupKey: "nav.group.books" },
  { key: "masters-business-units", labelKey: "nav.businessUnits", path: companyPath("masters-business-units"), groupKey: "nav.group.business" },
  { key: "masters-projects", labelKey: "nav.projects", path: companyPath("masters-projects"), groupKey: "nav.group.business" },
  { key: "masters-areas", labelKey: "nav.areas", path: companyPath("masters-areas"), groupKey: "nav.group.business" },
  { key: "masters-cost-centres", labelKey: "nav.costCentres", path: companyPath("masters-cost-centres"), groupKey: "nav.group.business" },
  { key: "masters-categories", labelKey: "nav.categories", path: companyPath("masters-categories"), groupKey: "nav.group.business" },
  { key: "reports", labelKey: "nav.reports", path: companyPath("reports"), groupKey: "nav.group.insights" },
  { key: "search", labelKey: "nav.search", path: companyPath("search"), groupKey: "nav.group.insights" },
  { key: "approvals", labelKey: "nav.approvals", path: companyPath("approvals"), groupKey: "nav.group.control" },
  { key: "users", labelKey: "nav.users", path: companyPath("users"), groupKey: "nav.group.control" },
  { key: "audit", labelKey: "nav.audit", path: companyPath("audit"), groupKey: "nav.group.control" },
  { key: "export", labelKey: "nav.export", path: companyPath("export"), groupKey: "nav.group.control" },
  { key: "settings", labelKey: "nav.settings", path: companyPath("settings"), groupKey: "nav.group.control" },
  { key: "modules", labelKey: "nav.modules", path: companyPath("modules"), groupKey: "nav.group.insights" },
  { key: "invoices", labelKey: "nav.invoices", path: companyPath("invoices"), groupKey: "nav.group.money" },
];
