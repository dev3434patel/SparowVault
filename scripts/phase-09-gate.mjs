#!/usr/bin/env node
/**
 * PHASE 9 GATE — Udhari engine.
 */
import { runGate, fileExists, fileContains, vitestFile } from "./lib/gate-runner.mjs";

const checks = [
  fileExists("sql/migrations/phase_09_udhari_engine.sql", "migration: udhari engine"),
  fileContains("sql/migrations/phase_09_udhari_engine.sql", /udhari_people|udhari_entries|udhari_settlements/, "udhari tables defined"),
  fileContains("sql/migrations/phase_09_udhari_engine.sql", /total_receivable_paise|total_payable_paise/, "receivable/payable totals"),

  fileExists("src/services/udhariEngine.ts", "udhariEngine module"),
  fileExists("src/components/pages/UdhariPage.tsx", "Udhari page wired"),

  // The Phase 5 scenarios test already covers given/received "not expense/income" semantics:
  vitestFile("src/services/__tests__/ledger.scenarios.test.ts", "vitest: ledger scenarios (udhari rules)"),
];

const manual = [
  "Apply sql/migrations/phase_09_udhari_engine.sql to the test DB.",
  "Give ₹1,000 to Rahul: account −₹1,000; Rahul receivable +₹1,000; expense unchanged.",
  "Rahul repays ₹400: account +₹400; receivable for Rahul = ₹600.",
  "Borrow ₹1,000 from Amit: account +₹1,000; payable +₹1,000; income unchanged.",
  "Repay Amit ₹1,000: account −₹1,000; payable = 0.",
  "Write off ₹600 against Rahul: receivable = 0; expense (bad debt / personal loss) +₹600.",
  "Open Udhari page → overdue + ageing badges render; WhatsApp reminder text generates with the right name and amount.",
];

await runGate({
  phase: 9,
  title: "Udhari receivable/payable engine",
  outPath: "PHASE_09_COMPLETION_REPORT.md",
  manualCheckboxes: manual,
  checks,
});
