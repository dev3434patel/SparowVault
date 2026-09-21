import { defineConfig } from "vitest/config";
import path from "node:path";

// Phase 0 — minimal Vitest setup.
// Goals:
//  - run pure-function tests under src/services/__tests__/
//  - run fixture-based tests under tests/unit/
//  - DO NOT pull in DOM / Dexie / network. Those tiers get their own harness in later phases.
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: [
      "src/**/__tests__/**/*.test.ts",
      "tests/unit/**/*.test.ts",
    ],
    exclude: [
      "**/._*",
      "node_modules/**",
      "dist/**",
      "release/**",
      "tests/*-e2e.mjs",
      "tests/browser-*.mjs",
    ],
    reporters: ["default"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/services/**/*.ts", "src/lib/**/*.ts"],
      exclude: ["src/services/demoData.ts", "**/__tests__/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
    },
  },
});
