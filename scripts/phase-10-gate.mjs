#!/usr/bin/env node
/**
 * PHASE 10 GATE - Goals, emergency fund, smart budgets, cashflow survival.
 */
import { runGate, fileExists, vitestFile } from "./lib/gate-runner.mjs";

const checks = [
  fileExists("src/services/goalEngine.ts", "goalEngine"),
  fileExists("src/services/emergencyFundEngine.ts", "emergencyFundEngine"),
  fileExists("src/services/smartBudgetEngine.ts", "smartBudgetEngine"),
  fileExists("src/services/cashflowSurvivalEngine.ts", "cashflowSurvivalEngine"),

  fileExists("src/services/__tests__/phase10Engines.test.ts", "phase 10 engines test"),
  fileExists("src/services/__tests__/goalEngine.test.ts", "goalEngine test"),
  fileExists("src/services/__tests__/emergencyFundEngine.test.ts", "emergencyFundEngine test"),
  fileExists("src/services/__tests__/smartBudgetEngine.test.ts", "smartBudgetEngine test"),
  fileExists("src/services/__tests__/cashflowSurvivalEngine.test.ts", "cashflowSurvivalEngine test"),

  vitestFile("src/services/__tests__/phase10Engines.test.ts", "vitest: phase 10 engines"),
  vitestFile("src/services/__tests__/goalEngine.test.ts", "vitest: goalEngine"),
  vitestFile("src/services/__tests__/emergencyFundEngine.test.ts", "vitest: emergencyFundEngine"),
  vitestFile("src/services/__tests__/smartBudgetEngine.test.ts", "vitest: smartBudgetEngine"),
  vitestFile("src/services/__tests__/cashflowSurvivalEngine.test.ts", "vitest: cashflowSurvivalEngine"),
  vitestFile("src/services/__tests__/calculations.characterization.test.ts", "vitest: characterization regression"),

  fileExists("src/components/pages/GoalsPage.tsx", "Goals page"),
  fileExists("src/components/pages/BudgetsPage.tsx", "Budgets page"),
  fileExists("src/components/pages/DashboardPage.tsx", "Dashboard page"),
];

const manual = [
  "Goal: target Rs 60,000, saved Rs 12,000, 12 months left -> monthly required Rs 4,000 (4,800,000 paise / 12 = 400,000 paise).",
  "Past-due goal (target date < today, saved < target): monthly required equals remaining (no divide-by-zero).",
  "Emergency fund: essential monthly expense Rs 20,000, fund Rs 10,000 -> coverage = 0.5 months. Shortfall correctly shown.",
  "Recurring-aware budget: rent Rs 15,000 paid on day 1, Rs 20,000 monthly budget -> engine MUST NOT project 30x rent on day 1. No false-panic alert.",
  "Cashflow: available Rs 7,200, card bill Rs 3,000 due in 4 days, 11 days till next salary -> safe daily spend target about Rs 381/day after card bill.",
  "Dashboard widget for safe daily spend uses plain-language copy with money left, days left, emergency status, budget risk, goal risk, and upcoming commitments.",
];

await runGate({
  phase: 10,
  title: "Goals, emergency fund, smart budgets, cashflow survival",
  outPath: "PHASE_10_COMPLETION_REPORT.md",
  manualCheckboxes: manual,
  checks,
});
