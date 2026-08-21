#!/usr/bin/env node
import { runGate, fileExists, vitestFile } from "./lib/gate-runner.mjs";

await runGate({
  phase: "F-vNext",
  title: "Obligations & sinking funds (vNext Phase F)",
  outPath: "PHASE_F_VNEXT_COMPLETION_REPORT.md",
  checks: [
    fileExists("src/services/obligationEngine.ts", "obligationEngine"),
    fileExists("src/services/sinkingFundEngine.ts", "sinkingFundEngine"),
    fileExists("src/components/pages/BillCalendarPage.tsx", "BillCalendarPage"),
    vitestFile("src/services/__tests__/obligationEngine.test.ts", "obligation tests"),
  ],
});
