import { userRepo, auditRepo } from "@/repositories";
import type { User } from "@/types";
import { generateSalt, hashPin, verifyPin } from "@/lib/crypto";
import { nowIso } from "@/lib/utils";
import { apiRequest } from "@/lib/apiClient";

const LS_SESSION_KEY = "sv:session";
const LS_LAST_USER_KEY = "sv:last_user";

export interface LocalSession {
  userId: string;
  loggedInAt: string;
  locked: boolean;
}

export function getLocalSession(): LocalSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LocalSession;
  } catch {
    return null;
  }
}

export function setLocalSession(session: LocalSession | null) {
  if (typeof window === "undefined") return;
  if (session) {
    localStorage.setItem(LS_SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(LS_LAST_USER_KEY, session.userId);
  } else {
    localStorage.removeItem(LS_SESSION_KEY);
  }
}

export function getLastUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LS_LAST_USER_KEY);
}

export async function listProfiles(): Promise<User[]> {
  const all = await (await import("@/db/database")).getDB().users.toArray();
  const active = all.filter((u) => !u.isDeleted);
  const byUsername = new Map<string, User>();
  for (const user of active) {
    const key = user.username.toLowerCase().trim();
    const prev = byUsername.get(key);
    if (!prev) {
      byUsername.set(key, user);
      continue;
    }
    const prevTs = new Date(prev.lastLoginAt ?? prev.updatedAt ?? prev.createdAt).getTime();
    const curTs = new Date(user.lastLoginAt ?? user.updatedAt ?? user.createdAt).getTime();
    if (curTs >= prevTs) {
      byUsername.set(key, user);
    }
  }
  return Array.from(byUsername.values()).sort((a, b) => {
    const aTs = new Date(a.lastLoginAt ?? a.updatedAt ?? a.createdAt).getTime();
    const bTs = new Date(b.lastLoginAt ?? b.updatedAt ?? b.createdAt).getTime();
    return bTs - aTs;
  });
}

export async function loginProfile(
  userId: string,
  pin: string,
): Promise<User> {
  const user = await userRepo.get(userId);
  if (!user) throw new Error("Profile not found");
  const ok = await verifyPin(pin, user.pinSalt, user.pinHash);
  if (!ok) throw new Error("Incorrect PIN");

  await userRepo.update(userId, { lastLoginAt: nowIso(), isLocked: 0 });
  const session: LocalSession = {
    userId,
    loggedInAt: nowIso(),
    locked: false,
  };
  setLocalSession(session);

  await auditRepo.create({
    data: {
      action: "login",
      entity: "User",
      entityId: userId,
      detail: `${user.displayName} logged in`,
    },
    userId,
  });

  return user;
}

export async function logoutProfile(userId: string) {
  setLocalSession(null);
  await auditRepo.create({
    data: {
      action: "logout",
      entity: "User",
      entityId: userId,
      detail: "User logged out",
    },
    userId,
  });
}

export async function lockSession(userId: string) {
  const s = getLocalSession();
  if (s && s.userId === userId) {
    s.locked = true;
    setLocalSession(s);
  }
  await auditRepo.create({
    data: {
      action: "lock",
      entity: "User",
      entityId: userId,
      detail: "Session locked",
    },
    userId,
  });
}

export async function unlockSession(userId: string, pin: string) {
  const user = await userRepo.get(userId);
  if (!user) throw new Error("Profile not found");
  const ok = await verifyPin(pin, user.pinSalt, user.pinHash);
  if (!ok) throw new Error("Incorrect PIN");
  const s = getLocalSession();
  if (s && s.userId === userId) {
    s.locked = false;
    setLocalSession(s);
  } else {
    setLocalSession({ userId, loggedInAt: nowIso(), locked: false });
  }
  await auditRepo.create({
    data: {
      action: "unlock",
      entity: "User",
      entityId: userId,
      detail: "Session unlocked",
    },
    userId,
  });
  return user;
}

export async function changePin(
  _userId: string,
  oldPin: string,
  newPin: string,
) {
  await apiRequest<{ updated: boolean }>("/api/auth/change-pin.php", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ currentPin: oldPin, newPin }),
  });
}

export async function setSecurityAnswer(
  _userId: string,
  securityQuestion: string,
  securityAnswer: string,
  currentPin: string,
) {
  await apiRequest<{ updated: boolean }>("/api/auth/security-recovery.php", {
    method: "POST",
    auth: true,
    body: JSON.stringify({
      securityQuestion: securityQuestion.trim(),
      securityAnswer: securityAnswer.trim(),
      currentPin,
    }),
  });
}

export async function resetPinWithSecurityAnswer(
  _userId: string,
  securityAnswer: string,
  newPin: string,
) {
  await apiRequest<{ updated: boolean }>("/api/auth/reset-pin.php", {
    method: "POST",
    auth: true,
    body: JSON.stringify({
      securityAnswer: securityAnswer.trim(),
      newPin,
    }),
  });
}

export async function updateUserProfile(
  _userId: string,
  patch: Partial<User>,
) {
  return apiRequest<{ updated: boolean }>("/api/auth/profile.php", {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({
      displayName: String(patch.displayName ?? "").trim(),
      mobile: String(patch.mobile ?? "").trim(),
      email: String(patch.email ?? "").trim(),
      avatarEmoji: String(patch.avatarEmoji ?? "").trim(),
      avatarColor: String(patch.avatarColor ?? "").trim(),
    }),
  });
}
