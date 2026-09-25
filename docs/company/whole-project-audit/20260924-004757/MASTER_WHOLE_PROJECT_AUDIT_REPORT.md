# SparowVault Company — Master Whole-Project Audit Report

**Run:** `20260924-004757`  
**Scope:** `/company` product (software + accounting + UX + security + performance)  
**Stance:** Independent — prior PASS/certification labels are **not inherited**.

Satellites: `01_CURRENT_STATE.md` … `21_FINAL_SCORECARD.md`, `OPEN_GAPS.md`, `20_REMEDIATION_PLAN.md`, `raw/`, `screens/`.

---

## 01 Executive Verdict

SparowVault Company is a **real, usable multi-tenant double-entry product** with a strong automated accounting core, solid IDOR/tenant isolation, working dashboard/quick-entry UX, and green interactive latency — but it is **not** re-certifiable as Product Complete in this run.

| Label | Verdict |
|-------|---------|
| Accounting automated core | **PASS** (unit + PHP + gates + HTTP + TB) |
| ACCOUNTING CORE CERTIFIED | **NOT ISSUED** (auth A–N incomplete; 100k matrix not re-run) |
| COMPANY PRODUCT COMPLETE | **NOT ISSUED** (P1 usability) |
| COMPANY PRODUCTION READY | **NOT ISSUED** |

**Can you give it to a business owner + accountant tomorrow without developer coaching?**  
**NO** — see §38. Primary blockers: categories nav lies; voucher-new is a dead end; authenticated journey automation incomplete; some RBAC surfaces softer than matrix.

---

## 02 Current Project Architecture

```text
Browser → CompanyApp → Pages → companyApi → api/company/*.php
  → php/controllers/company.php → helpers (posting/reports/authz/…) → MySQL company_*
```

Exceptions: shared `authStore`; FE purposeEngine on Transfer; FE reportEngine tests-only; personal Dexie skipped on company portal. Details: `02_ARCHITECTURE.md`.

**Status: PARTIAL** (professional module; mega-pages + dual registries).

---

## 03 Repository & Code Structure

| Area | Path | Notes |
|------|------|-------|
| FE | `src/company/` ~54 files | LIVE SPA |
| API | `api/company/` 24 | Thin wrappers |
| Domain | `php/helpers/company/` 9 | posting core |
| Migrations | `sql/migrations/20260923_company_*.sql` | 34 tables live |
| Config | `config/company-*.json` | purpose + reports |
| Tests | `scripts/company/`, vitest services | |

Dead/orphan: `PlaceholderPage`; duplicate API entrypoints; unused FUTURE tables; `reportEngine`/`invariants` runtime-DEAD.

Working tree: company domain largely **untracked** at HEAD `ab50585`.

---

## 04 Database Architecture

Live: 34 `company_*` tables, BIGINT paise, company_id tenancy, RESTRICT on history-critical FKs. Workspace CASCADE wipes audit. Scorecard in `03_DATABASE.md`.

Backup→restore checksum this run: **PASS** (`raw/EVIDENCE_BACKUP_RESTORE.txt`) including TB balanced at ~193k vouchers.

**Status: PASS** (migration rollback NOT IMPLEMENTED).

---

## 05 API Architecture

Endpoint matrix in `04_API.md`. Client parity good. Issues: membership-only search/voucher-item/preview; export without view_*; duplicate endpoints.

**Status: PARTIAL**

---

## 06 Authentication / Security / Tenancy

| Check | This run |
|-------|----------|
| IDOR | PASS |
| CSRF/CORS/SQLi matrix (cert_211549) | PASS |
| CSRF matrix (default review_demo) | FAIL login 401 |
| Hydrate race 100× | PASS 0 fail |
| Sensitive PIN helpers | PASS |
| Soft intra-tenant reads | PARTIAL |

Details: `15_SECURITY.md`.

**Status: PARTIAL → strong with correct credentials**

---

## 07 Accounting Engine

Double-entry, preview hash (optional), idempotency, atomic reverse, bill alloc, purpose registry — verified by PHP + vitest + gates. Purpose scorecard in `05_ACCOUNTING.md`.

**Automated accounting: PASS**  
**Full certification pack: NOT ISSUED**

---

## 08 Party / Relationship Model

Parties CRUD, roles, relationship accounts, plain-language balances, statement via reports. Categories master UI broken (falls to BU). Tags schema unused.

