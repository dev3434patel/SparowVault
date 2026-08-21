# Production Secrets — SparowVault

This document defines how secrets are generated, distributed, rotated, and
verified for a production SparowVault deployment.

> **Rule 0:** No secret may live in Git. Ever. If you find a real secret in the
> repository, treat it as compromised and rotate immediately.

## 1. The launch-blocking guard

`php/helpers/app.php` exposes `require_safe_production_secrets()` which is
invoked on every API boot via `validate_runtime_config()`. In
`APP_ENV=production` the app **refuses to boot** when any of the following is
true:

| Condition                                                                    | Error                                                                            |
|------------------------------------------------------------------------------|----------------------------------------------------------------------------------|
| `CLOUD_JWT_SECRET` empty                                                     | `Refusing to boot: CLOUD_JWT_SECRET is empty in APP_ENV=production.`             |
| `CLOUD_JWT_SECRET` shorter than 32 chars                                     | `Refusing to boot: CLOUD_JWT_SECRET is too short (<32 chars).`                   |
| `CLOUD_JWT_SECRET` matches a known example / default (SHA-256 denylist hit)  | `Refusing to boot: CLOUD_JWT_SECRET matches a known example/default value.`      |
| `DB_PASS` empty and no `DATABASE_URL` set                                    | `Refusing to boot: DB_PASS is empty in APP_ENV=production.`                      |

The denylist of known-bad secrets lives in `known_bad_jwt_secret_hashes()` in
the same file. When you discover that a secret was ever public, add its
SHA-256 hash to the list and ship a release; existing instances using that
secret will refuse to boot until rotated.

## 2. Generating secrets

```bash
# JWT secret — 64 hex bytes (~128 chars)
openssl rand -hex 64

# Database password — long enough that rate-limited brute force is hopeless
openssl rand -base64 24 | tr -d '=+/' | cut -c1-32

# Razorpay webhook secret — set inside the Razorpay dashboard; copy the value
# back into RAZORPAY_WEBHOOK_SECRET. NEVER reuse between test and live mode.
```

Store the result in your secret manager (1Password / Bitwarden / Vault /
cPanel "Environment Variables" panel). Never paste secrets into Slack,
email, screenshots, or PR descriptions.

## 3. Where each secret comes from and where it goes

| Secret                       | Source of truth         | Production location               | Phase 1 guard |
|------------------------------|-------------------------|-----------------------------------|--------------:|
| `CLOUD_JWT_SECRET`           | `openssl rand -hex 64`  | env var on host / `.env.host`     | ✅            |
| `DB_PASS`                    | DB admin / hosting      | env var on host / `.env.host`     | ✅            |
| `RAZORPAY_KEY_SECRET`        | Razorpay dashboard      | env var on host / `.env.host`     | ⚠️ enforced only when `ENABLE_RAZORPAY=true` |
| `RAZORPAY_WEBHOOK_SECRET`    | Razorpay dashboard      | env var on host / `.env.host`     | ⚠️ enforced only when `ENABLE_RAZORPAY=true` |
| `CORS_ALLOWED_ORIGINS`       | Operator                | env var on host                    | indirect (CORS denies otherwise) |

## 4. Deploying without leaking

1. Write secrets only in your hosting panel's env-var UI (cPanel "Environment
   Variables", DigitalOcean App Platform "Environment Variables", etc.).
2. If you must use a `.env.host` file on disk, set chmod 600 and verify it
   is not served:

   ```bash
   curl -I https://YOUR_DOMAIN/.env.host          # expect 403
   curl -I https://YOUR_DOMAIN/.env                # expect 403
   curl -I https://YOUR_DOMAIN/data/.jwt-secret    # expect 403
   ```

   The Phase 1 `.htaccess` includes deny rules for all of these patterns.
3. `release/hosting-bundle/.env.host` is shipped with **empty** placeholders
   by `scripts/package-hosting.mjs`. The packaging script will refuse to
   include a non-empty value (regression check from Phase 1).

## 5. Rotating secrets

### Rotating `CLOUD_JWT_SECRET`

Rotating invalidates every issued JWT. Plan a 1-minute window where users
must sign in again.

```bash
NEW=$(openssl rand -hex 64)
# Update the host env var (cPanel / Vault / etc.)
# Restart PHP-FPM / Apache (or wait for next request — PHP loads env per request).
```

Sanity check:

```bash
curl -s https://YOUR_DOMAIN/api/health.php | jq .
# → { "ok": true, ... }
```

Then sign in with a test account and verify a successful round-trip.

### Rotating `DB_PASS`

1. In your DB host, set a new password for the SparowVault DB user.
2. Update `DB_PASS` (or the password segment of `DATABASE_URL`) in env.
3. The app picks it up on the next request — no restart strictly needed.
4. Verify with `/api/health.php`.

### Rotating Razorpay keys

1. Razorpay → Settings → API Keys → regenerate.
2. Set new `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` on the host.
3. Razorpay → Webhooks → regenerate secret → update `RAZORPAY_WEBHOOK_SECRET`.
4. Trigger a test webhook from the Razorpay dashboard and confirm exactly one
   row appears in `webhook_events` with `processing_status='processed'`.

## 6. Secret incident response

A "secret incident" is any of: appearance of a real secret in Git history, a
screenshot in chat, an unencrypted backup, a build artifact, a CI log, or a
former employee's machine.

1. Treat the secret as **compromised**. Do not negotiate with yourself about
   whether it's "probably fine".
2. Rotate it (see §5).
3. Add the **old** secret's SHA-256 to `known_bad_jwt_secret_hashes()` (if
   it's the JWT secret) and ship a release so any forgotten env that still
   uses it refuses to boot.
4. Run `git filter-repo` (or BFG) and force-push to scrub history. Notify
   every contributor.
5. File an incident note in `docs/incident-playbook.md` with timestamps,
   blast radius, who knew, and the rotation timestamp.

## 7. Verifying a deployment

Run this sequence after every production deploy. All must pass:

```bash
# 1. Health check
curl -s https://YOUR_DOMAIN/api/health.php

# 2. Confirm boot guards are armed
#    Temporarily set an empty CLOUD_JWT_SECRET in a staging env;
#    the app must return 500 with: ENV_VALIDATION_FAILED.
#    Then restore the real secret.

# 3. Confirm sensitive paths are denied
for path in .env .env.host .env.local data/.jwt-secret data/app.db sql/schema.sql; do
  status=$(curl -sw '%{http_code}' -o /dev/null https://YOUR_DOMAIN/$path)
  echo "$path → $status"   # all must be 403 (or 404)
done

# 4. Confirm bundle has no .js.map files
curl -I https://YOUR_DOMAIN/assets/index.js.map   # expect 404
```

## 8. Admin user safety

Phase 1 adds `users.must_change_pin`. After running `scripts/reset_admin_pin.php`
the admin row is flagged `must_change_pin=1`. The `/api/auth/me.php` response
exposes this flag; the admin UI is expected to force a PIN change before any
other admin action. See Phase 1 task F in `PHASE_01_COMPLETION_REPORT.md` for
the full rollout.

> Do not leave the default `pin=12345678` in production beyond the first
> sign-in. Change it, then verify the flag clears.
