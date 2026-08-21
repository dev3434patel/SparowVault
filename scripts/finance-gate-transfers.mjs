#!/usr/bin/env node
import { runGate, fileExists, vitestFile } from "./lib/gate-runner.mjs";

await runGate({
  phase: "C-vNext",
  title: "Transfer & received-money engine (vNext Phase C)",
  outPath: "PHASE_C_VNEXT_COMPLETION_REPORT.md",
  manualCheckboxes: [
    "Quick Add uses amount → direction → intent → form flow.",
    "Reimbursement settlement does not inflate true income.",
  ],
  checks: [
    fileExists("src/services/transactionIntent.ts", "transactionIntent"),
    fileExists("src/components/forms/QuickAddDialog.tsx", "QuickAddDialog"),
    vitestFile("src/services/__tests__/transferReceivedMoney.test.ts", "transfer/received-money tests"),
    vitestFile("src/services/__tests__/transactionFormRules.test.ts", "form rules"),
  ],
});
