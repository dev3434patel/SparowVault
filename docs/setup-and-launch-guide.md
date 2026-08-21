# Setup and Launch Guide (Professional)

## 1) One-time prerequisites

- PHP 8.1+ with PDO MySQL
- MySQL 8+
- Node 20+
- HTTPS-enabled domain for production
- Razorpay test/live account

## 2) Deploy in one SQL import (recommended)

Use this single script for new installs:

```bash
mysql -h <host> -P <port> -u <user> -p <db_name> < sql/20260427_all_in_one.sql
```

This script includes:
- core users + cloud data tables
- plans/subscriptions/payments/webhook/admin tables
- feature flags + app settings
- audit logs + login attempt throttling table
- default plans, feature flags, and admin seed

## 3) Environment configuration

Minimum production env:

```env
APP_ENV=production
APP_BASE_URL=https://your-domain.com

DB_HOST=...
DB_PORT=3306
DB_NAME=...
DB_USER=...
DB_PASS=...
# Optional:
# DATABASE_URL=mysql://USER:PASS@HOST:3306/DB

CLOUD_JWT_SECRET=<long-random-secret>
CLOUD_JWT_EXPIRES_IN=7d

RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...

CORS_ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

## 4) Build and publish

```bash
npm install
npm run build
```

Upload:
- `index.html`
- `assets/`
- `api/`
- `php/`
- `sql/`
- `.htaccess`

## 5) Razorpay production wiring

- Webhook URL:
  - `https://your-domain.com/api/payments/razorpay/webhook.php`
- Subscribe to events:
  - `payment.captured`
  - `payment.failed`
- Copy webhook secret exactly into `RAZORPAY_WEBHOOK_SECRET`

## 6) Validation checklist before go-live

- `GET /api/health.php` returns healthy
- register/login works
- admin token can access `/api/admin/*`
- non-admin token denied on `/api/admin/*`
- plan list and create order work
- payment confirm updates subscription state
- webhook replay is idempotent
- feature flags hide/show modules correctly
- branding title/favicon/logo render correctly

## 7) Test commands

```bash
npm run test:api
npm run test:webhook
npm run test:cloud
```

`test:webhook` requires `RAZORPAY_WEBHOOK_SECRET` in environment.

## 8) Operations

- Incident guide: `docs/incident-playbook.md`
- Emergency rollback SQL:
  - `sql/20260427_p0_rollback.sql`

