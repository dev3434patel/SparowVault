// Central app data store. Loads SQL-backed collections for the current user and
// provides mutation helpers that keep in-memory state in sync.

import { create } from "zustand";
import type {
  Account,
  AppAlert,
  AuditLog,
  AiSuggestion,
  Budget,
  Card,
  Category,
  EMIPayment,
  ExportHistory,
  FinancialEffect,
  FinancialEvent,
  Goal,
  GoalContribution,
  Investment,
  Loan,
  ProfileSettings,
  RecurringRule,
  Reminder,
  SavingsContribution,
  Transaction,
  UdhariRecord,
  UdhariSettlement,
  User,
} from "@/types";
import {
  accountRepo,
  alertRepo,
  auditRepo,
  aiSuggestionRepo,
  budgetRepo,
  cardRepo,
  categoryRepo,
  emiRepo,
  exportHistoryRepo,
  goalContribRepo,
  goalRepo,
  investmentRepo,
  loanRepo,
  recurringRepo,
  reminderRepo,
  savingsContribRepo,
  settingsRepo,
  transactionRepo,
  udhariRepo,
  udhariSettlementRepo,
} from "@/repositories";
import { seedDefaultAccounts, seedDefaultCategories } from "@/services/defaultsService";
import { buildFinanceEventBuilderContext, buildFullLedger } from "@/services/financeEventBuilder";

function computeLedgerSlice(
  userId: string,
  transactions: Transaction[],
  categories: Category[],
  emis: EMIPayment[],
): { ledgerEvents: FinancialEvent[]; ledgerEffects: FinancialEffect[] } {
  const ctx = buildFinanceEventBuilderContext(categories, emis);
  const { events, effects } = buildFullLedger(userId, transactions, ctx);
  return { ledgerEvents: events, ledgerEffects: effects };
}

interface DataState {
  loaded: boolean;
  loadingFor: string | null;
  loadingCollections: string[];
  hydratedCollections: Partial<Record<keyof DataCollections | "settings", boolean>>;

