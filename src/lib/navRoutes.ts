import type { NavKey } from "@/store/navStore";

const NAV_TO_PATH: Record<NavKey, string> = {
  dashboard: "/",
  transactions: "/transactions",
  income: "/income",
  expenses: "/expenses",
  budgets: "/budgets",
  goals: "/goals",
  envelopes: "/envelopes",
  accounts: "/accounts",
  cards: "/cards",
  loans: "/loans",
  udhari: "/udhari",
  savings: "/savings",
  categories: "/categories",
  reports: "/reports",
  suggestions: "/suggestions",
  export: "/export",
  import: "/import",
  "bill-calendar": "/bills",
  reconciliation: "/reconciliation",
  household: "/household",
  alerts: "/alerts",
  settings: "/settings",
  profile: "/profile",
  audit: "/audit",
  subscription: "/subscription",
  "admin-dashboard": "/admin",
  "admin-plans": "/admin/plans",
  "admin-subscriptions": "/admin/subscriptions",
  "admin-flags": "/admin/flags",
  "admin-branding": "/admin/branding",
  "admin-users": "/admin/users",
};

const PATH_TO_NAV: Record<string, NavKey> = Object.entries(NAV_TO_PATH).reduce(
  (acc, [nav, path]) => {
    acc[path] = nav as NavKey;
    return acc;
  },
  {} as Record<string, NavKey>,
);

export function navToPath(nav: NavKey): string {
  return NAV_TO_PATH[nav] ?? "/";
}

export function pathToNav(pathname: string): NavKey {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return PATH_TO_NAV[normalized] ?? (normalized.startsWith("/admin") ? "admin-dashboard" : "dashboard");
}
