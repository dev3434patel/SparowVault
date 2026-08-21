# SparowVault Final Version

This folder is a clean release/source copy prepared for hosting.

## Hosting SQL

Use:

```text
sql/FINAL_HOSTING_WITH_DATA.sql
```

This SQL was generated from the old hosting dump at `C:\Users\DELL\Downloads\sparocdy_money.sql`, then upgraded with the current SparowVault schema and migrations. Existing data is preserved.

## Import Order

1. Create or empty the hosting database.
2. Import `sql/FINAL_HOSTING_WITH_DATA.sql` through phpMyAdmin or the hosting SQL importer.
3. Upload the hosting bundle from `release/hosting-bundle.zip` or upload the contents of `release/hosting-bundle`.
4. Configure real hosting environment variables on the server.

## Environment Files

Actual local/hosting secret files are intentionally not copied:

- `.env`
- `.env.local`
- `.env.host`
- `.env.production`
- `.env.staging`

Use `.env.example`, `.env.host.example`, and `.env.test.example` as templates only.
