import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd());

describe("Phase 1 - secrets sanitisation", () => {
  it.each([".env.host", "release/hosting-bundle/.env.host", "release/hosting-bundle-check/.env.host"])(
    "%s ships with no real secrets",
    (file) => {
      const text = readFileSync(resolve(ROOT, file), "utf8");
      const forbidden = [
        /^DB_PASS="[^"\s]+"$/m,
        /^CLOUD_JWT_SECRET="[^"\s]+"$/m,
        /^RAZORPAY_KEY_SECRET="[^"\s]+"$/m,
        /^RAZORPAY_WEBHOOK_SECRET="[^"\s]+"$/m,
      ];
      for (const re of forbidden) expect(text).not.toMatch(re);
    },
  );

  it(".env.host.example exists and is placeholder-only", () => {
    const text = readFileSync(resolve(ROOT, ".env.host.example"), "utf8");
    expect(text).toMatch(/^DB_PASS=""\s*$/m);
    expect(text).toMatch(/^CLOUD_JWT_SECRET=""\s*$/m);
  });

  it("production boot guard uses known-bad hashes, not raw secret literals", () => {
    const text = readFileSync(resolve(ROOT, "php/helpers/app.php"), "utf8");
    expect(text).toContain("2082136e025932ee36f73ba8dcbc11d052a85c3822fd1481119be467c9e1b0a2");
    expect(text).toContain("Refusing to boot: CLOUD_JWT_SECRET is empty");
    expect(text).toContain("Refusing to boot: DB_PASS is empty");
    expect(text).toContain("require_safe_production_secrets");
    expect(text).not.toMatch(/CLOUD_JWT_SECRET="[0-9A-Za-z_-]{32,}"/);
  });
});

describe("Phase 1 - .htaccess hardening", () => {
  const text = readFileSync(resolve(ROOT, ".htaccess"), "utf8");

  it("forces HTTPS and sets required security headers", () => {
    expect(text).toMatch(/RewriteRule \^ https:\/\/%\{HTTP_HOST\}%\{REQUEST_URI\}/);
    expect(text).toMatch(/Strict-Transport-Security/);
    expect(text).toMatch(/X-Frame-Options "DENY"/);
    expect(text).toMatch(/X-Content-Type-Options "nosniff"/);
    expect(text).toMatch(/Referrer-Policy/);
    expect(text).toMatch(/Permissions-Policy/);
    expect(text).toMatch(/Content-Security-Policy/);
  });

  it("denies env files, protected folders, source maps, and raw dumps", () => {
    expect(text).toContain("jwt-secret");
    expect(text).toContain("php/config");
    expect(text).toContain("data|backups|sql");
    expect(text).toMatch(/dump\|map\|zip/);
    expect(text).toMatch(/script-src 'self' https:\/\/checkout\.razorpay\.com/);
  });
});

