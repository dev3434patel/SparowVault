import { create } from "zustand";
import type {
  CompanyMembership,
  CompanyPermission,
  CompanyWorkspace,
} from "@/company/types";
import { companyApi } from "@/company/api/client";
import type { CompanyPermissionLoadState } from "@/company/auth/companyCan";

interface CompanyStoreState {
  activeCompanyId: string | null;
  workspace: CompanyWorkspace | null;
  memberships: CompanyMembership[];
  permissions: CompanyPermission[];
  /** loading and error both deny protected actions. ready + empty list also denies. */
  permissionsState: CompanyPermissionLoadState;
  hydrated: boolean;
  /** Bumps on company switch so pages can clear filters/caches. */
  contextEpoch: number;
  setActiveCompany: (companyId: string | null) => void;
  setWorkspaceFromCreate: (workspace: CompanyWorkspace, permissions?: CompanyPermission[]) => void;
  setPermissions: (permissions: CompanyPermission[]) => void;
  hydrateFromApi: () => Promise<void>;
  hydrateWorkspace: (companyId: string) => Promise<void>;
  clear: () => void;
}

/** Prefix for all company-scoped localStorage keys (i18n and session keys are out of scope). */
export const COMPANY_LS_PREFIX = "sv:company:";
const ACTIVE_KEY = `${COMPANY_LS_PREFIX}activeCompanyId`;
let hydrateSeq = 0;

function readStoredActive(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

function writeStoredActive(id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* ignore */
  }
}

/** Remove every `sv:company:*` key. Safe to call from logout without touching personal session/i18n. */
export function clearCompanyScopedStorage(): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(COMPANY_LS_PREFIX)) toRemove.push(key);
    }
    for (const key of toRemove) localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export const useCompanyStore = create<CompanyStoreState>((set, get) => ({
  activeCompanyId: readStoredActive(),
  workspace: null,
  memberships: [],
  permissions: [],
  permissionsState: "loading",
  hydrated: false,
  contextEpoch: 0,

  setActiveCompany: (companyId) => {
    writeStoredActive(companyId);
    set((s) => ({
      activeCompanyId: companyId,
      contextEpoch: s.contextEpoch + 1,
      permissions: [],
      permissionsState: "loading",
      ...(companyId ? {} : { workspace: null }),
    }));
    if (companyId) {
      void get().hydrateWorkspace(companyId);
    }
  },

  setWorkspaceFromCreate: (workspace, permissions = []) => {
    writeStoredActive(workspace.id);
    set((s) => ({
      activeCompanyId: workspace.id,
      workspace,
      permissions,
      permissionsState: permissions.length > 0 ? "ready" : "loading",
      contextEpoch: s.contextEpoch + 1,
      hydrated: true,
    }));
    if (permissions.length === 0) {
      void get().hydrateWorkspace(workspace.id);
    }
  },

  setPermissions: (permissions) => set({ permissions, permissionsState: "ready" }),

  hydrateFromApi: async () => {
    try {
      const memberships = await companyApi.listMemberships();
      set({ memberships, hydrated: true });
      const active = get().activeCompanyId;
      if (active && memberships.some((m) => m.companyId === active && m.status === "ACTIVE")) {
        await get().hydrateWorkspace(active);
      } else if (memberships.filter((m) => m.status === "ACTIVE").length === 1) {
        const only = memberships.find((m) => m.status === "ACTIVE")!;
        get().setActiveCompany(only.companyId);
      }
    } catch {
      set({ memberships: [], hydrated: true });
    }
  },

  hydrateWorkspace: async (companyId: string) => {
    const seq = ++hydrateSeq;
    try {
      const { workspace, permissions } = await companyApi.getWorkspace(companyId);
      if (seq !== hydrateSeq) return; // stale
      if (get().activeCompanyId !== companyId) return;
      set({ workspace, permissions, permissionsState: "ready", activeCompanyId: companyId });
      writeStoredActive(companyId);
    } catch {
      if (seq !== hydrateSeq) return;
      // Do not wipe a newer successful workspace if company already moved.
      if (get().activeCompanyId !== companyId) return;
      set({ workspace: null, permissions: [], permissionsState: "error" });
    }
  },

  clear: () => {
    clearCompanyScopedStorage();
    set({
      activeCompanyId: null,
      workspace: null,
      memberships: [],
      permissions: [],
      permissionsState: "loading",
      hydrated: false,
      contextEpoch: 0,
    });
  },
}));
