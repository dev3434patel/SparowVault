# Phase 14 - SaaS Billing and Razorpay Hardening Report

Date: 2026-05-15

Final status: BLOCKED

Reason: Implementation and static gates pass, but the required webhook ownership E2E cannot run because local MySQL is not reachable on `127.0.0.1:3306`. Payment/webhook behavior is covered by static tests and existing E2E script, but the E2E proof is blocked by environment.

## Summary of Changes

- Preserved fair early-renewal period dates by preventing payment confirmation/webhook activation from overwriting the precomputed subscription period.
- Added downgrade scheduling behavior: lower-priced plan changes are scheduled at the current period end instead of charging immediately.
- Added Phase 14 payment uniqueness constraints into the Phase 14 migration and rollback.
- Fixed quota helper so it returns all numeric quotas for the active plan, not only one joined feature row.
- Expanded plan feature keys to support the requested boolean features and numeric quota names.
- Added admin subscription actions for manual extension and cancellation with audit logging.
- Expanded admin subscription listing with latest payment status, scheduled plan info, and failed webhook count.
- Updated Subscription UI to handle scheduled downgrade responses without opening Razorpay checkout.
- Added static billing hardening tests.

## Files Changed

- `D:\Claude\SparowVault\php\controllers\subscriptions.php`
- `D:\Claude\SparowVault\php\controllers\payments.php`
- `D:\Claude\SparowVault\php\helpers\billing.php`
- `D:\Claude\SparowVault\php\controllers\admin.php`
- `D:\Claude\SparowVault\api\admin\subscriptions.php`
- `D:\Claude\SparowVault\sql\migrations\phase_14_saas_billing.sql`
- `D:\Claude\SparowVault\sql\migrations\phase_14_saas_billing_rollback.sql`
- `D:\Claude\SparowVault\src\lib\cloud\saasClient.ts`
- `D:\Claude\SparowVault\src\components\pages\SubscriptionPage.tsx`
- `D:\Claude\SparowVault\src\components\pages\admin\SubscriptionManagementPage.tsx`
- `D:\Claude\SparowVault\src\services\planFeatureGate.ts`
- `D:\Claude\SparowVault\src\services\__tests__\planFeatureGate.test.ts`
- `D:\Claude\SparowVault\tests\unit\billingPhase14Static.test.ts`
- `D:\Claude\SparowVault\PHASE_14_SAAS_BILLING_RAZORPAY_REPORT.md`

## Migrations Changed

- `phase_14_saas_billing.sql`
  - Keeps `plan_prices`.
  - Keeps `plan_features.limit_value` and `limit_unit`.
  - Keeps `subscriptions.previous_period_end`, `renewed_from_subscription_id`, `scheduled_plan_id`, `scheduled_change_at`.
  - Adds idempotent unique indexes:
    - `UNIQUE(provider, provider_order_id)`
    - `UNIQUE(provider, provider_payment_id)`

- `phase_14_saas_billing_rollback.sql`
  - Drops Phase 14 subscription/feature columns.
  - Drops `plan_prices`.
  - Drops the two payment uniqueness indexes.

## Functions Changed

- `subscriptions_create_order()`
  - Uses `billing_active_price_paise()`.
  - Computes fair renewal start from current active subscription end.
  - Stores `previous_period_end` and `renewed_from_subscription_id`.
  - Schedules downgrade at current period end instead of creating a payment order.

- `subscriptions_confirm_payment()`
  - No longer overwrites fair `current_period_start` / `current_period_end` during activation.

- `razorpay_webhook()`
  - No longer overwrites fair `current_period_start` during webhook activation.

- `billing_user_quotas()`
  - Now selects the active plan first and returns all numeric quota features.

- `admin_subscription_action()`
  - New admin mutation endpoint behavior for manual extension and cancellation.

## UI Changed

- Subscription page:
  - Handles scheduled downgrade response and shows a success message instead of launching Razorpay.

- Admin subscription page:
  - Shows payment status.
  - Shows failed webhook count.
  - Shows scheduled plan details.
  - Adds `Extend 30d` and `Cancel` admin actions.

## Tests Added

