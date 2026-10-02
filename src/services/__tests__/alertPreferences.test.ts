import { describe, expect, it } from "vitest";
import { alertPreferenceEnabled, alertPreferenceKey } from "@/services/alertPreferences";

describe("alert preferences", () => {
  it("maps each settings switch to its alert family", () => {
    expect(alertPreferenceKey("budget_over")).toBe("budgetAlerts");
    expect(alertPreferenceKey("emi_due_soon")).toBe("dueAlerts");
    expect(alertPreferenceKey("udhari_overdue")).toBe("udhariAlerts");
    expect(alertPreferenceKey("emergency_fund_low")).toBe("savingsAlerts");
    expect(alertPreferenceKey("unusual_spend")).toBe("unusualSpendAlerts");
    expect(alertPreferenceKey("duplicate_candidate")).toBe("duplicateAlerts");
  });

  it("hides a family when that switch is off and leaves the others on", () => {
    const prefs = {
      budgetAlerts: false,
      dueAlerts: true,
      udhariAlerts: true,
      savingsAlerts: true,
      unusualSpendAlerts: false,
      duplicateAlerts: true,
    };
    expect(alertPreferenceEnabled(prefs, "budget_warn")).toBe(false);
    expect(alertPreferenceEnabled(prefs, "cc_due_soon")).toBe(true);
    expect(alertPreferenceEnabled(prefs, "unusual_spend")).toBe(false);
    expect(alertPreferenceEnabled(prefs, "duplicate_candidate")).toBe(true);
  });
});
