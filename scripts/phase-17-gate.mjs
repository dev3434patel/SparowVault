#!/usr/bin/env node
/**
 * PHASE 17 GATE — Staging, monitoring, backup, launch readiness.
 */
import { runGate, fileExists, fileContains } from "./lib/gate-runner.mjs";

const checks = [
  fileExists("api/health.php", "/api/health.php"),
  fileExists("php/helpers/request_id.php", "request_id helper"),
  fileContains("php/helpers/request_id.php", /ensure_request_id/, "ensure_request_id exported"),
  fileContains("php/helpers/request_id.php", /structured_log/, "structured_log exported"),
  fileContains("php/bootstrap_api.php", /ensure_request_id/, "bootstrap calls ensure_request_id"),

  fileContains("php/controllers/public_config.php", /schema_version/, "/health reports schema_version"),
  fileContains("php/controllers/public_config.php", /db.+latencyMs/, "/health reports DB latency"),
  fileContains("php/controllers/public_config.php", /razorpayEnabled/, "/health reports razorpayEnabled"),

  fileExists("scripts/restore-drill.mjs", "restore-drill script"),
  fileExists("docs/launch-checklist.md", "launch checklist"),
  fileExists("docs/staging-setup.md", "staging setup doc"),
  fileExists("docs/backup-checklist.md", "backup checklist (Phase 0 carryover)"),
  fileExists("docs/incident-playbook.md", "incident playbook"),
  fileExists(".github/workflows/ci.yml", "CI present (Phase 2)"),
];

const manual = [
  "Hit /api/health.php — response includes status, appEnv, version (schema_version), razorpayEnabled, db.latencyMs, requestId, time.",
  "Inspect response headers — `X-Request-Id` is set on every API response (including errors).",
  "Trigger one error — log line is JSON one-per-line; `pin`, `password`, `token` keys are scrubbed.",
  "Set up a staging subdomain per docs/staging-setup.md. Confirm it uses its own DB + Razorpay TEST keys.",
  "Run scripts/restore-drill.mjs against last night's encrypted backup → completes successfully.",
  "Walk docs/launch-checklist.md end-to-end. Every box ticked.",
  "Cron entries:",
  "  • nightly: php scripts/backup_db.php (existing) + scp to off-host bucket",
  "  • nightly: php scripts/retention-sweeper.php",
  "  • every 5 min: external uptime monitor pings /api/health.php",
  "Verify no production secrets in any deployed artifact with the Phase 1 secret scan.",
];

await runGate({
  phase: 17,
  title: "Staging, monitoring, backup, launch readiness",
  outPath: "PHASE_17_COMPLETION_REPORT.md",
  manualCheckboxes: manual,
  checks,
});
