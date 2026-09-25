import { describe, expect, it } from "vitest";
import { STATUS_TONE, type BadgeStatus } from "@/company/components/PageChrome";

/** Every BadgeStatus member. A missing key must fail here, not via a substring or neutral fallback. */
const ALL_BADGE_STATUSES: BadgeStatus[] = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "POSTED",
  "REJECTED",
  "CANCELLED",
  "REVERSED",
  "ACTIVE",
  "INACTIVE",
  "INVITED",
  "SUSPENDED",
  "PENDING",
  "SETTLED",
  "PARTIAL",
  "OVERDUE",
  "OPEN",
  "CLOSED",
];

const TONES = ["success", "warn", "danger", "neutral", "info"] as const;

describe("StatusBadge tone map", () => {
  it("gives every union member its own tone", () => {
    expect(Object.keys(STATUS_TONE).sort()).toEqual([...ALL_BADGE_STATUSES].sort());
    for (const status of ALL_BADGE_STATUSES) {
      expect(STATUS_TONE[status], status).toBeDefined();
      expect(TONES).toContain(STATUS_TONE[status]);
    }
  });

  it("keeps substring-overlapping statuses as separate keys", () => {
    expect(Object.prototype.hasOwnProperty.call(STATUS_TONE, "PENDING")).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(STATUS_TONE, "PENDING_APPROVAL")).toBe(true);
    expect(STATUS_TONE.PENDING).toBe("warn");
    expect(STATUS_TONE.PENDING_APPROVAL).toBe("warn");
    expect(STATUS_TONE.APPROVED).toBe("success");
    expect(STATUS_TONE.POSTED).toBe("success");
  });
});
