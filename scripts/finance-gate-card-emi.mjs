#!/usr/bin/env node
import { runGate, fileExists, vitestFile } from "./lib/gate-runner.mjs";

await runGate({
  phase: "E-vNext",
  title: "Card EMI engine (vNext Phase E)",
  outPath: "PHASE_E_VNEXT_COMPLETION_REPORT.md",
  checks: [
    fileExists("src/services/cardEmiEngine.ts", "cardEmiEngine"),
    fileExists("docs/finance-vnext/CARD_EMI_ENGINE.md", "CARD_EMI_ENGINE doc"),
    fileExists("src/components/finance/DataConfidenceBadge.tsx", "DataConfidenceBadge"),
    vitestFile("src/services/__tests__/cardEmiEngine.test.ts", "card EMI golden tests"),
    vitestFile("src/services/__tests__/cardEmiLifecycle.t126.test.ts", "T-126 lifecycle"),
  ],
});
