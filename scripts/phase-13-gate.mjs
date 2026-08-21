#!/usr/bin/env node
/**
 * PHASE 13 GATE — Privacy, compliance, user audit, retention.
 */
import { runGate, fileExists, fileContains } from "./lib/gate-runner.mjs";

const checks = [
  fileExists("sql/migrations/phase_13_privacy_audit.sql", "migration present"),
  fileExists("sql/migrations/phase_13_privacy_audit_rollback.sql", "rollback present"),
  fileContains("sql/migrations/phase_13_privacy_audit.sql", /user_policy_acceptances/, "user_policy_acceptances table"),
  fileContains("sql/migrations/phase_13_privacy_audit.sql", /user_audit_logs/, "user_audit_logs table"),
  fileContains("sql/migrations/phase_13_privacy_audit.sql", /retention_jobs/, "retention_jobs table"),

  fileExists("php/helpers/policy.php", "policy helper"),
  fileExists("php/helpers/user_audit.php", "user_audit helper"),
  fileExists("php/controllers/policies.php", "policies controller"),
  fileExists("api/policies/current.php", "GET /api/policies/current.php"),
  fileExists("api/policies/accept.php", "POST /api/policies/accept.php"),
  fileExists("scripts/retention-sweeper.php", "retention sweeper script"),

  fileContains("php/helpers/policy.php", /policy_current_versions/, "policy_current_versions exported"),
  fileContains("php/helpers/policy.php", /policy_user_outstanding_keys/, "policy_user_outstanding_keys exported"),
  fileContains("php/helpers/user_audit.php", /user_audit_log\b/, "user_audit_log exported"),
];

const manual = [
  "Apply sql/migrations/phase_13_privacy_audit.sql to the test DB.",
  "Register a new user — UI must surface the four policy keys (terms, privacy, cookie, data_processing) from GET /api/policies/current.php and require acceptance before continuing.",
  "Confirm `user_policy_acceptances` has 4 rows for that user with the current versions.",
  "Bump one version in `policy_current_versions()` (e.g. `terms`). On next login, GET /api/policies/current.php must list `terms` in `outstanding`.",
  "POST /api/policies/accept.php with `{accept: [{key:'terms', version:'<new>'}]}` — confirm the row in user_policy_acceptances updates and `user_audit_logs` has a `POLICY_ACCEPTED` row.",
  "PIN change → user_audit_logs has `PIN_CHANGED` row with ip_address + user_agent populated.",
  "Self-service data export (/api/auth/data-export.php) writes `ACCOUNT_DATA_EXPORTED` audit row.",
  "Self-service delete (/api/auth/account.php) writes `ACCOUNT_DELETED` audit row.",
  "Run `php scripts/retention-sweeper.php --dry-run` — reports row counts for all 6 jobs without deleting.",
  "Run `php scripts/retention-sweeper.php` — confirm retention_jobs has a row per job with status='ok'.",
  "Add a cron entry (or document one) running the sweeper nightly.",
];

await runGate({
  phase: 13,
  title: "Privacy, compliance, audit, retention",
  outPath: "PHASE_13_COMPLETION_REPORT.md",
  manualCheckboxes: manual,
  checks,
});
