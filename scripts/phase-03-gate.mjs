#!/usr/bin/env node
/**
 * PHASE 3 GATE — Money as paise integers.
 */
import { runGate, fileExists, fileContains, vitestFile } from "./lib/gate-runner.mjs";

const checks = [
  // Code surfaces
  fileExists("src/utils/money.ts",                  "money utility module"),
  fileExists("src/utils/moneyEntityNormalize.ts",   "entity normalize helper"),
  fileExists("sql/migrations/phase_03_cloud_amount_paise.sql", "migration: cloud amount_paise"),

  // API contract
  fileContains("src/utils/money.ts", /export function rupeesToPaise/, "rupeesToPaise exported"),
  fileContains("src/utils/money.ts", /export function paiseToRupees/, "paiseToRupees exported"),
  fileContains("src/utils/money.ts", /export function assertValidPaise/, "assertValidPaise exported"),
  fileContains("src/utils/money.ts", /export function formatMoney/, "formatMoney exported"),
  fileContains("src/utils/money.ts", /export function addMoney/, "addMoney exported"),
  fileContains("src/utils/money.ts", /export function subtractMoney/, "subtractMoney exported"),
  fileContains("src/utils/money.ts", /export function safeParseMoneyInput/, "safeParseMoneyInput exported"),
  fileContains("php/controllers/payments.php", /captured_amount_paise/, "Razorpay captured amount stored as paise"),
  fileContains("sql/20260501_sql_only_full.sql", /captured_amount_paise/, "final SQL has captured_amount_paise"),

  // Types have paise mirrors
  fileContains("src/types/index.ts", /amountPaise\?:/, "Transaction.amountPaise present"),

  // Tests
  fileExists("src/utils/__tests__/money.test.ts", "money.test.ts present"),
  fileExists("tests/unit/phase-03-money-contract.test.ts", "PHP money contract test present"),
  vitestFile("src/utils/__tests__/money.test.ts", "vitest: money round-trip + EMI"),
  vitestFile("tests/unit/phase-03-money-contract.test.ts", "vitest: PHP money parser + hot-field precedence"),

  // Regression: phase 0 characterization still green
  vitestFile("src/services/__tests__/calculations.characterization.test.ts", "vitest: phase 0 characterization"),
];

const manual = [
  "Apply sql/migrations/phase_03_cloud_amount_paise.sql to the test DB. Run sql/migrations/phase_03_cloud_amount_paise_rollback.sql (if present) to verify it reverses cleanly.",
  "Open the local app, load a fixture user with an old `amount`-only transaction (e.g. 403.990000000000009). Confirm the UI renders ₹403.99 — no float trail.",
  "Push that transaction to cloud and verify `cloud_collection_rows.amount_paise` is populated with 40399.",
  "Open Excel export and confirm currency cells display ₹403.99 cleanly (no scientific notation, no 0.000…009 trailer).",
];

await runGate({
  phase: 3,
  title: "Money as paise integers",
  outPath: "PHASE_03_COMPLETION_REPORT.md",
  manualCheckboxes: manual,
  checks,
});
