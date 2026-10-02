# SparowVault current product inventory

**Date:** 30 Sep 2026  
**Source:** the code on disk (routes, pages, services, Dexie, company SQL, purpose rules, report registry).  
**This folder is a reading copy of the live product.** It is not a launch certificate.

## Scores

A shipped screen counts **100**. A half-built screen counts **50**. A table or engine with no screen counts **15**. A named gap with no flow counts **0**. The percent is the average of those weights.

| Side | Surfaces | Shipped | Partial | Schema only | Not built | Weighted complete |
|---|---:|---:|---:|---:|---:|---:|
| Personal OS | 47 | 25 | 13 | 8 | 1 | **70%** |
| Company books | 36 | 16 | 8 | 5 | 7 | **58%** |
| Both | 83 | 41 | 21 | 13 | 8 | — |

## Files in this folder

| File | What it contains |
|---|---|
| [personal-os.md](personal-os.md) | Every personal surface: route, what the screen does, data it uses, what is unfinished, code path |
| [company-books.md](company-books.md) | Every company surface, the same way |
| [status-matrix.md](status-matrix.md) | One row per surface for scanning |

## How the two apps are built

**Personal OS** is a browser app. Books live in IndexedDB, database name `sparowvault_v1` (`src/db/database.ts`). PHP stores the cloud login and a generic JSON sync row (`sql/schema.sql`: `cloud_users`, `cloud_collection_rows`). It does not store one SQL table per personal feature. Routing is `src/lib/navRoutes.ts` plus `src/store/navStore.ts`. There is no React Router. Pages are `src/components/pages`. Calculation engines are `src/services`. Repositories are `src/repositories`. There are 24 personal routes from `/` through `/subscription`, plus `/admin` for plans, flags, branding, and users. `/company` never enters this shell.

**Company books** are a second app under `/company`. The server is the book. PHP posts vouchers. The browser previews lines and then posts with a preview hash. Routes are `src/company/routes.ts` (24 sidebar items, 34 nav keys). There are 34 `company_*` tables in `sql/migrations/20260923_company_core.sql`. Purpose rules are `config/company-purpose-rules.json`. The report list is `config/company-report-registry.json`. Money is integer paise.

## How to read a status

| Status | Meaning |
|---|---|
| Shipped | A person can finish the job on that screen. Data is read and written. |
| Partial | The screen or engine is real, and a core action is missing. |
| Schema only | A table, repo, or engine exists. No page writes it. |
| Not built | The name exists as a seed ledger, a disabled report, a future route, or a product gap. There is no flow. |

Company accounting docs from 23 Sep 2026 (`docs/company/SPAROWVAULT_COMPANY_OPEN_GAPS.md`) say P0 and P1 accounting gaps are closed. Documents, recurring rules, the personal-to-company bridge, and company billing are explicitly not product-active. That matches the code.

## Where to start a deeper test

Start with every **Partial** row, then every **Schema only** row. Those are the places a test finds a real gap. Shipped rows are the working product.
