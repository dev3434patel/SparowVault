#!/usr/bin/env node
/**
 * PHASE 4 GATE - Financial event/effect ledger as source of truth.
 */
import { runGate, fileExists, fileContains } from "./lib/gate-runner.mjs";

const checks = [
  fileExists("src/services/financeEventBuilder.ts", "frontend ledger builder present"),
  fileExists("php/helpers/finance_events.php", "backend ledger builder present"),
  fileExists("src/services/ledgerCalculations.ts", "ledger calculation views present"),
  fileExists("src/services/ledgerDiagnostics.ts", "ledger diagnostics present"),
  fileContains("src/services/financeEventBuilder.ts", /case "loan_prepayment"/, "loan prepayment mapped"),
  fileContains("src/services/financeEventBuilder.ts", /case "goal_withdrawal"/, "goal withdrawal mapped"),
  fileContains("src/services/financeEventBuilder.ts", /case "investment_sell"/, "investment sell mapped"),
  fileContains("src/services/financeEventBuilder.ts", /return pm === "credit_card" \? "credit_card_purchase" : "expense"/, "ordinary expenses emit expense event"),
  fileContains("php/helpers/finance_events.php", /\$eventType = "expense";/, "backend ordinary expenses emit expense event"),
  fileContains("src/services/ledgerCalculations.ts", /calculateLedgerMonthKpis/, "ledger KPI view exists"),
  fileContains("src/services/ledgerCalculations.ts", /calculateIncomeView/, "ledger income view exists"),
  fileContains("src/services/ledgerDiagnostics.ts", /transactionsWithoutFinancialEvent/, "diagnostic checks missing transaction events"),
  fileContains("src/services/ledgerDiagnostics.ts", /eventsWithoutEffects/, "diagnostic checks empty events"),
  fileContains("src/services/ledgerDiagnostics.ts", /effectsWithInvalidTarget/, "diagnostic checks invalid targets"),
  fileContains("src/components/pages/DashboardPage.tsx", /calculateLedgerMonthKpis/, "dashboard uses ledger KPI view"),
  fileContains("src/components/pages/ReportsPage.tsx", /Ledger Coverage Diagnostic/, "reports expose ledger diagnostics"),
  fileContains("src/services/suggestionEngine.ts", /calculateCategorySpend/, "suggestions use ledger category spend"),
  fileContains("php/controllers/cloud_data.php", /transaction\.edit/, "transaction edit writes user audit log"),
  fileContains("php/controllers/cloud_data.php", /transaction\.delete/, "transaction delete writes user audit log"),
  fileContains("src/services/__tests__/ledger.scenarios.test.ts", /Investment sell/, "scenario tests cover investment sell"),
  fileContains("src/services/__tests__/ledger.scenarios.test.ts", /Loan prepayment/, "scenario tests cover loan prepayment"),
  fileContains("src/services/__tests__/ledger.scenarios.test.ts", /Goal withdrawal/, "scenario tests cover goal withdrawal"),
];

const manual = [
  "Run `npm run test -- src/services/__tests__/ledger.scenarios.test.ts` and confirm all 15 ledger mappings pass.",
  "Open Dashboard and confirm KPI header shows ledger source when ledger rows are loaded, otherwise transaction fallback.",
  "Open Reports and confirm Ledger Coverage Diagnostic renders counts for missing events/effects/targets.",
  "Edit a transaction and confirm its financial_event/effects are regenerated for the same source transaction.",
  "Delete a transaction and confirm its financial_event is marked reversed/deleted and effects are cleared.",
];

await runGate({
  phase: 4,
  title: "Financial event/effect ledger source of truth",
  outPath: "PHASE_04_COMPLETION_REPORT.md",
  manualCheckboxes: manual,
  checks,
});