  settings: ProfileSettings | null;
  accounts: Account[];
  cards: Card[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  goalContribs: GoalContribution[];
  loans: Loan[];
  emis: EMIPayment[];
  udhari: UdhariRecord[];
  udhariSettlements: UdhariSettlement[];
  investments: Investment[];
  savingsContribs: SavingsContribution[];
  reminders: Reminder[];
  alerts: AppAlert[];
  recurringRules: RecurringRule[];
  exportHistory: ExportHistory[];
  auditLogs: AuditLog[];
  aiSuggestions: AiSuggestion[];

  ledgerEvents: FinancialEvent[];
  ledgerEffects: FinancialEffect[];

  loadAll: (user: User) => Promise<void>;
  loadBootstrap: (user: User) => Promise<void>;
  ensureCollections: (
    keys: Array<keyof DataCollections | "settings">,
    user: User,
  ) => Promise<void>;
  clear: () => void;
  refreshOne: (
    collection: keyof DataCollections,
    user: User,
  ) => Promise<void>;

  // generic mutation helpers (keep in-memory list in sync)
  upsertLocal: <K extends keyof DataCollections>(
    key: K,
    entity: DataCollections[K][number],
  ) => void;
  removeLocal: <K extends keyof DataCollections>(
    key: K,
    id: string,
  ) => void;
  setSettings: (s: ProfileSettings | null) => void;
  recomputeLedger: (userId: string) => void;
}

export type DataCollections = {
  accounts: Account[];
  cards: Card[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  goalContribs: GoalContribution[];
  loans: Loan[];
  emis: EMIPayment[];
  udhari: UdhariRecord[];
  udhariSettlements: UdhariSettlement[];
  investments: Investment[];
  savingsContribs: SavingsContribution[];
  reminders: Reminder[];
  alerts: AppAlert[];
  recurringRules: RecurringRule[];
  exportHistory: ExportHistory[];
  auditLogs: AuditLog[];
  aiSuggestions: AiSuggestion[];
};

export const useDataStore = create<DataState>((set, get) => ({
  loaded: false,
  loadingFor: null,
  loadingCollections: [],
  hydratedCollections: {},

  settings: null,
  accounts: [],
  cards: [],
  categories: [],
  transactions: [],
  budgets: [],
  goals: [],
  goalContribs: [],
  loans: [],
  emis: [],
  udhari: [],
  udhariSettlements: [],
  investments: [],
  savingsContribs: [],
  reminders: [],
  alerts: [],
  recurringRules: [],
  exportHistory: [],
  auditLogs: [],
  aiSuggestions: [],
  ledgerEvents: [],
  ledgerEffects: [],

  loadAll: async (user) => {
    set({ loadingFor: user.id });
    const uid = user.id;
    const [
      settingsList,
      accounts,
      cards,
      categories,
      transactions,
      budgets,
      goals,
      goalContribs,
      loans,
      emis,
      udhari,
      udhariSettlements,
      investments,
      savingsContribs,
      reminders,
      alerts,
      recurringRules,
      exportHistory,
      auditLogs,
      aiSuggestions,
    ] = await Promise.all([
      settingsRepo.list(uid),
      accountRepo.list(uid),
      cardRepo.list(uid),
      categoryRepo.list(uid),
      transactionRepo.list(uid),
      budgetRepo.list(uid),
      goalRepo.list(uid),
      goalContribRepo.list(uid),
      loanRepo.list(uid),
      emiRepo.list(uid),
      udhariRepo.list(uid),
      udhariSettlementRepo.list(uid),
      investmentRepo.list(uid),
      savingsContribRepo.list(uid),
      reminderRepo.list(uid),
      alertRepo.list(uid),
      recurringRepo.list(uid),
      exportHistoryRepo.list(uid),
      auditRepo.list(uid),
      aiSuggestionRepo.list(uid),
    ]);

    const hydratedAccounts = accounts.length > 0 ? accounts : await seedDefaultAccounts(user);
    const hydratedCategories =
      categories.length > 0 ? categories : await seedDefaultCategories(user);
    const sortedCategories = hydratedCategories.sort((a, b) => a.sortOrder - b.sortOrder);
    const sortedTx = transactions.sort((a, b) => +new Date(b.date) - +new Date(a.date));
    const ledger = computeLedgerSlice(uid, sortedTx, sortedCategories, emis);

    set({
      loaded: true,
      loadingFor: null,
      loadingCollections: [],
      hydratedCollections: {
        settings: true,
        accounts: true,
        cards: true,
        categories: true,
        transactions: true,
        budgets: true,
        goals: true,
        goalContribs: true,
        loans: true,
        emis: true,
        udhari: true,
        udhariSettlements: true,
        investments: true,
        savingsContribs: true,
        reminders: true,
        alerts: true,
        recurringRules: true,
        exportHistory: true,
        auditLogs: true,
        aiSuggestions: true,
      },
      settings: settingsList[0] ?? null,
      accounts: hydratedAccounts,
      cards,
      categories: sortedCategories,
      transactions: sortedTx,
      budgets,
      goals,
      goalContribs,
      loans,
      emis,
      udhari,
      udhariSettlements,
      investments,
      savingsContribs,
      reminders,
      alerts,
      recurringRules,
      exportHistory,
      auditLogs: auditLogs.sort(
        (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
      ),
      aiSuggestions,
      ledgerEvents: ledger.ledgerEvents,
      ledgerEffects: ledger.ledgerEffects,
    });
  },

  loadBootstrap: async (user) => {
    set({ loadingFor: user.id, loadingCollections: ["settings", "accounts", "categories", "alerts"] });
    const uid = user.id;
    const [settingsList, initialAccounts, initialCategories, alerts] = await Promise.all([
      settingsRepo.list(uid),
      accountRepo.list(uid),
      categoryRepo.list(uid),
      alertRepo.list(uid),
    ]);
    const accounts = initialAccounts.length > 0
      ? initialAccounts
      : await seedDefaultAccounts(user);
    const categories = initialCategories.length > 0
      ? initialCategories
      : await seedDefaultCategories(user);
    set({
      loaded: true,
      loadingFor: null,
      loadingCollections: [],
      hydratedCollections: {
        settings: true,
        accounts: true,
        categories: true,
        alerts: true,
      },
      settings: settingsList[0] ?? null,
      accounts,
      categories: categories.sort((a, b) => a.sortOrder - b.sortOrder),
      alerts,
    });
  },

  ensureCollections: async (keys, user) => {
    const missing = keys.filter((key) => !get().hydratedCollections[key]);
    if (missing.length === 0) return;
    set((state) => ({
      loadingCollections: Array.from(new Set([...state.loadingCollections, ...missing])),
    }));
    for (const key of missing) {
      if (key === "settings") {
        const settingsList = await settingsRepo.list(user.id);
        set({ settings: settingsList[0] ?? null });
      } else {
        await get().refreshOne(key, user);
      }
      set((state) => ({
        hydratedCollections: { ...state.hydratedCollections, [key]: true },
      }));
    }
    set((state) => ({
      loadingCollections: state.loadingCollections.filter((k) => !missing.includes(k as keyof DataCollections | "settings")),
    }));
  },

  clear: () => {
    set({
      loaded: false,
      loadingFor: null,
      loadingCollections: [],
      hydratedCollections: {},
      settings: null,
      accounts: [],
      cards: [],
      categories: [],
      transactions: [],
      budgets: [],
      goals: [],
      goalContribs: [],
      loans: [],
      emis: [],
      udhari: [],
      udhariSettlements: [],
      investments: [],
      savingsContribs: [],
      reminders: [],
      alerts: [],
      recurringRules: [],
      exportHistory: [],
      auditLogs: [],
      aiSuggestions: [],
      ledgerEvents: [],
      ledgerEffects: [],
    });
  },

  refreshOne: async (collection, user) => {
    const uid = user.id;
    switch (collection) {
      case "accounts":
        set({ accounts: await accountRepo.list(uid) });
        break;
      case "cards":
        set({ cards: await cardRepo.list(uid) });
        break;
      case "categories":
        set({
          categories: (await categoryRepo.list(uid)).sort(
            (a, b) => a.sortOrder - b.sortOrder,
          ),
        });
        get().recomputeLedger(uid);
        break;
      case "transactions":
        set({
          transactions: (await transactionRepo.list(uid)).sort(
            (a, b) => +new Date(b.date) - +new Date(a.date),
          ),
        });
        get().recomputeLedger(uid);
        break;
      case "budgets":
        set({ budgets: await budgetRepo.list(uid) });
        break;
      case "goals":
        set({ goals: await goalRepo.list(uid) });
        break;
      case "goalContribs":
        set({ goalContribs: await goalContribRepo.list(uid) });
        break;
      case "loans":
        set({ loans: await loanRepo.list(uid) });
        break;
      case "emis":
        set({ emis: await emiRepo.list(uid) });
        get().recomputeLedger(uid);
        break;
      case "udhari":
        set({ udhari: await udhariRepo.list(uid) });
        break;
      case "udhariSettlements":
        set({ udhariSettlements: await udhariSettlementRepo.list(uid) });
        break;
      case "investments":
        set({ investments: await investmentRepo.list(uid) });
        break;
      case "savingsContribs":
        set({ savingsContribs: await savingsContribRepo.list(uid) });
        break;
      case "reminders":
        set({ reminders: await reminderRepo.list(uid) });
        break;
      case "alerts":
        set({ alerts: await alertRepo.list(uid) });
        break;
      case "recurringRules":
        set({ recurringRules: await recurringRepo.list(uid) });
        break;
      case "exportHistory":
        set({ exportHistory: await exportHistoryRepo.list(uid) });
        break;
      case "auditLogs":
        set({
          auditLogs: (await auditRepo.list(uid)).sort(
            (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
          ),
        });
        break;
      case "aiSuggestions":
        set({ aiSuggestions: await aiSuggestionRepo.list(uid) });
        break;
    }
  },

  upsertLocal: (key, entity) => {
    const cur = get()[key] as { id: string }[];
    const idx = cur.findIndex((e) => e.id === entity.id);
    const next = [...cur];
    if (idx >= 0) next[idx] = entity;
    else next.unshift(entity);
    set({ [key]: next } as Partial<DataState>);
    if (key === "transactions" && "userId" in entity) {
      get().recomputeLedger((entity as Transaction).userId);
    }
    if (key === "categories" || key === "emis") {
      const uid = get().transactions[0]?.userId;
      if (uid) get().recomputeLedger(uid);
    }
  },

  removeLocal: (key, id) => {
    const cur = get()[key] as { id: string }[];
    const uid = key === "transactions" ? (cur.find((e) => e.id === id) as Transaction | undefined)?.userId : undefined;
    set({ [key]: cur.filter((e) => e.id !== id) } as Partial<DataState>);
    if (key === "transactions" && uid) get().recomputeLedger(uid);
  },

  setSettings: (s) => set({ settings: s }),

  recomputeLedger: (userId: string) => {
    const s = get();
    const ledger = computeLedgerSlice(userId, s.transactions, s.categories, s.emis);
    set({ ledgerEvents: ledger.ledgerEvents, ledgerEffects: ledger.ledgerEffects });
  },
}));
