#!/usr/bin/env node
import { runGate, fileExists, vitestFile } from "./lib/gate-runner.mjs";

await runGate({
  phase: "G-vNext",
  title: "Household finance (vNext Phase G)",
  outPath: "PHASE_G_VNEXT_COMPLETION_REPORT.md",
  checks: [
    fileExists("src/components/pages/HouseholdDashboardPage.tsx", "HouseholdDashboard"),
    fileExists("docs/finance-vnext/HOUSEHOLD_FINANCE_MODEL.md", "household docs"),
    vitestFile("src/services/__tests__/acceptanceMatrix.test.ts", "T-140 household transfer"),
  ],
});
