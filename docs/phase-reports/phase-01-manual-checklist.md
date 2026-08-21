# Phase 1 — Manual verification checklist

> Run after `npm run test`, `npm run check:php`, `npm run check:sql`, `npm run build`
> all pass. Tick each box; paste evidence (curl output, screenshot, SQL row counts)
> next to the lines that ask for it.

## A. Secrets

- [ ] `cat release/hosting-bundle/.env.host` — every DB_PASS / CLOUD_JWT_SECRET /
      RAZORPAY_KEY_SECRET / RAZORPAY_WEBHOOK_SECRET value is `""`.
- [ ] Repo-wide secret scan returns no non-empty production credential values in release artifacts.
- [ ] Try booting in production with empty `CLOUD_JWT_SECRET`:
      ```
      APP_ENV=production CLOUD_JWT_SECRET= DB_HOST=h DB_NAME=n DB_USER=u DB_PASS=p \
        php -d display_errors=1 -r 'require "php/bootstrap_api.php"; echo "started\n";'
      ```
      Expected: HTTP 500 + `ENV_VALIDATION_FAILED` and message
      `Refusing to boot: CLOUD_JWT_SECRET is empty`.
- [ ] Repeat with the known-bad JWT secret (the literal `32dd4c9f01ee72c2…`)
      → same error, message contains `matches a known example/default`.
- [ ] Repeat with empty `DB_PASS` (and no `DATABASE_URL`) → message contains
      `DB_PASS is empty`.

## B. HTTPS + headers

Run against the live origin after deploy:

- [ ] `curl -I http://YOUR_DOMAIN/` returns 301 → https.
- [ ] `curl -I https://YOUR_DOMAIN/` includes:
  - [ ] `strict-transport-security: max-age=31536000; includeSubDomains`
  - [ ] `x-frame-options: DENY`
  - [ ] `x-content-type-options: nosniff`
  - [ ] `referrer-policy: strict-origin-when-cross-origin`
  - [ ] `permissions-policy: …`
  - [ ] `content-security-policy: default-src 'self'; …`
- [ ] `curl -I https://YOUR_DOMAIN/.env` → 403.
- [ ] `curl -I https://YOUR_DOMAIN/.env.host` → 403.
- [ ] `curl -I https://YOUR_DOMAIN/data/.jwt-secret` → 403.
- [ ] `curl -I https://YOUR_DOMAIN/sql/schema.sql` → 403.
- [ ] `curl -I https://YOUR_DOMAIN/php/config/db.php` → 403.

## C. Source maps removed

- [ ] `npm run build` then `ls dist/assets | grep -c .js.map` → `0`.
- [ ] `npm run host:package` then `ls release/hosting-bundle/assets | grep -c .js.map` → `0`.

## D. Razorpay webhook ownership

> Run against your staging or test environment, NOT live Razorpay.

1. Create an order for **user A** (POST `/api/subscriptions/create-order.php`).
   Record the `provider_order_id` and the plan's `amountPaise`.

2. **Happy path** — replay a valid `payment.captured` event for that order:
   ```
   curl -X POST https://STAGING/api/payments/razorpay/webhook.php \
     -H "X-Razorpay-Signature: $(php -r 'echo hash_hmac("sha256", file_get_contents("payload.json"), getenv("RAZORPAY_WEBHOOK_SECRET"));')" \
     -H "X-Razorpay-Event-Id: evt_test_capture_$(date +%s)" \
     --data-binary @payload.json
   ```
   - [ ] Response: `{"ok":true,"data":{"processed":true}}`.
   - [ ] `SELECT status FROM subscriptions WHERE user_id='USER_A'` → `active`.
   - [ ] `SELECT processing_status FROM webhook_events WHERE event_id='evt_test_capture_…'` → `processed`.

3. **Replay** — send the same event_id a second time:
   - [ ] Response: `{"ok":true,"data":{"idempotent":true}}`.
   - [ ] `SELECT COUNT(*) FROM webhook_events WHERE event_id='evt_test_capture_…'` → 1 (UNIQUE held).

4. **Wrong signature** — flip one byte of the signature, new event id:
   - [ ] HTTP 401, error code `INVALID_SIGNATURE`.
   - [ ] One new `webhook_events` row with `processing_status='failed'` and
         `error_message='Invalid signature'`.

