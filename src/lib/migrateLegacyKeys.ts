/**
 * One-time migration of pre-rebrand localStorage keys (`rmp:*`) to the new
 * SparowVault keys (`sv:*`). Safe to call on every startup — it's a no-op
 * once migrated and does NOT overwrite new-key values.
 */
const MAP: Record<string, string> = {
  "rmp:theme": "sv:theme",
  "rmp:session": "sv:session",
  "rmp:last_user": "sv:last_user",
};

export function migrateLegacyLocalStorageKeys() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem("rmp:cloud_token");
    window.localStorage.removeItem("sv:auth_token");
    window.localStorage.removeItem("sv:cloud_token");
    for (const [oldKey, newKey] of Object.entries(MAP)) {
      const legacy = window.localStorage.getItem(oldKey);
      if (legacy == null) continue;
      if (window.localStorage.getItem(newKey) == null) {
        window.localStorage.setItem(newKey, legacy);
      }
      window.localStorage.removeItem(oldKey);
    }
  } catch {
    // Storage may be unavailable (private mode, quota etc.) — safe to ignore
  }
}
