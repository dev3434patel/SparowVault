#!/usr/bin/env node
/**
 * PHASE 14 GATE — SaaS billing fairness.
 */
import { runGate, fileExists, fileContains, vitestFile } from "./lib/gate-runner.mjs";

const checks = [
  fileExists("sql/migrations/phase_14_saas_billing.sql", "migration present"),
  fileExists("sql/migrations/phase_14_saas_billing_rollback.sql", "rollback present"),
  fileContains("sql/migrations/phase_14_saas_billing.sql", /plan_prices/, "plan_prices table"),
  fileContains("sql/migrations/phase_14_saas_billing.sql", /limit_value/, "plan_features.limit_value"),
  fileContains("sql/migrations/phase_14_saas_billing.sql", /previous_period_end/, "subscriptions.previous_period_end"),
  fileContains("sql/migrations/phase_14_saas_billing.sql", /scheduled_plan_id/, "subscriptions.scheduled_plan_id"),

  fileExists("php/helpers/billing.php", "billing helper"),
  fileContains("php/helpers/billing.php", /billing_renewal_start/, "billing_renewal_start exported"),
  fileContains("php/helpers/billing.php", /billing_active_price_paise/, "billing_active_price_paise exported"),
  fileContains("php/helpers/billing.php", /billing_user_quotas/, "billing_user_quotas exported"),
  fileContains("php/helpers/billing.php", /billing_user_has_feature/, "billing_user_has_feature exported"),

  fileExists("src/services/planFeatureGate.ts", "plan feature gate"),
  fileExists("src/services/__tests__/planFeatureGate.test.ts", "plan feature gate test"),
  vitestFile("src/services/__tests__/planFeatureGate.test.ts", "vitest: plan feature gate"),
];

const manual = [
  "Apply sql/migrations/phase_14_saas_billing.sql to the test DB.",
  "Free-tier user attempts /api/reports/ca/transaction-master (Phase 15 endpoint) → 403 with `lockReason` copy.",
  "Pro user accesses the same endpoint → 200.",
  "Subscribe to monthly plan. On day 25 of 30, renew. Verify `new_period_start = MAX(NOW(), current_period_end)` — user does NOT lose the 5 remaining days.",
  "Trigger a webhook with the wrong order_id → AMOUNT_MISMATCH (Phase 1 regression check).",
  "Trigger a webhook with the right order_id but wrong user — webhook still attributes to the original user (Phase 1 regression check).",
  "Send the same webhook event_id twice — second call returns idempotent.",
  "Schedule a plan downgrade — `scheduled_plan_id` and `scheduled_change_at` are written; downgrade activates only after current period_end.",
  "Admin assigns a plan via admin tools → admin_audit_logs row written.",
  "Locked feature in the UI surfaces an upgrade pill, not a blank page.",
];

await runGate({
  phase: 14,
  title: "SaaS billing fairness + feature gating",
  outPath: "PHASE_14_COMPLETION_REPORT.md",
  manualCheckboxes: manual,
  checks,
});
