# Company Purpose Registry

**Source of truth:** [`config/company-purpose-rules.json`](../../config/company-purpose-rules.json)

| Consumer | How loaded |
|----------|------------|
| PHP posting / preview | `php/helpers/company/purpose.php` → `company_purpose_rule()` |
| TypeScript forms | `purposeEngine.ts` catalogue aligned to same keys |
| Docs / tests | This file + php-tests |

## New / fixed purposes

| Key | Direction | Notes |
|-----|-----------|-------|
| OTHER_RECEIPT | RECEIVED | Requires explicit counterLedgerId |
| OTHER_PAYMENT | PAID | Requires explicit counterLedgerId |
| PROPERTY_EXPENSE | PAID | Hits P&L |
| PROPERTY_ADVANCE | PAID | Asset via party relationship; no P&L |
| PROPERTY_INVESTMENT | PAID | PROPERTY_ASSET |
| PROPERTY_DEPOSIT | PAID | PROPERTY_DEPOSIT |
| VENDOR_REFUND_RECEIVED | RECEIVED | EXPENSE_CONTRA |

## Deprecated (compat only)

`OTHER`, `PROPERTY_PAYMENT`, `REFUND` — marked `deprecated: true`; UI must not offer for new entries.

## Preview = post

Server `company_enrich_preview_lines` returns exact ledger names + `previewHash`. Post rejects with `PREVIEW_STALE` if hash mismatches.
