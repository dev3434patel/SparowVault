import type { NavKey } from "@/store/navStore";
import { remainingQuota, type PlanFeatureKey, type UserPlanSnapshot } from "@/services/planFeatureGate";

/** Admin flags that block new writes. Missing or true means the module stays writable. */
const WRITE_FLAG: Partial<Record<NavKey, string>> = {
  goals: "goals_enabled",
  savings: "investments_enabled",
  udhari: "udhari_enabled",
  import: "import_enabled",
  "bill-calendar": "recurring_enabled",
  export: "export_enabled",
};

export function moduleWriteBlocked(flags: Record<string, boolean>, key: NavKey): string | null {
  const flag = WRITE_FLAG[key];
  if (!flag) return null;
  if (flags[flag] !== false && !(key === "export" && flags.exports === false)) return null;
  return "New actions are turned off for this module. Existing records stay on this device.";
}

/** Sidebar and command-palette keys hidden when a flag is explicitly false. A missing flag stays visible. */
const NAV_HIDE_FLAGS: Partial<Record<NavKey, readonly string[]>> = {
  goals: ["goals_enabled"],
  savings: ["investments_enabled"],
  udhari: ["udhari_enabled", "udhari"],
  import: ["import_enabled", "import"],
  "bill-calendar": ["recurring_enabled"],
  export: ["export_enabled", "exports"],
  alerts: ["alerts"],
  suggestions: ["ai_suggestions"],
};

export function personalNavHidden(
  flags: Record<string, boolean | undefined>,
  key: string,
): boolean {
  const names = NAV_HIDE_FLAGS[key as NavKey];
  if (!names) return false;
  return names.some((name) => flags[name] === false);
}

/** An explicit false on the admin flag map or the plan feature map hides the item. */
export function navVisibilityFlags(
  flags: Record<string, boolean | undefined>,
  features: Record<string, boolean | number | undefined> = {},
): Record<string, boolean | undefined> {
  const keys = new Set([...Object.keys(flags), ...Object.keys(features)]);
  const out: Record<string, boolean | undefined> = {};
  for (const key of keys) {
    if (flags[key] === false || features[key] === false) out[key] = false;
    else if (flags[key] === true || features[key] === true) out[key] = true;
  }
  return out;
}

export const PERSONAL_MOBILE_PRIMARY = ["dashboard", "transactions", "budgets", "goals", "reports"] as const;

/** Personal destinations for the mobile More sheet: every non-admin route that is not already on the bar. */
export function personalMobileMoreKeys(
  keys: readonly string[],
  flags: Record<string, boolean | undefined>,
  razorpayEnabled: boolean,
): string[] {
  const primary = new Set<string>(PERSONAL_MOBILE_PRIMARY);
  return keys.filter((key) => {
    if (key.startsWith("admin-")) return false;
    if (primary.has(key)) return false;
    if (personalNavHidden(flags, key)) return false;
    if (key === "subscription" && !razorpayEnabled) return false;
    return true;
  });
}

/** Plan and global feature maps use explicit false as locked. A missing key stays available offline. */
export function planFeatureOff(
  features: Record<string, boolean | number | undefined>,
  key: string,
): boolean {
  return features[key] === false;
}

const CAPS: Partial<Record<NavKey, PlanFeatureKey>> = {
  accounts: "max_accounts",
  cards: "max_cards",
  loans: "max_loans",
  goals: "max_goals",
};

export function collectionWriteBlocked(
  flags: Record<string, boolean>,
  collection: string,
): string | null {
  const flagByCollection: Record<string, string> = {
    goals: "goals_enabled",
    goalContribs: "goals_enabled",
    investments: "investments_enabled",
    savingsContribs: "investments_enabled",
    udhari: "udhari_enabled",
    udhariSettlements: "udhari_enabled",
    importSources: "import_enabled",
    recurringRules: "recurring_enabled",
  };
  const flag = flagByCollection[collection];
  if (!flag || flags[flag] !== false) return null;
  return "New actions are turned off for this module. Existing records stay on this device.";
}

export function planCapMessage(
  snapshot: UserPlanSnapshot | null,
  key: NavKey,
  used: number,
): string | null {
  const cap = CAPS[key];
  if (!cap || !snapshot) return null;
  const feature = snapshot.features[cap];
  if (!feature) return null;
  const left = remainingQuota(snapshot, cap, used);
  if (left === Number.POSITIVE_INFINITY) return null;
  if (left > 0) return null;
  return `This plan allows ${used} ${key}. Remove one or change the plan before adding another.`;
}

const NUMERIC_PLAN_FEATURE_KEYS: PlanFeatureKey[] = [
  "max_accounts",
  "max_cards",
  "max_loans",
  "max_goals",
  "max_transactions_per_month",
  "max_exports_per_month",
  "max_ai_suggestions_per_day",
  "attachment_storage_mb",
];

function planFeatureFromEffectiveValue(
  value: boolean | number | undefined,
): UserPlanSnapshot["features"][PlanFeatureKey] | undefined {
  if (value === false) return { isEnabled: false, limitValue: 0 };
  if (typeof value === "number") return { isEnabled: true, limitValue: value };
  if (value === true) return { isEnabled: true };
  return undefined;
}

/** Build a plan snapshot from subscription effectiveFeatures (booleans and numeric quotas). */
export function snapshotFromEffectiveFeatures(
  flags: Record<string, boolean | number | undefined>,
): UserPlanSnapshot {
  const features: UserPlanSnapshot["features"] = {};
  for (const key of NUMERIC_PLAN_FEATURE_KEYS) {
    const parsed = planFeatureFromEffectiveValue(flags[key]);
    if (parsed) features[key] = parsed;
  }
  return { planId: null, planCode: null, status: "active", features };
}

/** @deprecated use snapshotFromEffectiveFeatures. Accepts boolean flags and numeric quotas. */
export function snapshotFromBooleanFeatures(
  flags: Record<string, boolean | number | undefined>,
): UserPlanSnapshot {
  return snapshotFromEffectiveFeatures(flags);
}
