#!/usr/bin/env node
import { runGate, fileExists, vitestFile } from "./lib/gate-runner.mjs";

await runGate({
  phase: "ALL-vNext",
  title: "Aggregate finance gates (vNext Phase L)",
  outPath: "docs/certification/PHASE_L_VNEXT_FINANCE_GATE_REPORT.md",
  checks: [
    fileExists("src/services/financeKpiEngine.ts", "Phase B KPI engine"),
    fileExists("src/services/transactionIntent.ts", "Phase C intent"),
    fileExists("src/services/cardStatementEngine.ts", "Phase D statements"),
    fileExists("src/services/cardEmiEngine.ts", "Phase E EMI"),
    fileExists("src/services/obligationEngine.ts", "Phase F obligations"),
    fileExists("src/components/pages/HouseholdDashboardPage.tsx", "Phase G household"),
    fileExists("src/components/pages/ReconciliationPage.tsx", "Phase I reconciliation"),
    fileExists("src/i18n/messages/en.ts", "Phase J i18n"),
    fileExists("src/services/adaptiveModeEngine.ts", "Phase J adaptive mode"),
    fileExists("src/services/alertPriority.ts", "Phase K alert priority"),
    fileExists("docs/certification/SPAROWVAULT_VNEXT_FINANCE_CERTIFICATION.md", "Phase L certification"),
    vitestFile("src/services/__tests__/financeKpiEngine.test.ts", "KPI tests"),
    vitestFile("src/services/__tests__/transferReceivedMoney.test.ts", "transfer tests"),
    vitestFile("src/services/__tests__/cardEngine.test.ts", "card tests"),
    vitestFile("src/services/__tests__/cardEmiEngine.test.ts", "EMI golden tests"),
    vitestFile("src/services/__tests__/cardEmiLifecycle.t126.test.ts", "T-126 lifecycle"),
    vitestFile("src/services/__tests__/acceptanceMatrix.test.ts", "acceptance matrix"),
    vitestFile("tests/unit/financeCrossView.test.ts", "cross-view"),
    vitestFile("src/services/__tests__/obligationEngine.test.ts", "obligation tests"),
    vitestFile("src/services/__tests__/financeInvariants.test.ts", "invariant tests"),
    vitestFile("src/services/__tests__/adaptiveModeEngine.test.ts", "adaptive mode tests"),
  ],
});
