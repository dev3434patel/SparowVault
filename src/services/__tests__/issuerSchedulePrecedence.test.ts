import { describe, it, expect } from "vitest";
import {
  pickAuthoritativeScheduleAmount,
  resolveEmiObligationPaise,
  scheduleSourceRank,
} from "@/services/issuerSchedulePrecedence";

describe("issuerSchedulePrecedence", () => {
  it("ranks issuer_actual above estimated and projected", () => {
    expect(scheduleSourceRank("issuer_actual")).toBeGreaterThan(scheduleSourceRank("user_confirmed"));
    expect(scheduleSourceRank("user_confirmed")).toBeGreaterThan(scheduleSourceRank("estimated"));
    expect(scheduleSourceRank("estimated")).toBeGreaterThan(scheduleSourceRank("projected"));
  });

  it("FCR-010 / P0-H: actual billed EMI wins over SparowVault projection", () => {
    const projectedPaise = 541_550; // ₹5,415.50
    const issuerActualPaise = 546_227; // ₹5,462.27
    const resolved = resolveEmiObligationPaise({
      projectedPaise,
      issuerActualPaise,
    });
    expect(resolved.amountPaise).toBe(issuerActualPaise);
    expect(resolved.source).toBe("issuer_actual");
    expect(resolved.projectedPreservedPaise).toBe(projectedPaise);
  });

  it("user_confirmed beats estimate when no issuer actual", () => {
    const picked = pickAuthoritativeScheduleAmount([
      { source: "estimated", amountPaise: 100 },
      { source: "user_confirmed", amountPaise: 120 },
      { source: "projected", amountPaise: 90 },
    ]);
    expect(picked?.amountPaise).toBe(120);
    expect(picked?.source).toBe("user_confirmed");
  });
});
