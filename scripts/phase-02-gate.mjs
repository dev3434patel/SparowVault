#!/usr/bin/env node
/**
 * PHASE 2 GATE — CI + calculation test coverage.
 *
 * Brief: tests/CI must exist for calculations, alerts, and money-touching flows.
 * Run via `npm run phase:02:gate`.
 */
import {
  runGate, fileExists, fileContains, vitestFile, npm,
} from "./lib/gate-runner.mjs";

const checks = [
  // CI presence
  fileExists(".github/workflows/ci.yml", "CI workflow present"),
  fileContains(".github/workflows/ci.yml", /typecheck/,                  "CI runs typecheck"),
  fileContains(".github/workflows/ci.yml", /run lint/,                   "CI runs lint"),
  fileContains(".github/workflows/ci.yml", /run test/,                   "CI runs vitest"),
  fileContains(".github/workflows/ci.yml", /check:php|check-php-syntax\.mjs/, "CI runs PHP syntax check"),
  fileContains(".github/workflows/ci.yml", /run build/,                  "CI runs build"),
  fileContains(".github/workflows/ci.yml", /required:|All required/,     "CI has a required job that fails on any failure"),

  // Required test surfaces from the Phase 2 brief
  fileExists("src/services/__tests__/calculations.characterization.test.ts", "calculations characterization test"),
  fileExists("src/services/__tests__/loanEngine.test.ts",     "loan engine test"),
  fileExists("src/services/__tests__/cardEngine.test.ts",     "card engine test"),
  fileExists("src/services/__tests__/phase10Engines.test.ts", "goal/cashflow/budget engines test"),
  fileExists("tests/unit/suggestionEngine.test.ts",           "suggestion engine test"),
  fileExists("tests/unit/categoryColorEngine.test.ts",        "category color engine test"),
  fileExists("src/services/__tests__/transactionFormRules.test.ts", "transaction form rules test"),
  fileExists("src/services/__tests__/accountBalanceEngine.test.ts", "account balance engine test"),
  fileExists("src/config/syncContracts.ts",                   "sync contract registry source"),
  fileExists("src/config/syncContracts.generated.json",       "sync contract generated JSON"),
  fileExists("tests/unit/phase-02-sync-contracts.test.ts",    "sync contract drift test"),

  // Actually run the relevant tests
  vitestFile("src/services/__tests__/calculations.characterization.test.ts", "vitest: calculations"),
  vitestFile("src/services/__tests__/loanEngine.test.ts",   "vitest: loanEngine"),
  vitestFile("src/services/__tests__/cardEngine.test.ts",   "vitest: cardEngine"),
  vitestFile("src/services/__tests__/phase10Engines.test.ts","vitest: phase10 engines"),
  vitestFile("tests/unit/phase-02-sync-contracts.test.ts",   "vitest: sync contract drift"),

  // Health surfaces
  { section: "RUN", name: "npm run typecheck",  async run() { const r = await npm(["run", "typecheck"]);  return { status: r.ok ? "pass" : "fail", detail: `exit ${r.code}` }; } },
  { section: "RUN", name: "npm run lint",       async run() { const r = await npm(["run", "lint"]);       return { status: r.ok ? "pass" : "fail", detail: `exit ${r.code}` }; } },
  { section: "RUN", name: "npm run test",       async run() { const r = await npm(["run", "test", "--", "--reporter=basic"]); return { status: r.ok ? "pass" : "fail", detail: `exit ${r.code}` }; } },
  { section: "RUN", name: "npm run check:php",  async run() { const r = await npm(["run", "check:php"]);  return { status: r.ok ? "pass" : "fail", detail: `exit ${r.code}` }; } },
  { section: "RUN", name: "npm run check:sql",  async run() { const r = await npm(["run", "check:sql"]);  return { status: r.ok ? "pass" : "fail", detail: `exit ${r.code}` }; } },
];

const manual = [
  "Push a branch with a deliberately failing test (e.g., `expect(2).toBe(3)` somewhere). Confirm GitHub Actions blocks merge.",
  "Add income, expense, budget, goal, loan, card in the local app — confirm visible numbers match the unit-test expectations.",
];

await runGate({
  phase: 2,
  title: "CI, calculation tests, developer discipline",
  outPath: "PHASE_02_COMPLETION_REPORT.md",
  manualCheckboxes: manual,
  checks,
});
