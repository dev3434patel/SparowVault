#!/usr/bin/env node
/**
 * PHASE 7 GATE - Loan, EMI, and debt premium engine.
 */
import { runGate, fileContains, fileExists, vitestFile } from "./lib/gate-runner.mjs";

const checks = [
  fileExists("src/services/loanEngine.ts", "loan engine present"),
  fileContains("src/services/loanEngine.ts", /LoanInterestType|loanInterestType/, "interest type support"),
  fileContains("src/services/loanEngine.ts", /This loan is calculated using reducing balance method\./, "reducing balance label"),
  fileContains("src/services/loanEngine.ts", /buildEmiPaymentIntelligence/, "EMI payment intelligence"),
  fileContains("src/services/loanEngine.ts", /pendingPaise/, "partial EMI pending amount"),
  fileContains("src/services/loanEngine.ts", /simulatePrepaymentOptions/, "prepayment simulator options"),
  fileContains("src/services/loanEngine.ts", /optionReduceTenure/, "reduce tenure option"),
  fileContains("src/services/loanEngine.ts", /optionReduceEmi/, "reduce EMI option"),
  fileContains("src/services/loanEngine.ts", /calculateForeclosureBreakdown/, "foreclosure breakdown"),
  fileContains("src/services/loanEngine.ts", /importedLoanConfidence/, "imported loan confidence"),
  fileContains("src/services/loanEngine.ts", /buildDebtSummary/, "debt summary engine"),
  fileContains("src/types/index.ts", /LoanInterestType/, "loan interest type model"),
  fileContains("src/types/index.ts", /moratorium/, "premium EMI statuses"),
  fileContains("src/components/pages/LoansPage.tsx", /Debt summary/, "debt summary UI"),
  fileContains("src/components/pages/LoansPage.tsx", /Option A reduce tenure/, "prepayment option A UI"),
  fileContains("src/components/pages/LoansPage.tsx", /Option B reduce EMI/, "prepayment option B UI"),
  fileContains("src/components/pages/LoansPage.tsx", /Foreclosure estimate/, "foreclosure UI"),
  fileContains("src/components/pages/LoansPage.tsx", /Imported loan confidence/, "imported wizard confidence UI"),
  fileExists("src/services/__tests__/loanEngine.test.ts", "loan engine tests"),
  vitestFile("src/services/__tests__/loanEngine.test.ts", "vitest: loan engine"),
];

const manual = [
  "Create a fresh reducing-balance loan and confirm the UI labels it as reducing-balance.",
  "Create an ongoing/imported loan with current outstanding, EMI, due day, and completed/remaining EMI values; confirm confidence is high when outstanding is known.",
  "Record a partial EMI: scheduled 8500, paid 5000. Confirm status remains partial and pending 3500 is visible/risk-highlighted.",
  "Run a prepayment amount and compare Option A reduce tenure vs Option B reduce EMI.",
  "Open foreclosure estimate and confirm principal, accrued interest, charges, final closure amount, and NOC reminder.",
  "Debt summary includes loan outstanding, card outstanding, udhari payable, total debt, EMI burden, and high-interest priority.",
];

await runGate({
  phase: 7,
  title: "Loan, EMI, and debt premium engine",
  outPath: "PHASE_07_COMPLETION_REPORT.md",
  manualCheckboxes: manual,
  checks,
});
