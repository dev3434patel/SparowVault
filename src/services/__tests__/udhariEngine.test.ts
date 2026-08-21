import { describe, expect, it } from "vitest";
import type { UdhariRecord } from "@/types";
import {
  buildUdhariPeopleIntel,
  buildUdhariWhatsAppReminder,
  opaquePhoneHash,
  udhariRemainingPaise,
  validateWriteOffReason,
} from "@/services/udhariEngine";
import { rupeesToPaise } from "@/utils/money";

const now = "2026-05-14T00:00:00.000Z";

function rec(over: Partial<UdhariRecord>): UdhariRecord {
  return {
    id: over.id ?? "u1",
    userId: "user1",
    personName: over.personName ?? "Rahul",
    phone: over.phone,
    type: over.type ?? "receivable",
    amount: over.amount ?? 1000,
    amountPaise: over.amountPaise ?? rupeesToPaise(over.amount ?? 1000),
    givenDate: over.givenDate ?? now,
    dueDate: over.dueDate,
    status: over.status ?? "open",
    amountSettled: over.amountSettled ?? 0,
    amountSettledPaise: over.amountSettledPaise ?? rupeesToPaise(over.amountSettled ?? 0),
    reminderOn: over.reminderOn ?? 1,
    context: over.context ?? "friend",
    createdAt: now,
    updatedAt: now,
    isDeleted: 0,
    version: 1,
    tags: [],
    notes: "",
    ...over,
  } as UdhariRecord;
}

describe("udhariEngine", () => {
  it("calculates remaining amount in paise", () => {
    expect(udhariRemainingPaise(rec({ amount: 1000, amountSettled: 250 }))).toBe(rupeesToPaise(750));
  });

  it("groups person ledger with receivable, payable, net, phone hash, overdue, and risk", () => {
    const rows = buildUdhariPeopleIntel(
      [
        rec({ id: "r1", personName: "Rahul", phone: "+91 99999 11111", type: "receivable", amount: 10_000, dueDate: "2026-04-01T00:00:00.000Z" }),
        rec({ id: "p1", personName: "Rahul", phone: "+91 99999 11111", type: "payable", amount: 2_000 }),
      ],
      [],
      new Date("2026-05-14T00:00:00.000Z"),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].displayName).toBe("Rahul");
    expect(rows[0].phoneHash).toBe(opaquePhoneHash("+91 99999 11111"));
    expect(rows[0].totalReceivablePaise).toBe(rupeesToPaise(10_000));
    expect(rows[0].totalPayablePaise).toBe(rupeesToPaise(2_000));
    expect(rows[0].netPaise).toBe(rupeesToPaise(8_000));
    expect(rows[0].overdueAmountPaise).toBe(rupeesToPaise(10_000));
    expect(rows[0].riskLevel).toBe("doubtful");
  });

  it("uses required ageing buckets: 0-7, 8-30, 31-90, 90+", () => {
    const rows = buildUdhariPeopleIntel(
      [
        rec({ id: "n", amount: 100, dueDate: "2026-05-10T00:00:00.000Z" }),
        rec({ id: "w", amount: 200, dueDate: "2026-05-01T00:00:00.000Z" }),
        rec({ id: "r", amount: 300, dueDate: "2026-03-01T00:00:00.000Z" }),
        rec({ id: "d", amount: 400, dueDate: "2026-01-01T00:00:00.000Z" }),
      ],
      [],
      new Date("2026-05-14T00:00:00.000Z"),
    );
    const buckets = Object.fromEntries(rows[0].ageingBuckets.map((b) => [b.label, b.amountPaise]));
    expect(buckets.normal_0_7).toBe(rupeesToPaise(100));
    expect(buckets.watch_8_30).toBe(rupeesToPaise(200));
    expect(buckets.risky_31_90).toBe(rupeesToPaise(300));
    expect(buckets.doubtful_90_plus).toBe(rupeesToPaise(400));
  });

  it("generates polite, firm, business, and Hinglish reminder templates", () => {
    const r = rec({ personName: "Amit", amount: 1200, dueDate: "2026-05-01T00:00:00.000Z" });
    expect(buildUdhariWhatsAppReminder(r, rupeesToPaise(1200), "polite")).toContain("Could you help close");
    expect(buildUdhariWhatsAppReminder(r, rupeesToPaise(1200), "firm")).toContain("earliest possible date");
    expect(buildUdhariWhatsAppReminder(r, rupeesToPaise(1200), "business")).toContain("expected settlement date");
    expect(buildUdhariWhatsAppReminder(r, rupeesToPaise(1200), "hinglish")).toContain("pending hai");
  });

  it("requires a write-off reason", () => {
    expect(validateWriteOffReason("")).toBe("Write-off reason is required.");
    expect(validateWriteOffReason("waived")).toBeNull();
  });
});
