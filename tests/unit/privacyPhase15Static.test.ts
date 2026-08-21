import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

describe("Phase 15 privacy, audit, retention, support access", () => {
  it("requires Terms and Privacy acceptance at registration and stores versions", () => {
    const cloud = read("php/controllers/cloud.php");
    expect(cloud).toMatch(/policyAcceptances/);
    expect(cloud).toMatch(/POLICY_ACCEPTANCE_REQUIRED/);
    expect(cloud).toMatch(/foreach \(\["terms", "privacy"\] as \$requiredPolicy\)/);
    expect(cloud).toMatch(/policy_record_acceptance/);
    expect(cloud).toMatch(/POLICY_ACCEPTED/);
  });

  it("login returns outstanding policy versions and audits login outcomes", () => {
    const cloud = read("php/controllers/cloud.php");
    expect(cloud).toMatch(/policy_user_outstanding_keys/);
    expect(cloud).toMatch(/policyOutstanding/);
    expect(cloud).toMatch(/user_audit_log\(\(string\)\$user\["id"\], "LOGIN"/);
    expect(cloud).toMatch(/"FAILED_LOGIN"/);
  });

  it("account export and deletion require PIN, audit, and expose retention schedule", () => {
    const account = read("php/controllers/account.php");
    expect(account).toMatch(/account_verify_pin_reentry/);
    expect(account).toMatch(/PIN_REQUIRED/);
    expect(account).toMatch(/ACCOUNT_DATA_EXPORTED/);
    expect(account).toMatch(/DATA_EXPORT/);
    expect(account).toMatch(/expiresAt/);
    expect(account).toMatch(/ACCOUNT_DELETION_REQUESTED/);
    expect(account).toMatch(/hardDeleteAfter/);
  });

  it("schema includes the audit_logs table used by audit_log_action", () => {
    const schema = read("sql/production_schema.sql");
    const migration = read("sql/migrations/phase_13_privacy_audit.sql");
    expect(schema).toMatch(/CREATE TABLE IF NOT EXISTS audit_logs/);
    expect(schema).toMatch(/idx_audit_actor_time/);
    expect(migration).toMatch(/CREATE TABLE IF NOT EXISTS audit_logs/);
  });

  it("retention sweeper covers required privacy schedules", () => {
    const sweeper = read("scripts/retention-sweeper.php");
    expect(sweeper).toMatch(/users_hard_delete/);
    expect(sweeper).toMatch(/INTERVAL 30 DAY/);
    expect(sweeper).toMatch(/login_attempts_sweep/);
    expect(sweeper).toMatch(/INTERVAL 7 DAY/);
    expect(sweeper).toMatch(/rate_limits_sweep/);
    expect(sweeper).toMatch(/INTERVAL 1 DAY/);
    expect(sweeper).toMatch(/webhook_events_sweep/);
    expect(sweeper).toMatch(/INTERVAL 90 DAY/);
    expect(sweeper).toMatch(/user_audit_logs_sweep/);
    expect(sweeper).toMatch(/soft_deleted_rows_sweep/);
  });

  it("support access and PII policy document exists with consent, masking, and encryption plan", () => {
    const doc = read("docs/SUPPORT_ACCESS_AND_PII_POLICY.md");
    expect(doc).toMatch(/explicit user consent/);
    expect(doc).toMatch(/admin-approved/);
    expect(doc).toMatch(/time-limited/);
    expect(doc).toMatch(/masked by default/i);
    expect(doc).toMatch(/email/);
    expect(doc).toMatch(/mobile/);
    expect(doc).toMatch(/udhari phone/);
    expect(doc).toMatch(/encrypt attachment blobs at rest/);
  });
});
