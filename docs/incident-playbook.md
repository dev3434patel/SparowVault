# Incident Playbook (MVP)

## 1) Authentication outage (login/register failures)

- Check API health: `GET /api/health.php`
- Inspect app logs for `AUTH_THROTTLED`, DB connection errors, or JWT secret mismatch.
- Confirm env vars: `DB_*`, `DATABASE_URL`, `CLOUD_JWT_SECRET`, `CLOUD_JWT_EXPIRES_IN`.
- If throttling is accidental at scale, clear `data/rate_limits.json` and redeploy with tuned limits.

## 2) Payment mismatch (paid but not active)

- Verify webhook deliveries in Razorpay dashboard.
- Validate webhook signature secret matches `RAZORPAY_WEBHOOK_SECRET`.
- Inspect DB:
  - `webhook_events` for event status and errors
  - `payments` for `captured/failed`
  - `subscriptions` for `active/past_due`
- Re-send webhook from Razorpay dashboard; idempotency prevents duplicates.

## 3) Admin lockout or unauthorized access reports

- Verify token role in `/api/auth/me.php`.
- Confirm `users.role` and `users.is_active`.
- Review `audit_logs` for suspicious `USER_TOGGLED`, `USER_PLAN_ASSIGNED`, `FEATURE_TOGGLED`.
- Rotate JWT secret only in controlled maintenance window (forces re-login).

## 4) Feature access regression

- Check `/api/subscriptions/my.php` output (`effectiveFeatures`).
- Validate:
  - `feature_flags_global`
  - `plan_features` for user’s active plan
  - active subscription status
- Reapply seed for missing flag rows, then revalidate UI gating.

## 5) Emergency rollback

- If SaaS billing/admin subsystem is unstable:
  - run `sql/20260427_p0_rollback.sql`
  - disable billing routes at edge/reverse proxy
  - keep core cloud sync endpoints operational
- Restore from DB backup once root cause is fixed.

## 6) Post-incident checklist

- Capture timeline and failing endpoint/error code.
- Add regression test in `tests/api-e2e.mjs` or `tests/webhook-replay-e2e.mjs`.
- Add audit and alerting rule for recurrence pattern.

