# SparowVault Company — Master Whole-Project Audit Report

**Run:** `20261001-014647`  
**Supersedes:** `20260924-004757` (do not inherit its FAIL/PASS labels).  
**HEAD:** `6395ec9` plus uncommitted company changes.

## 01 Executive Verdict

The current Company app is a working double-entry product. Automated gates, IDOR, export fidelity, viewport matrix, dashboard, and most authenticated journeys passed on this run.

| Label | Verdict |
|-------|---------|
| Automated accounting | **PASS** |
| ACCOUNTING CORE CERTIFIED | **NOT ISSUED** |
| COMPANY PRODUCT COMPLETE | **NOT ISSUED** |
| COMPANY PRODUCTION READY | **NOT ISSUED** |

September defects for the categories page and `/vouchers/new` are fixed. Journey G was re-proved after the voucher list and the receipt date used the local calendar day: the list showed one row and Reverse posted (`raw/EVIDENCE_BROWSER_AUTH.txt`, exit 0).

## 02 Current Project Architecture

Browser → `CompanyApp` → pages → `companyApi` → `api/company` → `php/controllers/company.php` → posting/report helpers → MySQL. Posting is split across `posting.php`, `posting_guards.php`, `posting_preview.php`, `posting_commit.php`, and `posting_bills.php`. See `02_ARCHITECTURE.md`.

## 03 Repository and code structure

`src/company` is now about 138 TypeScript files (pages split, i18n, dashboard components, finance playbooks). API surface is larger than 24 files (categories, documents, recurring, gst, items, bridge, and others). Helpers include report statement and management modules.

## 04 Database

34 `company_*` tables in the earlier probe. Migration gate checksum **PASS**. Destroy/restore dump **PASS** (exit 0, 35 `company_*` tables, trial balance matched). 100k matrix **PASS** (exit 0).

## 05 API

Voucher read requires `view_day_book`. Preview permission helper exists. Search remains membership-only. Export remains `export_reports` only.

## 06 Authentication, security, tenancy

IDOR **PASS**. Live CSRF/CORS/SQLi probes **PASS**. Security matrix **PASS** (exit 0) after the scanner reads `posting_guards.php` and the preview/commit call sites. Hydrate race **PASS** 0/100.

## 07 Accounting engine

Vitest 96, PHP domain, and `company:gate:all` 12/12 **PASS**. Browser posted a loan (201), previewed farmer advance, and showed four property purpose variants.

## 08 Party model

Create party “Ramesh Patel” **PASS** in the browser. Categories panel exists; this run did not click it. Route unit test asserts `/masters/categories` is not the business-units route.

## 09 Business dimensions

Masters tabs include business units, branches, areas, projects, cost centres, and categories. Viewport opened masters. Combination posting across all dimensions **NOT VERIFIED**.

## 10 Voucher system

`/vouchers/new` renders `VoucherCreatePage` (chooser), not the list. Quick receipt posted. Default voucher list in journey F returned `rows=1`, and journey G reversed that voucher.

## 11 Bills and outstanding

Receivables page **PASS** (journey H and product BILLS). Settlement combinations beyond the page render **NOT VERIFIED**.

## 12 Approvals and period lock

Approvals and settings/lock surfaces **PASS** in the browser. Keyboard suite reached Lock period, Create party, and sheet Escape (22/22). Axe serious/critical count is 0 on 10 pages.

## 13 Dashboard

Widgets, cash drill, mobile, and New menu **PASS**.

## 14 Page-by-page

Viewport 168/168 **PASS**. Screenshot set is in `screens/`. Details in `07_PAGE_MATRIX.md`.

## 15 Functions and buttons

Primary create/post/report/export controls worked. Reverse did not appear. Keyboard missed two control names.

## 16 Navigation and discoverability

Core money actions are on the dashboard and New menu. Reverse is hard to find when the list filter hides the new voucher.

## 17 UI / UX

Dark shell, clear quick-entry copy, useful empty states on an empty list. The empty list after a successful post is confusing.

## 18 Premium and professional review

The books UI is consistent enough to look like a product. It is not production-hosted. The voucher-list miss is the trust issue for an accountant reversing a mistake.