describe("Phase 1 - JWT and browser token storage", () => {
  it("frontend no longer writes JWTs to localStorage", () => {
    const text = readFileSync(resolve(ROOT, "src/lib/apiClient.ts"), "utf8");
    expect(text).not.toMatch(/localStorage\.setItem\(AUTH_TOKEN_KEY/);
    expect(text).not.toMatch(/localStorage\.setItem\("sv:cloud_token"/);
    expect(text).toContain('credentials: "include"');
  });

  it("JWT verifier pins HS256 and validates standard claims", () => {
    const text = readFileSync(resolve(ROOT, "php/helpers/auth.php"), "utf8");
    expect(text).toContain('($header["alg"] ?? null) !== "HS256"');
    expect(text).toContain('"iss" => jwt_issuer()');
    expect(text).toContain('"aud" => jwt_audience()');
    expect(text).toContain("set_auth_cookie");
    expect(text).toContain('"httponly" => true');
    expect(text).toContain('"samesite" => "Lax"');
  });
});

describe("Phase 1 - PIN policy", () => {
  it("blocks common and date-like PINs, and requires 6 digits in production", () => {
    const text = readFileSync(resolve(ROOT, "php/helpers/auth.php"), "utf8");
    expect(text).toContain('["0000", "1111", "1234", "123456", "9999"]');
    expect(text).toContain("Avoid date-like PINs");
    expect(text).toContain("Production PIN must be at least 6 digits");
    expect(text).toContain("login_throttle_status");
  });
});

describe("Phase 1 - webhook controller enforces ownership and amount", () => {
  const text = readFileSync(resolve(ROOT, "php/controllers/payments.php"), "utf8");

  it("locks and validates Razorpay payments before subscription updates", () => {
    expect(text).toMatch(/FROM payments[\s\S]+WHERE provider = 'razorpay'[\s\S]+AND provider_order_id = \?/);
    expect(text).toContain("FOR UPDATE");
    expect(text).toContain("expected_amount_paise");
    expect(text).toMatch(/\$capturedAmount === \$expectedPaise/);
    expect(text).toMatch(/\$capturedCurrency === \$storedCurrency/);
  });

  it("update clauses include user_id guard and conflict audit paths", () => {
    expect(text).toMatch(/UPDATE payments[\s\S]+AND user_id\s*=\s*\?[\s\S]+AND provider_order_id\s*=\s*\?/);
    expect(text).toMatch(/UPDATE subscriptions[\s\S]+AND user_id\s*=\s*\?[\s\S]+AND provider_order_id\s*=\s*\?/);
    expect(text).toContain("PAYMENT_UPDATE_CONFLICT");
    expect(text).toContain("SUBSCRIPTION_UPDATE_CONFLICT");
    expect(text).toContain("PAYMENT_WEBHOOK_AMOUNT_MISMATCH");
  });
});

describe("Phase 1 - data export and account delete", () => {
  it("endpoints are method-restricted", () => {
    const exportText = readFileSync(resolve(ROOT, "api/auth/data-export.php"), "utf8");
    const accountText = readFileSync(resolve(ROOT, "api/auth/account.php"), "utf8");
    expect(exportText).toContain("METHOD_NOT_ALLOWED");
    expect(exportText).toMatch(/\$method !== "POST"/);
    expect(accountText).toMatch(/\$method !== "DELETE" && \$method !== "POST"/);
  });

  it("controller requires PIN, filters by user, audits, and clears auth cookie on delete", () => {
    const text = readFileSync(resolve(ROOT, "php/controllers/account.php"), "utf8");
    expect(text).toContain("account_verify_pin_reentry");
    expect(text).toMatch(/PIN_REQUIRED/);
    expect(text).toMatch(/WHERE user_id = \?/);
    expect(text).toContain("ACCOUNT_DELETED");
    expect(text).toContain("clear_auth_cookie");
    expect(text).toMatch(/UPDATE users[\s\S]+is_active\s*=\s*0[\s\S]+deleted_at\s*=\s*UTC_TIMESTAMP\(\)/);
  });
});

describe("Phase 1 - migration and seed safety", () => {
  it("reset_admin_pin is production guarded and uses random salt", () => {
    const text = readFileSync(resolve(ROOT, "scripts/reset_admin_pin.php"), "utf8");
    expect(text).toContain("Refusing to run in APP_ENV=production without --force");
    expect(text).toContain("bin2hex(random_bytes(16))");
    expect(text).not.toMatch(/\$salt\s*=\s*"seed"/);
    expect(text).toContain("must_change_pin  = 1");
  });

  it("forward and rollback migrations exist", () => {
    const forward = readFileSync(resolve(ROOT, "sql/migrations/phase_01_security.sql"), "utf8");
    const rollback = readFileSync(resolve(ROOT, "sql/migrations/phase_01_security_rollback.sql"), "utf8");
    expect(forward).toContain("expected_amount_paise");
    expect(forward).toContain("must_change_pin");
    expect(forward).toContain("uq_pay_provider_order_id");
    expect(rollback).toContain("DROP COLUMN");
    expect(rollback).toContain("expected_amount_paise");
  });
});