- `tests/unit/billingPhase14Static.test.ts`
  - Verifies migration contains plan prices, quotas, and payment uniqueness constraints.
  - Verifies webhook controller validates signature/idempotency/order/user/amount/currency.
  - Verifies subscription controller preserves early-renewal fairness and schedules downgrades.
  - Verifies quota helper does not return only one joined row.

- `src/services/__tests__/planFeatureGate.test.ts`
  - Extended for `exports` feature key.

## Commands Run

- `npm run typecheck` - PASS
- `npm run test -- billing` - PASS, 4 tests
- `npm run phase:14:gate` - PASS, 14 checks
- `npm run test:webhook` - BLOCKED/FAIL due local MySQL connection refusal through PHP API
- `npm run test:webhook:ownership` - BLOCKED/FAIL due local MySQL connection refusal from Node test harness
- `npm run check:php` - PASS, 72 PHP files parsed
- `npm run lint` - PASS
- `npm run check:sql` - PASS with existing static SQL warnings
- `npm run build` - PASS with existing Vite chunk-size/dynamic-import warnings

## Blocked E2E Result

Commands attempted:

```powershell
$env:TEST_DB_HOST='127.0.0.1'
$env:TEST_DB_USER='root'
$env:TEST_DB_PASS=''
$env:TEST_DB_NAME='sparowvault_test'
$env:BASE_URL='http://localhost:5000'
$env:RAZORPAY_WEBHOOK_SECRET='test_secret'
npm run test:webhook
npm run test:webhook:ownership
```

Failures:

```text
test:webhook:
First webhook call failed {
  status: 500,
  body: {
    ok: false,
    error: 'SQLSTATE[HY000] [2002] No connection could be made because the target machine actively refused it'
  }
}

test:webhook:ownership:
Error: connect ECONNREFUSED 127.0.0.1:3306
```

## Manual Checks

- Webhook correct signature/order/amount/currency: NOT RUN, blocked by MySQL test DB.
- Duplicate webhook event idempotency: NOT RUN, blocked by MySQL test DB.
- Wrong signature rejection: NOT RUN, blocked by MySQL test DB.
- Wrong amount rejection: NOT RUN, blocked by MySQL test DB.
- Early renewal does not lose paid days: NOT RUN in browser/test DB.
- Downgrade is scheduled at period end: implemented, NOT RUN in browser/test DB.
- Feature lock UI does not blank page: existing plan gate covered, NOT RUN manually.
- Admin manual extend/cancel: implemented, NOT RUN manually.
- Failed webhook inspection: implemented in admin list, NOT RUN manually.

## Remaining Risks

- Webhook ownership and idempotency remain unproven in this run until MySQL test DB is available.
- Admin extension/cancel actions currently use fixed frontend action inputs. A later UX pass should add explicit reason/day dialogs.
- Downgrade decision currently compares active plan price to target plan price. More complex product tiers with equal price but lower feature set may need explicit plan rank metadata.
- `check:sql` still reports existing non-idempotent `ALTER TABLE` warnings in older SQL files outside this Phase 14 patch.

## Rollback Plan

- Revert Phase 14 PHP controller/helper changes.
- Revert Phase 14 migration/rollback changes.
- Revert Subscription page, admin subscription page, and SaaS client changes.
- Revert plan feature gate key/test changes.
- Revert `tests/unit/billingPhase14Static.test.ts`.
- Apply `sql/migrations/phase_14_saas_billing_rollback.sql` only if the Phase 14 migration was applied to a database.

## Next Required Action

Start local MySQL, create or reset `sparowvault_test`, apply the schema/migrations, start the PHP server on `localhost:5000`, then rerun:

```powershell
$env:TEST_DB_HOST='127.0.0.1'
$env:TEST_DB_USER='root'
$env:TEST_DB_PASS=''
$env:TEST_DB_NAME='sparowvault_test'
$env:BASE_URL='http://localhost:5000'
$env:RAZORPAY_WEBHOOK_SECRET='test_secret'
npm run test:webhook
npm run test:webhook:ownership
```

Only after that E2E and the manual billing checks pass should Phase 14 be marked COMPLETE.