**Status: PASS core / FAIL categories master UI**

---

## 09 Business Dimensions

BU, Branches, Areas, Projects, Cost Centres via `dimensions.php` + MastersPage. Combinations on vouchers supported in schema; UI filter depth PARTIAL. Categories gap above.

**Status: PARTIAL**

---

## 10 Voucher System

List/detail/reverse LIVE. Quick Received/Paid/Transfer/Journal LIVE. `/vouchers/new` **FAIL usability** (same list). Opening balances via Ledgers.

**Status: PARTIAL**

---

## 11 Bills / Outstanding

Receivables/Payables pages with ageing; NEW/AGAINST/ON_ACCOUNT in posting; allocate API. Settlement discoverability from AR/AP and party — PASS medium.

**Status: PASS** (deep multi-bill UI combinations PARTIAL verify)

---

## 12 Approvals / Period Lock

Approvals queue LIVE (empty OK). Period locks in Settings; product browser saw controls. Lock-enforcement browser journey PARTIAL. Reopen PIN in API.

**Status: PARTIAL**

---

## 13 Dashboard Deep Audit

Control center with period pills, actions, KPIs, attention, charts, category overlap warning. Mobile screenshot strong. Scorecard: `10_DASHBOARD_AUDIT.md`.

**Status: PASS**

---

## 14 Page-by-Page Audit

Full table: `07_PAGE_MATRIX.md`. Failures: voucher-new, masters-categories. FUTURE: invite accept. Orphan: PlaceholderPage.

---

## 15 Function & Button Audit

`08_FUNCTION_MATRIX.md`. Primary actions work. Test fragility on Create party. Product NEW menu exists despite product-browser FAIL.

---

## 16 Navigation / Discoverability

Click depths mostly 1–2 from Dashboard. Defects: categories lie; voucher-new; branches sidebar missing. `12_VISIBILITY_DISCOVERABILITY.md`.

**Status: PARTIAL**

---

## 17 UI / UX

`09_UI_UX.md`. Honest empty states; purpose profit hints; dark premium-leaning. Two nav defects dominate.

**Status: PARTIAL**

---

## 18 Premium / Professional Design Review

Would a paying company trust the books engine? **Yes** (accounting proof).  
Does the whole product feel finished? **Not yet** — dead routes and test/product gaps.

Polish blockers: categories, voucher-new, export JSON toast, Users mega-page, cert company name suffixes in demos.

---

## 19 Responsive / Mobile

Mobile shell PASS in crawl. Full 320–1440 matrix NOT VERIFIED. `13_RESPONSIVE.md`.

**Status: PARTIAL**

---

## 20 Accessibility

Login labels PASS; keyboard/SR/contrast automation NOT VERIFIED. `14_ACCESSIBILITY.md`.

**Status: PARTIAL**

---

## 21 Reports

Core TB/P&L/BS/Day Book/Ageing/Party/Cash-Bank LIVE. Management reports FUTURE. Registry FE-only.

**Status: PASS core**

---

## 22 Data Visualization

Dashboard charts from APIs; empty states honest; no fake decorative charts observed.

**Status: PASS**

---

## 23 Export / Backup

Export fidelity PASS (PDF/DOCX/XLSX 1000-row). Backup restore PASS. Ops backup not in-browser (documented on Export page).

**Status: PASS**

---

## 24 Error / Loading / Empty States

Empty states strong. Hydrate loading coarse. 403 reason UX PARTIAL. Network/timeout/session UX NOT VERIFIED deeply.

**Status: PARTIAL**

---

## 25 Performance

Interactive latency PASS. Scale TB balanced at ~193k vouchers via backup. Formal 10-company 100k matrix NOT VERIFIED this stamp. `16_PERFORMANCE.md`.

**Status: PARTIAL**

---

## 26 Testing Architecture

Strong domain/HTTP/IDOR/gates. Weak page tests. Auth A–N brittle. Product browser one false FAIL. `17_TESTING.md`.

**Status: PARTIAL**

---

## 27 Logic / Combination Matrix

Golden scenarios A–J in vitest PASS. PHP property/loan/on-account PASS. High-risk 3-ways (bill+approval+lock, etc.): **NOT VERIFIED** exhaustive. Pairwise/property concurrency: NOT VERIFIED.

**Status: PARTIAL**

---

## 28 Security Test Matrix