## 19 Responsive and mobile

**PASS** at 320 through 1440, including mobile dashboard.

## 20 Accessibility

Keyboard 17/20. Axe **NOT VERIFIED**.

## 21 Reports

Trial balance, P&L, balance sheet, and day book opened. Management reports are enabled in the registry and were not opened here.

## 22 Data visualization

Dashboard cash chart is part of the product browser pass. No decorative fake series were asserted.

## 23 Export and backup

Export fidelity **PASS**. Browser export formats **PASS**. Full backup destroy/restore **PASS** this stamp (exit 0, `PASS backup_restore_checksum`). Gate migration checksum **PASS**.

## 24 Error, loading, empty states

Journey N: session lock blocks `/company` **PASS**. The default voucher list includes a voucher posted on the local calendar day. Network-timeout UX **NOT VERIFIED**.

## 25 Performance

Small-company interactive p95 under 50ms **PASS**. 100k matrix **PASS** (10 companies, 100,000 vouchers, 500,000 lines after top-up, exit 0).

## 26 Testing architecture

Strong domain and gate coverage. Browser A–N, the security matrix, keyboard, and axe were re-proved green. `company:certify:final` and `company:certify:product` were not launched as single orchestrators. 100k and backup destroy/restore **PASS** (exit 0).

## 27 Logic and combinations

Purpose and property PHP/unit checks **PASS**. High-risk triples (bill + approval + lock, multi-tab company switch) **NOT VERIFIED**.

## 28 Security test matrix

See `15_SECURITY.md`.

## 29 Business journeys

| Journey | Result |
|---------|--------|
| A Create company | PASS |
| B Party | PASS |
| C Loan received | PASS |
| D Farmer advance | PASS |
| E Property variants | PASS |
| F Voucher list | rows=1 |
| G Reverse | PASS (reversed) |
| H Receivables | PASS |
| I Reports | PASS |
| J Users | PASS |
| K Approvals | PASS |
| L Settings | PASS |
| M Export | PASS |
| N Lock | PASS |
| Product deep browser | PASS 8/8 |

Screens: `screens/`.

## 30 Personas

Owner and data-entry flows (dashboard, quick receipt, party) passed. Accountant reverse flow **PASS** on re-proof. Viewer/auditor second-user **NOT VERIFIED**.

## 31 Completion

Implementation 92%. Verification 80%. Product UX 84%. Production readiness 15%. See `21_FINAL_SCORECARD.md`.

## 32 Domain scorecards

Architecture 8, Database 8, Accounting 9, Security 7, Dashboard 8, Responsive 9, Accessibility re-proved pass (keyboard 22/22, axe 0 serious), Premium 8.

## 33 Findings

**P0:** none.  
**P1:** none remaining from this re-proof.  
**P2:** search membership-only, project/area/user-activity reports stayed on Loading, port 8080 IPv4/IPv6 split. Modules page opened. Business and category reports rendered a summary. 100k matrix and backup destroy/restore **PASS**.

## 34 Open gaps

`OPEN_GAPS.md`.

## 35 Remediation phases

`20_REMEDIATION_PLAN.md`. Journey G is green. `company:certify:final` and `company:certify:product` still need a single-process run after the database worker finishes.

## 36 Product-complete acceptance

Journey G, keyboard, and the security matrix now pass. Re-issue product-complete only when `company:certify:product` exits 0 as one process. Three management reports did not finish loading in this sample.

## 37 Production-ready acceptance

Staging, HTTPS, monitoring, backup schedule, and restore SLA are not in this run. healthz refuses a non-test database with HTTP 503. **NOT ISSUED**.

## 38 Final auditor conclusion

**Can a business owner and an accountant use the major flows tomorrow without a developer?**  
**For the flows re-proved here, yes on the main path.** They can create a company, add a party, record a loan, find it in the default voucher list, and reverse it. Core reports and export still pass. The 100k matrix and backup destroy/restore **PASS**. Product-complete and production-ready labels stay **NOT ISSUED** because the single-process certifiers were not re-run, and three management reports stayed on Loading.

September’s categories and voucher-new blockers are no longer the reason.
