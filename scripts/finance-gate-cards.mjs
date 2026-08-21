#!/usr/bin/env node
import { runGate, fileExists, vitestFile } from "./lib/gate-runner.mjs";

await runGate({
  phase: "D-vNext",
  title: "Multi-credit-card core (vNext Phase D)",
  outPath: "PHASE_D_VNEXT_COMPLETION_REPORT.md",
  checks: [
    fileExists("src/services/cardStatementEngine.ts", "cardStatementEngine"),
    fileExists("src/services/cardPaymentAllocator.ts", "cardPaymentAllocator"),
    vitestFile("src/services/__tests__/cardEngine.test.ts", "card engine tests"),
  ],
});
