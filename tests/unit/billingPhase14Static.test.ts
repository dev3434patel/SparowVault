import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function read(path: string) {
  return readFileSync(resolve(ROOT, path), "utf8");
}

describe("Phase 14 SaaS billing and Razorpay hardening", () => {
  it("migration enforces payment uniqueness and numeric quotas", () => {
    const sql = read("sql/migrations/phase_14_saas_billing.sql");
    expect(sql).toMatch(/plan_prices/);
    expect(sql).toMatch(/limit_value/);
    expect(sql).toMatch(/limit_unit/);
    expect(sql).toMatch(/UNIQUE KEY `uq_pay_provider_order_id` \(`provider`, `provider_order_id`\)/);
    expect(sql).toMatch(/UNIQUE KEY `uq_pay_provider_payment_id` \(`provider`, `provider_payment_id`\)/);
  });

  it("webhook validates signature, idempotency, order, owner, amount, and currency before activation", () => {
    const php = read("php/controllers/payments.php");
    expect(php).toMatch(/razorpay_verify_webhook_signature/);
    expect(php).toMatch(/INSERT INTO webhook_events/);
    expect(php).toMatch(/duplicate/);
    expect(php).toMatch(/provider_order_id = \?/);
    expect(php).toMatch(/user_id\s+=\s+\?/);
    expect(php).toMatch(/capturedAmount/);
    expect(php).toMatch(/capturedCurrency/);
    expect(php).toMatch(/expected_amount_paise/);
    expect(php).toMatch(/AMOUNT_MISMATCH/);
  });

  it("subscription flow preserves early-renewal paid days and schedules downgrades", () => {
    const php = read("php/controllers/subscriptions.php");
    expect(php).toMatch(/billing_renewal_start/);
    expect(php).toMatch(/previous_period_end/);
    expect(php).toMatch(/renewed_from_subscription_id/);
    expect(php).toMatch(/scheduled_plan_id/);
    expect(php).toMatch(/SUBSCRIPTION_DOWNGRADE_SCHEDULED/);
    expect(php).toMatch(/Downgrade scheduled for your next renewal/);
    expect(php).not.toMatch(/current_period_start = UTC_TIMESTAMP\(\), current_period_end/);
  });

  it("quota helper returns all numeric quotas for the active plan, not just one joined row", () => {
    const php = read("php/helpers/billing.php");
    const quotaFn = php.slice(
      php.indexOf("function billing_user_quotas"),
      php.indexOf("/**\n * Quick: is `feature_key` enabled"),
    );
    expect(php).toMatch(/billing_user_quotas/);
    expect(quotaFn).toMatch(/SELECT plan_id/);
    expect(quotaFn).toMatch(/pf.limit_value IS NOT NULL/);
    expect(quotaFn).not.toMatch(/ORDER BY s\.id DESC LIMIT 1"\s*\)/);
  });
});
