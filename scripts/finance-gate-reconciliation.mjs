#!/usr/bin/env node
import { runGate, fileExists, vitestFile } from "./lib/gate-runner.mjs";

await runGate({
  phase: "I-vNext",
  title: "Reconciliation & sync outbox (vNext Phase I)",
  outPath: "PHASE_I_VNEXT_COMPLETION_REPORT.md",
  checks: [
    fileExists("src/services/reconciliationEngine.ts", "reconciliationEngine"),
    fileExists("src/services/syncOutbox.ts", "syncOutbox"),
    fileExists("src/components/pages/ReconciliationPage.tsx", "ReconciliationPage"),
    fileExists("docs/finance-vnext/RECONCILIATION_AND_PROVENANCE.md", "recon docs"),
  ],
});
