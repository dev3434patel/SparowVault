import { create } from "zustand";
import { navToPath, pathToNav } from "@/lib/navRoutes";

export type NavKey =
  | "dashboard"
  | "transactions"
  | "income"
  | "expenses"
  | "budgets"
  | "goals"
  | "accounts"
  | "cards"
  | "loans"
  | "udhari"
  | "savings"
  | "categories"
  | "reports"
  | "suggestions"
  | "export"
  | "import"
  | "bill-calendar"
  | "reconciliation"
  | "household"
  | "alerts"
  | "settings"
  | "profile"
  | "audit"
  | "subscription"
  | "admin-dashboard"
  | "admin-plans"
  | "admin-subscriptions"
  | "admin-flags"
  | "admin-branding"
  | "admin-users";

interface NavState {
  active: NavKey;
  navActionId: number;
  setActive: (k: NavKey, source?: "user" | "url") => void;
  syncFromUrl: () => void;
}

export const useNavStore = create<NavState>((set) => ({
  active: typeof window !== "undefined" ? pathToNav(window.location.pathname) : "dashboard",
  navActionId: 0,
  setActive: (k, source = "user") => {
    if (typeof window !== "undefined" && source === "user") {
      const nextPath = navToPath(k);
      if (window.location.pathname !== nextPath) {
        window.history.pushState({}, "", nextPath);
      }
    }
    set((state) => ({
      active: k,
      navActionId: state.navActionId + 1,
    }));
  },
  syncFromUrl: () => {
    if (typeof window === "undefined") return;
    set((state) => ({
      active: pathToNav(window.location.pathname),
      navActionId: state.navActionId + 1,
    }));
  },
}));
