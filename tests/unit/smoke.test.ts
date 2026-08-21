/**
 * PHASE 0 — Smoke test
 * Confirms the Vitest harness wires up correctly. Replace with real
 * fixture-driven tests in Phase 1+.
 */
import { describe, it, expect } from "vitest";

describe("vitest harness smoke", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });

  it("can import @/ alias", async () => {
    const mod = await import("@/services/calculations");
    expect(typeof mod.calculateEMI).toBe("function");
  }, 15000);
});
