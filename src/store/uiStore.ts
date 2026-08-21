import { create } from "zustand";
import type { TransactionType } from "@/types";

type QuickAddMode = "income" | "expense" | "transfer" | null;

const TOAST_QUEUE_MAX = 6;

const LS_DASH = "sparowvault_dashboard_mode";
const LS_CHART_A11Y = "sparowvault_chart_accessibility";

export type DashboardMode = "basic" | "normal" | "premium" | "essential" | "family" | "wealth";

export type ChartAccessibility = "default" | "colorblind";

function readLs<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key) as T | null;
    if (v && (allowed as readonly string[]).includes(v)) return v;
  } catch {
    /* ignore */
  }
  return fallback;
}

export interface PendingTransactionFilters {
  categoryIds?: string[];
  dateFrom?: string;
  dateTo?: string;
  types?: TransactionType[];
}

export interface ConfirmRequest {
  id: string;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  resolve: (ok: boolean) => void;
}

interface UIState {
  sidebarCollapsed: boolean;
  quickAddOpen: QuickAddMode;
  alertsOpen: boolean;
  commandOpen: boolean;
  dashboardMode: DashboardMode;
  chartAccessibility: ChartAccessibility;
  pendingTransactionFilters: PendingTransactionFilters | null;
  toasts: Toast[];
  confirm: ConfirmRequest | null;
  setSidebarCollapsed: (c: boolean) => void;
  openQuickAdd: (mode: Exclude<QuickAddMode, null>) => void;
  closeQuickAdd: () => void;
  setAlertsOpen: (o: boolean) => void;
  setCommandOpen: (o: boolean) => void;
  setDashboardMode: (m: DashboardMode) => void;
  setChartAccessibility: (a: ChartAccessibility) => void;
  setPendingTransactionFilters: (f: PendingTransactionFilters | null) => void;
  consumePendingTransactionFilters: () => PendingTransactionFilters | null;
  toast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
  requestConfirm: (input: Omit<ConfirmRequest, "id" | "resolve">) => Promise<boolean>;
  resolveConfirm: (ok: boolean) => void;
}

export interface Toast {
  id: string;
  title: string;
  description?: string;
  kind?: "success" | "error" | "info" | "warning";
}

const DASH_MODES = ["basic", "normal", "premium", "essential", "family", "wealth"] as const;
const CHART_A11Y = ["default", "colorblind"] as const;

export const useUIStore = create<UIState>((set, get) => ({
  sidebarCollapsed: false,
  quickAddOpen: null,
  alertsOpen: false,
  commandOpen: false,
  dashboardMode: readLs(LS_DASH, DASH_MODES, "normal"),
  chartAccessibility: readLs(LS_CHART_A11Y, CHART_A11Y, "default"),
  pendingTransactionFilters: null,
  toasts: [],
  confirm: null,
  setSidebarCollapsed: (c) => set({ sidebarCollapsed: c }),
  openQuickAdd: (mode) => set({ quickAddOpen: mode }),
  closeQuickAdd: () => set({ quickAddOpen: null }),
  setAlertsOpen: (o) => set({ alertsOpen: o }),
  setCommandOpen: (o) => set({ commandOpen: o }),
  setDashboardMode: (m) => {
    try {
      localStorage.setItem(LS_DASH, m);
    } catch {
      /* ignore */
    }
    set({ dashboardMode: m });
  },
  setChartAccessibility: (a) => {
    try {
      localStorage.setItem(LS_CHART_A11Y, a);
    } catch {
      /* ignore */
    }
    set({ chartAccessibility: a });
  },
  setPendingTransactionFilters: (f) => set({ pendingTransactionFilters: f }),
  consumePendingTransactionFilters: () => {
    const f = get().pendingTransactionFilters;
    set({ pendingTransactionFilters: null });
    return f;
  },
  toast: (t) => {
    const id = Math.random().toString(36).slice(2);
    const next = [...get().toasts, { ...t, id }];
    while (next.length > TOAST_QUEUE_MAX) next.shift();
    set({ toasts: next });
    setTimeout(() => get().dismissToast(id), 4500);
  },
  dismissToast: (id) =>
    set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  requestConfirm: (input) =>
    new Promise<boolean>((resolve) => {
      const id = Math.random().toString(36).slice(2);
      set({ confirm: { ...input, id, resolve } });
    }),
  resolveConfirm: (ok) => {
    const cur = get().confirm;
    if (!cur) return;
    cur.resolve(ok);
    set({ confirm: null });
  },
}));

export function confirm(input: Omit<ConfirmRequest, "id" | "resolve">): Promise<boolean> {
  return useUIStore.getState().requestConfirm(input);
}
