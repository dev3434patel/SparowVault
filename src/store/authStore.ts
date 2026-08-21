import { create } from "zustand";
import type { User } from "@/types";
import { cloudAdminLogin, cloudLogin, cloudLogout, cloudMe } from "@/lib/cloud/client";
import { nowIso } from "@/lib/utils";

const LS_SESSION_KEY = "sv:session";
const LS_UNLOCK_FAIL_KEY = "sv:unlock_fail";
const MAX_UNLOCK_ATTEMPTS = 5;
const UNLOCK_COOLDOWN_MS = 60_000;

interface AuthState {
  hydrated: boolean;
  profiles: User[];
  currentUser: User | null;
  locked: boolean;
  loading: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  refreshProfiles: () => Promise<void>;
  login: (userId: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
  lock: () => Promise<void>;
  unlock: (pin: string) => Promise<void>;
  switchProfile: (userId: string, pin: string) => Promise<void>;
  setError: (e: string | null) => void;
}

type StoredSession = { userId: string; username?: string; locked: boolean };
type UnlockGuard = { attempts: number; blockedUntil?: number };

function getStoredSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

function setStoredSession(session: StoredSession | null): void {
  if (typeof window === "undefined") return;
  if (!session) {
    localStorage.removeItem(LS_SESSION_KEY);
    return;
  }
  localStorage.setItem(LS_SESSION_KEY, JSON.stringify(session));
}

function getUnlockGuard(): UnlockGuard {
  if (typeof window === "undefined") return { attempts: 0 };
  try {
    const raw = localStorage.getItem(LS_UNLOCK_FAIL_KEY);
    if (!raw) return { attempts: 0 };
    return JSON.parse(raw) as UnlockGuard;
  } catch {
    return { attempts: 0 };
  }
}

function setUnlockGuard(next: UnlockGuard | null): void {
  if (typeof window === "undefined") return;
  if (!next) {
    localStorage.removeItem(LS_UNLOCK_FAIL_KEY);
    return;
  }
  localStorage.setItem(LS_UNLOCK_FAIL_KEY, JSON.stringify(next));
}

function toUserShape(input: {
  id: string;
  username: string;
  displayName: string;
  mobile?: string | null;
  email?: string | null;
  avatarEmoji?: string | null;
  avatarColor?: string | null;
  securityQuestion?: string | null;
}): User {
  const now = nowIso();
  return {
    id: input.id,
    userId: input.id,
    username: input.username,
    displayName: input.displayName,
    pinHash: "",
    pinSalt: "",
    avatarEmoji: input.avatarEmoji || "👤",
    avatarColor: input.avatarColor || "#2563eb",
    mobile: input.mobile || undefined,
    email: input.email || undefined,
    securityQuestion: input.securityQuestion || undefined,
    themePreference: "system",
    financialYearStartMonth: 4,
    isLocked: 0,
    createdAt: now,
    updatedAt: now,
    isDeleted: 0,
    version: 1,
    tags: [],
    notes: "",
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  hydrated: false,
  profiles: [],
  currentUser: null,
  locked: false,
  loading: false,
  error: null,
  setError: (e) => set({ error: e }),

  hydrate: async () => {
    try {
      const session = getStoredSession();
      const me = await cloudMe().catch(() => null);
      if (!session || !me || session.userId !== me.id) {
        setStoredSession(null);
        setUnlockGuard(null);
        set({ profiles: [], currentUser: null, locked: false, hydrated: true });
        return;
      }
      set({
        profiles: [],
        currentUser: toUserShape(me),
        locked: !!session.locked,
        hydrated: true,
      });
    } catch {
      set({ hydrated: true, error: "Failed to restore session. Please sign in again." });
    }
  },

  refreshProfiles: async () => {
    set({ profiles: [] });
  },

  login: async (userId, pin) => {
    set({ loading: true, error: null });
    try {
      const session = getStoredSession();
      const username = session?.username;
      if (!username) throw new Error("Session expired. Please sign in again.");
      const fn = username.toLowerCase() === "admin" ? cloudAdminLogin : cloudLogin;
      const authUser = await fn({ username, pin });
      if (authUser.id !== userId) throw new Error("Account mismatch");
      setStoredSession({ userId: authUser.id, username: authUser.username, locked: false });
      setUnlockGuard(null);
      set({ currentUser: toUserShape(authUser), locked: false, loading: false });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Login failed";
      set({ loading: false, error: msg });
      throw e;
    }
  },

  logout: async () => {
    await cloudLogout();
    setStoredSession(null);
    setUnlockGuard(null);
    set({ currentUser: null, locked: false });
  },

  lock: async () => {
    const session = getStoredSession();
    if (session) setStoredSession({ ...session, locked: true });
    set({ locked: true });
  },

  unlock: async (pin) => {
    const session = getStoredSession();
    if (!session?.username) throw new Error("No active session");
    const guard = getUnlockGuard();
    if (guard.blockedUntil && guard.blockedUntil > Date.now()) {
      const waitSeconds = Math.ceil((guard.blockedUntil - Date.now()) / 1000);
      throw new Error(`Too many attempts. Try again in ${waitSeconds}s.`);
    }
    const fn = session.username.toLowerCase() === "admin" ? cloudAdminLogin : cloudLogin;
    try {
      await fn({ username: session.username, pin });
      setStoredSession({ ...session, locked: false });
      setUnlockGuard(null);
      set({ locked: false, error: null });
    } catch (e) {
      const attempts = (guard.attempts ?? 0) + 1;
      const blockedUntil =
        attempts >= MAX_UNLOCK_ATTEMPTS ? Date.now() + UNLOCK_COOLDOWN_MS : undefined;
      setUnlockGuard({ attempts, blockedUntil });
      throw e;
    }
  },

  switchProfile: async (userId, pin) => {
    await get().logout();
    await get().login(userId, pin);
  },
}));
