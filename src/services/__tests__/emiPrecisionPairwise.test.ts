/**
 * Controlled EMI precision matrix — pairwise rates × tenures × principals (not full Cartesian).
 */
import { describe, it, expect } from "vitest";
import { buildCardEmiSchedule } from "@/services/cardEmiEngine";

const RATES = [0, 1, 750, 1200, 1800, 3600]; // bps
const TENURES = [1, 3, 6, 12, 24, 36];
const PRINCIPALS = [1, 999_99, 60_000_00, 1_00_000_00];

describe("emiPrecisionPairwise", () => {
  it("every pairwise sample: sum principal = exact; final balance 0; no NaN", () => {
    let cases = 0;
    for (let i = 0; i < RATES.length; i++) {
      for (let j = 0; j < TENURES.length; j++) {
        // Pairwise-ish: rotate principals
        const principalPaise = PRINCIPALS[(i + j) % PRINCIPALS.length]!;
        const annualRateBps = RATES[i]!;
        const tenureMonths = TENURES[j]!;
        if (principalPaise < 1) continue;
        const rows = buildCardEmiSchedule({
          planId: `p_${i}_${j}`,
          userId: "u1",
          principalPaise,
          annualRateBps,
          tenureMonths,
          startDate: "2026-01-15",
        });
        cases++;
        expect(rows.length).toBe(tenureMonths);
        const sumPrincipal = rows.reduce((s, r) => s + r.principalPaise, 0);
        expect(sumPrincipal).toBe(principalPaise);
        expect(rows[rows.length - 1]!.closingPrincipalPaise).toBe(0);
        for (const r of rows) {
          expect(Number.isFinite(r.emiPaise)).toBe(true);
          expect(Number.isFinite(r.interestPaise)).toBe(true);
          expect(Number.isInteger(r.emiPaise)).toBe(true);
          expect(r.emiPaise).toBeGreaterThanOrEqual(0);
        }
      }
    }
    expect(cases).toBe(RATES.length * TENURES.length);
  });
});