| Probe | Result |
|-------|--------|
| IDOR cross-company | PASS |
| CSRF cookie path | PASS (with cert user) |
| CORS reflection | PASS |
| SQLi search | PASS |
| XSS storage | PASS (escape asserted) |
| Rate limit login | PARTIAL (not exhausted) |
| Soft membership reads | PARTIAL finding |

---

## 29 Full Business Journeys

| Journey | Status | Evidence |
|---------|--------|----------|
| Create company → dashboard | PASS | auth A |
| Add party | BLOCKED/FAIL automation | auth B selector; manual UI works |
| Loan / farmer / property | NOT VERIFIED UI this stamp | PHP+unit PASS |
| AR/AP / reports / users / approvals / settings / export | PARTIAL | product browser + crawl |
| Company switch | PASS | product SWITCH |
| Mobile data entry shell | PASS | screenshot |
| Restricted second user | NOT VERIFIED | |
| Reverse / lock enforce | PARTIAL | API PASS; UI surface only |

Screens: `screens/01-select-company.png`, `screens/02-dashboard-mobile.png`.

---

## 30 Product Persona Review

| Persona | Fit |
|---------|-----|
| Owner | Dashboard + quick actions strong |
| Accountant | Vouchers/reports/ledgers strong; voucher-new weak |
| Manager | Approvals thin |
| Data entry | Quick flows excellent |
| Viewer | Permission hide — PARTIAL verify |
| Auditor | Audit + reports — PASS surface |

---

## 31 Current Completion Percentages

| Metric | % |
|--------|--:|
| Implementation | 88 |
| Verification | 74 |
| Product UX | 78 |
| Production readiness | 15 |

Methodology: `21_FINAL_SCORECARD.md`.

---

## 32 Domain Scorecards

See `21_FINAL_SCORECARD.md` (Architecture 7 … Premium 7).

---

## 33 P0 / P1 / P2 / P3 Findings

### P0
None.

### P1
1. Categories master misroute  
2. Voucher-new dead-end  
3. Auth A–N suite broken selector  
4. Soft membership-only reads  
5. Export without view_* re-check  

### P2
Logout store clear; report registry dual SoT; unused RBAC keys/tables; a11y/viewport; approvals impact UX; export JSON success; 100k matrix re-run; product NEW_MENU locator.

### P3
Branches nav; role dashboards; skeletons; pixel CI.

---

## 34 Open Gaps

See `OPEN_GAPS.md`.

---

## 35 Recommended Remediation Phases

Phases A–J in `20_REMEDIATION_PLAN.md`. Priority start: **Phase B** (categories + voucher-new) then fix E2E selectors and re-run certify packs.

---

## 36 Product-Complete Acceptance Criteria

Re-issue only when:

- P1 list above closed  
- `company:test:browser:auth` A–N all PASS  
- `company:test:product:browser` all PASS  
- `company:gate:all` PASS  
- hydrate/latency/export fidelity PASS  
- Responsive + a11y minimum bar documented PASS  
- Independent auditor confirms 0 P1 usability  

---

## 37 Production-Ready Acceptance Criteria

Staging URL, HTTPS, security headers, backup schedule + restore SLA, monitoring/alerts, deploy/rollback runbooks, production config secrets management — **none verified**. Keep NOT ISSUED.

---

## 38 Final Auditor Conclusion

**WHAT EXISTS:** A coherent Company books product — posting engine, parties, bills, reports, exports, RBAC skeleton, dashboard control center.

**WHAT IS PROVEN THIS RUN:** Automated accounting, IDOR, CSRF (with valid user), backup restore at large scale, interactive latency, finance personal non-regression, live page crawl of primary routes.

**WHAT BLOCKS TRUST FOR “give it to a customer tomorrow”:**

1. Categories navigation is false (shows Business Units).  
2. New voucher URL does not create vouchers.  
3. Full authenticated A–N proof failed automation (does not mean party create is broken — UI button is “Create party”).  
4. Some APIs rely on membership only, not fine-grained view permissions.  
5. Production ops readiness absent.  
6. Formal 100k multi-company matrix not re-proven this stamp (large TB checksum helps but is not the same gate).

**Historical certifications (210013 / 221806) are superseded as claims** until remediation + re-proof under this package’s method lock.

**Next step:** Execute Phase B + E2E fixes from `20_REMEDIATION_PLAN.md`, then re-run `company:certify:product` and auth A–N into a new stamp.
