/**
 * Phase 3 — paise integer money tests.
 *
 * Locks in the round-trip behaviour of rupeesToPaise / paiseToRupees, the
 * EMI formula returning paise, and the formatter producing locale-correct
 * INR strings without float artifacts.
 */
import { describe, it, expect } from "vitest";
import {
  rupeesToPaise,
  paiseToRupees,
  assertValidPaise,
  formatMoney,
  addMoney,
  subtractMoney,
  parseMoneyInputToPaise,
  safeParseMoneyInput,
  calculateEMI,
} from "@/utils/money";

describe("Phase 3 — rupeesToPaise / paiseToRupees", () => {
  it("403.99 → 40399", () => {
    expect(rupeesToPaise(403.99)).toBe(40399);
  });
  it("0.01 rupees becomes 1 paise", () => {
    expect(rupeesToPaise(0.01)).toBe(1);
    expect(parseMoneyInputToPaise("0.01", { allowZero: false })).toBe(1);
  });
  it("438.63 → 43863", () => {
    expect(rupeesToPaise(438.63)).toBe(43863);
  });
  it("normalizes the canonical 0.1 + 0.2 float bug", () => {
    // The classic 0.30000000000000004 case must round to 30 paise.
    expect(rupeesToPaise(0.1 + 0.2)).toBe(30);
  });
  it("round-trips integer paise back to clean rupees", () => {
    expect(paiseToRupees(40399)).toBe(403.99);
    expect(paiseToRupees(100)).toBe(1);
    expect(paiseToRupees(0)).toBe(0);
  });
  it("absorbs string input", () => {
    expect(rupeesToPaise("12.50")).toBe(1250);
    expect(rupeesToPaise(null)).toBe(0);
    expect(rupeesToPaise(undefined)).toBe(0);
    expect(rupeesToPaise("garbage")).toBe(0);
  });
});

describe("Phase 3 — assertValidPaise", () => {
  it("accepts non-negative integers within range", () => {
    expect(() => assertValidPaise(0)).not.toThrow();
    expect(() => assertValidPaise(1)).not.toThrow();
    expect(() => assertValidPaise(100_000_00)).not.toThrow();
  });
  it("rejects decimals, negatives, NaN, infinity", () => {
    expect(() => assertValidPaise(10.5)).toThrow();
    expect(() => assertValidPaise(-1)).toThrow();
    expect(() => assertValidPaise(NaN)).toThrow();
    expect(() => assertValidPaise(Number.POSITIVE_INFINITY)).toThrow();
  });
  it("rejects absurdly large values (>1e15)", () => {
    expect(() => assertValidPaise(1_000_000_000_000_001)).toThrow();
  });
});

describe("Phase 3 — formatMoney", () => {
  it("formats 40399 paise as ₹403.99 (no float trail)", () => {
    const s = formatMoney(40399);
    // Strip non-breaking spaces and currency symbol variation across runtimes.
    const normalized = s.replace(/ /g, " ").replace(/\s+/g, "");
    expect(normalized).toMatch(/^₹403\.99$/);
  });
  it("formats 43863 paise as ₹438.63", () => {
    const s = formatMoney(43863).replace(/ /g, " ").replace(/\s+/g, "");
    expect(s).toMatch(/^₹438\.63$/);
  });
});

describe("Phase 3 — addMoney / subtractMoney are integer-only", () => {
  it("sums only valid integer paise", () => {
    expect(addMoney(40399, 43863, 100)).toBe(84362);
  });
  it("silently drops non-integer parts", () => {
    expect(addMoney(100, 99.99 as number, 50)).toBe(150);
  });
  it("subtractMoney works", () => {
    expect(subtractMoney(50000, 12345)).toBe(37655);
  });
});

describe("Phase 3 — safeParseMoneyInput tolerates user input", () => {
  it("strips ₹, Rs, INR, commas, and whitespace", () => {
    expect(safeParseMoneyInput("₹1,234.50")).toBe(123450);
    expect(safeParseMoneyInput(" Rs 12 ")).toBe(1200);
    expect(safeParseMoneyInput("12,34.56")).toBe(123456); // comma-as-thousands
    expect(safeParseMoneyInput("garbage")).toBe(0);
    expect(safeParseMoneyInput(403.99)).toBe(40399);
  });
  it("normalizes legacy float-dust rupee payloads when rounding is explicit", () => {
    expect(parseMoneyInputToPaise("285.5699999999", { allowRounding: true })).toBe(28557);
  });
  it("rejects invalid import money when strict mode is requested", () => {
    expect(() =>
      safeParseMoneyInput("0.001", {
        allowZero: false,
        allowRounding: false,
        throwOnInvalid: true,
      }),
    ).toThrow(/2 decimal/);
    expect(() =>
      safeParseMoneyInput("285.5699999999", {
        allowZero: false,
        allowRounding: false,
        throwOnInvalid: true,
      }),
    ).toThrow(/2 decimal/);
    expect(() =>
      safeParseMoneyInput("-1", {
        allowZero: false,
        allowRounding: false,
        throwOnInvalid: true,
      }),
    ).toThrow(/non-negative/);
    expect(() =>
      safeParseMoneyInput("garbage", {
        allowZero: false,
        allowRounding: false,
        throwOnInvalid: true,
      }),
    ).toThrow(/valid rupee/);
  });
});

describe("Phase 3 — calculateEMI in paise", () => {
  it("textbook P=100000 r=12% n=24 → ~₹4707.35 in paise", () => {
    // 100000 rupees = 10_000_000 paise. Expected ≈ 4707.35 rupees = 470735 paise.
    const emiPaise = calculateEMI(10_000_000, 12, 24);
    expect(emiPaise).toBeGreaterThanOrEqual(470730);
    expect(emiPaise).toBeLessThanOrEqual(470740);
  });
  it("0% interest → simple division", () => {
    // 120000 rupees / 12 months → 10000 rupees → 1_000_000 paise
    expect(calculateEMI(12_000_000, 0, 12)).toBe(1_000_000);
  });
  it("0 principal or 0 tenure → 0", () => {
    expect(calculateEMI(0, 12, 24)).toBe(0);
    expect(calculateEMI(10_000_000, 12, 0)).toBe(0);
  });
});
