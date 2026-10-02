import { describe, expect, it } from "vitest";
import { categoryRollupPaise } from "@/services/categoryRollup";
import { reservationSnapshot } from "@/services/reservationMath";
import { nextReconciliationStatus } from "@/services/reconciliationDecision";
import { alertPreferenceEnabled } from "@/services/alertPreferences";

describe("category rollup", () => {
  it("counts a child transaction once on the parent", () => {
    const totals = categoryRollupPaise(
      [
        { id: "parent", parentId: null },
        { id: "child", parentId: "parent" },
      ],
      [{ id: "t1", categoryId: "child", amountPaise: 500 }],
    );
    expect(totals.get("child")).toBe(500);
    expect(totals.get("parent")).toBe(500);
  });
});

describe("reservations", () => {
  it("keeps bank cash when money is reserved", () => {
    const snap = reservationSnapshot({
      bankCashPaise: 1_000_000,
      envelopeReservedPaise: 200_000,
      goalEarmarkPaise: 50_000,
      sinkingFundReservedPaise: 50_000,
    });
    expect(snap.bankCashPaise).toBe(1_000_000);
    expect(snap.reservedPaise).toBe(300_000);
    expect(snap.availableToSpendPaise).toBe(700_000);
  });
});

describe("reconciliation decisions", () => {
  it("maps confirm, reject, and unmatch", () => {
    expect(nextReconciliationStatus("confirm")).toBe("confirmed");
    expect(nextReconciliationStatus("reject")).toBe("rejected");
    expect(nextReconciliationStatus("unmatch")).toBe("suggested");
  });
});

describe("alert family isolation", () => {
  const kinds = ["budget_over", "emi_due_soon", "udhari_overdue", "low_savings", "unusual_spend", "duplicate_candidate"] as const;
  const keys = ["budgetAlerts", "dueAlerts", "udhariAlerts", "savingsAlerts", "unusualSpendAlerts", "duplicateAlerts"] as const;

  it("turning one switch off leaves the other families visible", () => {
    keys.forEach((off, index) => {
      const prefs = {
        budgetAlerts: true,
        dueAlerts: true,
        udhariAlerts: true,
        savingsAlerts: true,
        unusualSpendAlerts: true,
        duplicateAlerts: true,
        [off]: false,
      };
      kinds.forEach((kind, kindIndex) => {
        expect(alertPreferenceEnabled(prefs, kind)).toBe(kindIndex !== index);
      });
    });
  });
});
