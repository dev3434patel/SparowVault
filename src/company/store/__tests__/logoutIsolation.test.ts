import { beforeEach, describe, expect, it } from "vitest";
import {
  COMPANY_LS_PREFIX,
  clearCompanyScopedStorage,
  useCompanyStore,
} from "@/company/store/companyStore";

/** Minimal localStorage for Node vitest (company:test runs without jsdom). */
function installMemoryLocalStorage() {
  const map = new Map<string, string>();
  const ls = {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key: string, value: string) {
      map.set(String(key), String(value));
    },
    removeItem(key: string) {
      map.delete(key);
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
  };
  Object.defineProperty(globalThis, "localStorage", { value: ls, configurable: true });
  Object.defineProperty(globalThis, "window", {
    value: { localStorage: ls },
    configurable: true,
  });
  return map;
}

function companyScopedKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(COMPANY_LS_PREFIX)) keys.push(k);
  }
  return keys;
}

describe("logout isolation — company store", () => {
  beforeEach(() => {
    installMemoryLocalStorage();
    useCompanyStore.setState({
      activeCompanyId: null,
      workspace: null,
      memberships: [],
      permissions: [],
      hydrated: false,
      contextEpoch: 0,
    });
  });

  it("clears all company-scoped localStorage keys and in-memory slices", () => {
    localStorage.setItem(`${COMPANY_LS_PREFIX}activeCompanyId`, "co-user-a");
    localStorage.setItem(`${COMPANY_LS_PREFIX}dashboard:co-user-a`, JSON.stringify({ cash: 1 }));
    localStorage.setItem(`${COMPANY_LS_PREFIX}permissions:co-user-a`, JSON.stringify(["view_reports"]));
    // Non-company keys must survive (session/i18n).
    localStorage.setItem("sv:session", JSON.stringify({ userId: "u1" }));
    localStorage.setItem("sv:i18n:locale", "en");

    useCompanyStore.setState({
      activeCompanyId: "co-user-a",
      workspace: {
        id: "co-user-a",
        name: "A Co",
        code: "A",
        fiscalYearStartMonth: 4,
        baseCurrency: "INR",
        status: "ACTIVE",
        createdAt: "2026-01-01T00:00:00Z",
      } as never,
      memberships: [
        {
          companyId: "co-user-a",
          userId: "u1",
          role: "OWNER",
          status: "ACTIVE",
        } as never,
      ],
      permissions: ["view_reports"] as never,
      hydrated: true,
      contextEpoch: 3,
    });

    useCompanyStore.getState().clear();

    expect(companyScopedKeys()).toEqual([]);
    expect(localStorage.getItem("sv:session")).toBeTruthy();
    expect(localStorage.getItem("sv:i18n:locale")).toBe("en");

    const s = useCompanyStore.getState();
    expect(s.activeCompanyId).toBeNull();
    expect(s.workspace).toBeNull();
    expect(s.memberships).toEqual([]);
    expect(s.permissions).toEqual([]);
    expect(s.permissionsState).toBe("loading");
    expect(s.hydrated).toBe(false);
    expect(s.contextEpoch).toBe(0);
  });

  it("second user on same browser profile cannot read first user's company context", () => {
    // User A session residue
    localStorage.setItem(`${COMPANY_LS_PREFIX}activeCompanyId`, "co-alice");
    localStorage.setItem(`${COMPANY_LS_PREFIX}cache:co-alice`, "secret-alice");
    useCompanyStore.setState({
      activeCompanyId: "co-alice",
      memberships: [{ companyId: "co-alice", userId: "alice", role: "OWNER", status: "ACTIVE" } as never],
      permissions: ["manage_users"] as never,
      hydrated: true,
      contextEpoch: 1,
    });

    // Logout path (AppProviders / CompanyProviders call clear)
    useCompanyStore.getState().clear();
    expect(localStorage.getItem(`${COMPANY_LS_PREFIX}activeCompanyId`)).toBeNull();
    expect(companyScopedKeys()).toEqual([]);

    // User B lands on same profile — must not inherit Alice's company id or perms
    const bobBoot = useCompanyStore.getState();
    expect(bobBoot.activeCompanyId).toBeNull();
    expect(bobBoot.memberships).toEqual([]);
    expect(bobBoot.permissions).toEqual([]);
    expect(bobBoot.workspace).toBeNull();

    // Even if something re-seeds a non-company key, clearCompanyScopedStorage is idempotent
    localStorage.setItem("sv:i18n:locale", "hi");
    clearCompanyScopedStorage();
    expect(companyScopedKeys()).toEqual([]);
    expect(localStorage.getItem("sv:i18n:locale")).toBe("hi");
  });
});
