#!/usr/bin/env node
/**
 * vNext Phase B — finance ledger gate
 */
import { runGate, fileExists, fileContains, vitestFile } from "./lib/gate-runner.mjs";

const checks = [
  fileExists("src/services/financeKpiEngine.ts", "financeKpiEngine present"),
  fileExists("src/services/transactionIntent.ts", "transactionIntent present"),
  fileExists("docs/finance-vnext/CALCULATION_REFERENCE.md", "calculation reference doc"),
  fileExists("docs/finance-vnext/TRANSACTION_CLASSIFICATION_MATRIX.md", "classification matrix doc"),
  fileContains(
    "src/services/financeEventBuilder.ts",
    /expense_category.*decrease.*expense/s,
    "bank refund contra-expense in ledger builder",
  ),
  fileContains("src/services/calculations.ts", /INCOME_TYPES.*\["income"\]/, "refund removed from income types"),
  fileContains("src/components/pages/DashboardPage.tsx", /Operating surplus/, "dashboard uses operating surplus label"),
  vitestFile("src/services/__tests__/financeKpiEngine.test.ts", "finance KPI tests"),
  vitestFile("src/services/__tests__/financeInvariants.test.ts", "finance invariant tests"),
  vitestFile("src/services/__tests__/ledger.scenarios.test.ts", "ledger scenario tests"),
];

await runGate({
  phase: "B-vNext",
  title: "Ledger & KPI semantics (vNext Phase B)",
  outPath: "PHASE_B_VNEXT_COMPLETION_REPORT.md",
  manualCheckboxes: [
    "Dashboard shows True income, Consumption expense, Operating surplus.",
    "Bank refund on Expenses page reduces category spend, not income.",
  ],
  checks,
});
