# Backup Checklist

> Run this before ANY phase that applies a migration to production or that
> alters server-side data. Print or fork the checklist into the phase report.

## A. Schema export

```bash
mysqldump --no-data --routines --triggers \
  -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASS $DB_NAME \
  > backups/schema-$(date +%Y%m%d-%H%M%S).sql
```

- [ ] Schema dump file exists in `backups/`.
- [ ] File size > 5 KB (sanity check — empty dumps happen).
- [ ] File added to off-host storage (S3 / Drive / local disk **outside** the
      hosting account).

## B. Data export (anonymised)

```bash
# Full data, encrypted, restricted to ops machine:
mysqldump --single-transaction --routines --triggers \
  -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASS $DB_NAME \
  | gpg --symmetric --cipher-algo AES256 -o backups/data-$(date +%Y%m%d-%H%M%S).sql.gpg

# Anonymised copy for use in test/staging:
php scripts/backup_json.php --anonymise --out backups/data-anon-$(date +%Y%m%d-%H%M%S).json
```

- [ ] Encrypted full dump exists.
- [ ] Anonymised copy exists (PIN hashes, mobile, email scrubbed).
- [ ] Decryption verified — open one anonymised row and confirm fields are
      placeholder values, not real data.

## C. IndexedDB / Dexie test data

For browser-side regression scenarios:

- [ ] Open the app under the test DB, sign in as each fixture user, run the
      browser DevTools snippet in `tests/utils/dexie-snapshot.md` to export.
- [ ] Save snapshots under `backups/dexie/` keyed by fixture username.

## D. Pre-migration SQL backup

Always run RIGHT BEFORE applying a migration in production:

```bash
mysqldump --single-transaction \
  -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASS $DB_NAME \
  > backups/pre-migration-$(date +%Y%m%d-%H%M%S).sql
```

- [ ] Pre-migration dump file exists and is >5 KB.
- [ ] Rollback file for the migration exists (`sql/{date}_{slug}_rollback.sql`).
- [ ] You have read the rollback file and can mentally restore in <10 min.
- [ ] Maintenance message displayed to users (if downtime > 30 s).
- [ ] `/api/health.php` still returns `ok:true` after rollout.

## E. After rollout

- [ ] Smoke test: register a new test account, push one entity, pull it back.
- [ ] Webhook smoke: deliver a Razorpay test event, confirm one row in
      `webhook_events` with `processing_status='processed'`.
- [ ] If anything looks off, run the rollback file from §D and notify on-call.

## F. Retention

- Keep daily backups for the last 14 days, weekly for the last 8 weeks,
  monthly for the last 12 months.
- Encrypted dumps **never** stored unencrypted in shared folders.
- Anonymised dumps may be shared with the wider team for analysis.