5. **Amount mismatch** — copy the same payload but bump `amount` by 1 paisa,
   sign correctly, send with a new event id:
   - [ ] HTTP 400, error code `AMOUNT_MISMATCH`.
   - [ ] `audit_logs` row with `action_key='PAYMENT_WEBHOOK_AMOUNT_MISMATCH'`.
   - [ ] Subscription remains in its prior state.

6. **Wrong order_id** — fake an order_id that does NOT exist in payments:
   - [ ] HTTP 404, error code `ORDER_NOT_FOUND`.
   - [ ] `audit_logs` row with `action_key='PAYMENT_WEBHOOK_UNKNOWN_ORDER'`.

7. **Cross-user spoof** — manually edit a row so user B "owns" user A's
   order; replay capture. The webhook locates the row by provider_order_id
   ONLY (no per-request user context), so this scenario is logically the same
   as #2 — but the `user_id` recorded against `payments` MUST always match
   the user who created the order. Verify by:
   - [ ] `SELECT user_id FROM payments WHERE provider_order_id = ?` returns
         user A across the entire test, never user B.
   - [ ] Audit-log entries attribute the action to user A (the owner row),
         not the webhook caller.

8. **Unique indexes** — try to INSERT a second payments row with the same
   (provider, provider_order_id):
   - [ ] MySQL error 1062 duplicate-key on `uq_pay_provider_order_id`.

## E. Data export + account delete

1. `POST /api/auth/data-export.php` with valid Bearer JWT and `{ pin: "<wrong>" }`:
   - [ ] HTTP 401, code `PIN_REQUIRED`.
   - [ ] audit_logs row `ACCOUNT_DATA_EXPORT_PIN_FAILED`.
2. Same with correct PIN:
   - [ ] HTTP 200 returning `{ user, collections, subscriptions, payments, auditLogs }`.
   - [ ] `collections.transactions[].entityId` matches what's in
         `cloud_collection_rows` (spot-check 3 rows).
   - [ ] audit_logs row `ACCOUNT_DATA_EXPORTED`.
3. `DELETE /api/auth/account.php` with wrong PIN:
   - [ ] HTTP 401, code `PIN_REQUIRED`.
4. Same with correct PIN:
   - [ ] HTTP 200; response includes `deleted: true` and `subscriptionsClosed: N`.
   - [ ] `SELECT is_active, deleted_at, pin_hash FROM users WHERE id = ?` →
         `0`, non-null, empty.
   - [ ] `SELECT status, cancel_at_period_end, cancelled_at FROM subscriptions
         WHERE user_id = ?` → `cancelled`, 1, non-null.
   - [ ] audit_logs row `ACCOUNT_DELETED`.
   - [ ] A subsequent `/api/auth/me.php` with the same JWT → 401 (the
         `auth_require_active_user()` denies because `is_active=0`).

## F. Admin seed safety

1. `php scripts/reset_admin_pin.php 12345678 admin` on dev:
   - [ ] Output includes `must_change_pin=yes` (after migration is applied).
   - [ ] Output includes `salt_fingerprint=` (non-empty).
2. `APP_ENV=production php scripts/reset_admin_pin.php 12345678 admin`:
   - [ ] Exit code 2, message `Refusing to run in APP_ENV=production without --force`.
3. `APP_ENV=production php scripts/reset_admin_pin.php 87654321 admin --force`:
   - [ ] Output includes `must_change_pin=yes`.
4. Sign in to the admin UI:
   - [ ] `/api/auth/me.php` response includes `mustChangePin: true`.
   - [ ] The UI routes straight to "Change PIN" (UI work belongs to a later
         phase — for now, confirming the flag is exposed is enough).
5. After a successful PIN change:
   - [ ] `/api/auth/me.php` returns `mustChangePin: false`.

## Final gate

- [ ] All boxes ticked.
- [ ] `npm run health` is green.
- [ ] Phase 1 entry is recorded in `schema_version` (`phase_01_security_2026_05_13`).
- [ ] No finance behaviour changed (Phase 0 characterization tests still pass).
