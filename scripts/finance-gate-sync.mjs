#!/usr/bin/env node
import { runGate, fileExists } from "./lib/gate-runner.mjs";

await runGate({
  phase: "SYNC-vNext",
  title: "Sync outbox (vNext)",
  outPath: "PHASE_SYNC_VNEXT_COMPLETION_REPORT.md",
  checks: [
    fileExists("src/services/syncOutbox.ts", "syncOutbox"),
    fileExists("src/config/syncContracts.ts", "sync contracts include vNext collections"),
  ],
});
